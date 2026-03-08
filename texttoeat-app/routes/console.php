<?php

use App\Enums\OrderStatus;
use App\Messenger\MessengerPayloads;
use App\Models\MenuItem;
use App\Models\MenuItemDailySnapshot;
use App\Models\MenuItemDailyStock;
use App\Models\OrderItem;
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

    $yesterdayItems = MenuItem::query()
        ->whereDate('menu_date', $yesterday)
        ->get();

    $todayByNameCategory = MenuItem::query()
        ->whereDate('menu_date', $today)
        ->get()
        ->keyBy(fn ($i) => $i->name . '|' . $i->category_id);

    $rolloverCount = 0;
    foreach ($yesterdayItems as $item) {
        $key = $item->name . '|' . $item->category_id;
        if ($todayByNameCategory->has($key)) {
            continue;
        }
        $newItem = MenuItem::create([
            'name' => $item->name,
            'price' => $item->price,
            'category_id' => $item->category_id,
            'image_url' => $item->image_url,
            'units_today' => 0,
            'is_sold_out' => true,
            'menu_date' => $today,
        ]);
        MenuItemDailyStock::create([
            'menu_item_id' => $newItem->id,
            'menu_date' => $today,
            'units_set' => 0,
            'units_sold' => 0,
            'units_leftover' => 0,
        ]);
        $rolloverCount++;
        $todayByNameCategory->put($key, (object) []);
    }

    // Snapshot today's stock before reset (Phase 1: safety net for analytics)
    $todayItems = MenuItem::query()
        ->whereDate('menu_date', $today)
        ->get(['id', 'units_today']);
    $soldByItem = OrderItem::query()
        ->whereIn('menu_item_id', $todayItems->pluck('id'))
        ->whereHas('order', fn ($q) => $q->where('status', OrderStatus::Completed)->whereDate('updated_at', $today))
        ->selectRaw('menu_item_id, COALESCE(SUM(quantity), 0) as qty')
        ->groupBy('menu_item_id')
        ->pluck('qty', 'menu_item_id')
        ->all();
    foreach ($todayItems as $item) {
        $leftover = (int) $item->units_today;
        $sold = (int) ($soldByItem[$item->id] ?? 0);
        $set = $leftover + $sold;
        MenuItemDailySnapshot::upsert(
            [
                'menu_item_id' => $item->id,
                'menu_date' => $today->toDateString(),
                'units_set' => $set,
                'units_sold' => $sold,
                'units_leftover' => $leftover,
                'updated_at' => now(),
                'created_at' => now(),
            ],
            ['menu_item_id', 'menu_date'],
            ['units_set', 'units_sold', 'units_leftover', 'updated_at']
        );
    }

    foreach ($todayItems as $item) {
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
    }

    $resetCount = MenuItem::query()
        ->whereDate('menu_date', $today)
        ->update([
            'is_sold_out' => true,
            'units_today' => 0,
        ]);

    Cache::put('menu_reset_date', $today->toDateString(), now()->endOfDay());

    $this->info("Rollover: {$rolloverCount} item(s) copied from yesterday. Reset: {$resetCount} item(s) disabled with zero stock. Greeting modal will show for portal users.");
})->purpose('Rollover yesterday to today, reset today items to disabled with zero stock, flag greeting modal');

Schedule::call(function (): void {
    if (! (bool) Setting::get('menu.auto_reset_enabled', false)) {
        return;
    }
    $atHour = (int) Setting::get('menu.auto_reset_at_hour', Setting::get('menu.reset_morning_until_hour', 4));
    if (now()->hour === $atHour) {
        Artisan::call('menu:reset-today');
    }
})->hourly();
