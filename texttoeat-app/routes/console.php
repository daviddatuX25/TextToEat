<?php

use App\Models\OutboundSms;
use App\Models\ChatbotSession;
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
