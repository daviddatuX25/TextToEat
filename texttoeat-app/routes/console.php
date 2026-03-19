<?php

use App\Enums\OrderStatus;
use App\Messenger\MessengerPayloads;
use App\Models\MenuItem;
use App\Models\MenuItemDailySnapshot;
use App\Models\MenuItemDailyStock;
use App\Models\OrderItem;
use App\Models\InboundMessage;
use App\Models\OutboundMessenger;
use App\Models\OutboundSms;
use App\Models\ChatbotSession;
use App\Models\Setting;
use App\Messenger\FacebookMessengerClient;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sms:mark-old-pending-failed', function () {
    $minutes = (int) Setting::get('firebase.pending_timeout_minutes', config('firebase.pending_timeout_minutes', 10));
    $count = OutboundSms::pending()
        ->where('created_at', '<', now()->subMinutes($minutes))
        ->update([
            'status' => 'failed',
            'failure_reason' => 'timeout (no mark-sent from app)',
        ]);
    $this->info("Marked {$count} old pending outbound_sms as failed.");
})->purpose('Mark outbound_sms rows older than N minutes as failed when still pending');

Schedule::command('sms:mark-old-pending-failed')->everyTenMinutes();

Artisan::command('chatbot:expire-takeover-sessions', function () {
    $minutes = (int) Setting::get('chatbot.takeover_timeout_minutes', config('chatbot.takeover_timeout_minutes', 60));
    if ($minutes <= 0) {
        $this->info('Takeover timeout minutes is <= 0; skipping.');

        return;
    }

    $threshold = now()->subMinutes($minutes);
    $count = 0;

    ChatbotSession::query()
        ->where('state->current_state', 'human_takeover')
        ->where(function ($q) use ($threshold): void {
            $q->whereNotNull('last_activity_at')->where('last_activity_at', '<', $threshold)
                ->orWhere(function ($q) use ($threshold): void {
                    $q->whereNull('last_activity_at')->where('created_at', '<', $threshold);
                });
        })
        ->orderBy('id')
        ->chunkById(200, function ($sessions) use (&$count): void {
            foreach ($sessions as $s) {
                $state = $s->state ?? [];
                $state['current_state'] = 'main_menu';
                $state['automation_disabled'] = false;
                $s->state = $state;
                $s->last_activity_at = now();
                $s->save();
                $count++;
            }
        });

    $this->info("Expired {$count} takeover session(s).");
})->purpose('Expire human_takeover sessions after inactivity and restore bot mode');

Schedule::command('chatbot:expire-takeover-sessions')->everyTenMinutes();

Artisan::command('messenger:set-persistent-menu', function () {
    $token = (string) config('facebook.page_access_token', '');
    if ($token === '') {
        $this->warn('FACEBOOK_PAGE_ACCESS_TOKEN is not set. Skipping.');

        return;
    }

    $client = app(FacebookMessengerClient::class);
    $menu = [
        ['title' => 'Home', 'payload' => MessengerPayloads::MAIN_HOME],
        ['title' => 'Track order', 'payload' => MessengerPayloads::MAIN_TRACK],
        ['title' => 'Talk to staff', 'payload' => MessengerPayloads::MAIN_SUPPORT],
    ];
    $client->setPersistentMenu($menu);
    $this->info('Persistent menu set successfully.');
})->purpose('Set the Messenger persistent menu (Home, Track order, Talk to staff)');

Artisan::command('menu:reset-today {--force : Run even outside morning window}', function () {
    $today = Carbon::today();
    $yesterday = Carbon::yesterday();

    $morningUntilHour = (int) Setting::get('menu.reset_morning_until_hour', config('menu.reset_morning_until_hour', 11));
    if (! $this->option('force') && $morningUntilHour >= 0 && now()->hour > $morningUntilHour) {
        $this->warn('Skipping: current hour (' . now()->hour . ') is after morning window (0-' . $morningUntilHour . '). Use --force to override.');

        return;
    }

    // Snapshot yesterday's stock into MenuItemDailySnapshot for analytics.
    $yesterdayStock = MenuItemDailyStock::query()
        ->whereDate('menu_date', $yesterday)
        ->get();

    $snapshotCount = 0;
    foreach ($yesterdayStock as $stock) {
        MenuItemDailySnapshot::upsert(
            [
                'menu_item_id' => $stock->menu_item_id,
                'menu_date' => $yesterday->toDateString(),
                'units_set' => (int) $stock->units_set,
                'units_sold' => (int) $stock->units_sold,
                'units_leftover' => (int) $stock->units_leftover,
                'updated_at' => now(),
                'created_at' => now(),
            ],
            ['menu_item_id', 'menu_date'],
            ['units_set', 'units_sold', 'units_leftover', 'updated_at']
        );
        $snapshotCount++;
    }

    // Initialize or reset today's per-item stock to zero for today's menu items.
    $resetStockCount = 0;
    MenuItem::query()
        ->whereDate('menu_date', $today)
        ->orderBy('id')
        ->chunkById(200, function ($items) use ($today, &$resetStockCount): void {
            foreach ($items as $item) {
                MenuItemDailyStock::updateOrCreate(
                    [
                        'menu_item_id' => $item->id,
                        'menu_date' => $today,
                    ],
                    [
                        'units_set' => 0,
                        'units_sold' => 0,
                        'units_leftover' => 0,
                    ]
                );
                $resetStockCount++;
            }
        });

    // Legacy compatibility: mark all items as sold out with zero units_today so
    // existing flows that still read these fields remain safe. Core behavior
    // uses MenuItemDailyStock/virtual availability instead.
    $resetLegacyCount = MenuItem::query()
        ->whereDate('menu_date', $today)
        ->update([
        'is_sold_out' => true,
        'units_today' => 0,
    ]);

    Cache::put('menu_reset_date', $today->toDateString(), now()->endOfDay());

    $this->info("Snapshot: {$snapshotCount} stock row(s) for {$yesterday->toDateString()}. Reset: {$resetStockCount} per-day stock row(s) initialized for {$today->toDateString()}; {$resetLegacyCount} catalog item(s) marked sold out with zero legacy units_today.");
})->purpose('Snapshot yesterday stock and reset today per-item stock to zero using MenuItemDailyStock, flag greeting modal');

Schedule::call(function (): void {
    if (! (bool) Setting::get('menu.auto_reset_enabled', false)) {
        return;
    }
    $atHour = (int) Setting::get('menu.auto_reset_at_hour', Setting::get('menu.reset_morning_until_hour', 4));
    if (now()->hour === $atHour) {
        Artisan::call('menu:reset-today');
    }
})->hourly();

Artisan::command('chatbot:prune-logs', function () {
    $days = 30;
    $cutoff = now()->subDays($days);

    $inboundDeleted = InboundMessage::query()
        ->where('created_at', '<', $cutoff)
        ->delete();

    $outboundSmsDeleted = OutboundSms::query()
        ->where('created_at', '<', $cutoff)
        ->delete();

    $outboundMessengerDeleted = OutboundMessenger::query()
        ->where('created_at', '<', $cutoff)
        ->delete();

    $this->info(sprintf(
        'Pruned chatbot logs older than %d days: %d inbound, %d outbound_sms, %d outbound_messenger.',
        $days,
        $inboundDeleted,
        $outboundSmsDeleted,
        $outboundMessengerDeleted,
    ));
})->purpose('Prune detailed chatbot message logs older than 30 days');

Schedule::command('chatbot:prune-logs')->daily();
