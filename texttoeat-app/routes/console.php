<?php

use App\Messenger\MessengerPayloads;
use App\Models\MenuItem;
use App\Models\OutboundSms;
use App\Models\ChatbotSession;
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
    $minutes = (int) config('firebase.pending_timeout_minutes', 10);
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
    $minutes = (int) config('chatbot.takeover_timeout_minutes', 60);
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

    $morningUntilHour = (int) config('menu.reset_morning_until_hour', 11);
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
        ->keyBy(fn ($i) => $i->name . '|' . $i->category);

    $rolloverCount = 0;
    foreach ($yesterdayItems as $item) {
        $key = $item->name . '|' . $item->category;
        if ($todayByNameCategory->has($key)) {
            continue;
        }
        MenuItem::create([
            'name' => $item->name,
            'price' => $item->price,
            'category' => $item->category,
            'image_url' => $item->image_url,
            'units_today' => 0,
            'is_sold_out' => true,
            'menu_date' => $today,
        ]);
        $rolloverCount++;
        $todayByNameCategory->put($key, (object) []);
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
