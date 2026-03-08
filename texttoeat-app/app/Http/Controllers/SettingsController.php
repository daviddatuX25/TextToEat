<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Show the Settings page (admin): config display, channel toggles, font size, quick links.
     */
    public function index(): Response
    {
        $menuResetHour = Setting::get('menu.reset_morning_until_hour', (int) config('menu.reset_morning_until_hour', 11));
        $lastResetDate = Cache::get('menu_reset_date');

        $timeouts = [
            'takeover_timeout_minutes' => (int) Setting::get('chatbot.takeover_timeout_minutes', config('chatbot.takeover_timeout_minutes', 60)),
            'session_timeout_seconds' => (int) Setting::get('chatbot.session_timeout_seconds', config('chatbot.session_timeout_seconds', 60)),
            'pending_timeout_minutes' => (int) Setting::get('firebase.pending_timeout_minutes', config('firebase.pending_timeout_minutes', 10)),
            'heartbeat_interval_minutes' => (int) Setting::get('firebase.heartbeat_interval_minutes', config('firebase.heartbeat_interval_minutes', 15)),
        ];

        $channelMode = config('chatbot.channel_mode', 'sim');

        $channels = [
            'sms_enabled' => Setting::get('channels.sms_enabled', true),
            'messenger_enabled' => Setting::get('channels.messenger_enabled', true),
            'web_enabled' => Setting::get('channels.web_enabled', true),
        ];

        $quickLinks = [
            ['href' => '/portal/chatbot-replies', 'label' => 'Reply templates'],
            ['href' => '/portal/sms-devices', 'label' => 'SMS devices'],
            ['href' => '/portal/facebook-messenger', 'label' => 'Facebook Messenger'],
            ['href' => '/portal/users', 'label' => 'Manage users'],
        ];

        $levelsReminder = [
            'low_stock_threshold' => (int) Setting::get('menu.low_stock_threshold', 5),
            'low_stock_badge_style' => Setting::get('menu.low_stock_badge_style', 'count'),
        ];

        return Inertia::render('Settings', [
            'menu' => [
                'reset_morning_until_hour' => $menuResetHour,
                'last_reset_date' => $lastResetDate,
            ],
            'levels_reminder' => $levelsReminder,
            'timeouts' => $timeouts,
            'channel_mode' => $channelMode,
            'channels' => $channels,
            'quick_links' => $quickLinks,
        ]);
    }

    /**
     * Update channel toggles (and other editable settings).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'channels.sms_enabled' => ['sometimes', 'boolean'],
            'channels.messenger_enabled' => ['sometimes', 'boolean'],
            'channels.web_enabled' => ['sometimes', 'boolean'],
            'chatbot.takeover_timeout_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'chatbot.session_timeout_seconds' => ['sometimes', 'integer', 'min:1', 'max:86400'],
            'firebase.pending_timeout_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'firebase.heartbeat_interval_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'menu.low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'menu.low_stock_badge_style' => ['sometimes', 'string', 'in:count,one'],
        ]);

        // Flatten nested keys so Setting::set receives dotted keys (channels.*, chatbot.*, firebase.*).
        if (isset($validated['channels']) && is_array($validated['channels'])) {
            $channels = $validated['channels'];
            unset($validated['channels']);
            if (array_key_exists('sms_enabled', $channels)) {
                $validated['channels.sms_enabled'] = $channels['sms_enabled'];
            }
            if (array_key_exists('messenger_enabled', $channels)) {
                $validated['channels.messenger_enabled'] = $channels['messenger_enabled'];
            }
            if (array_key_exists('web_enabled', $channels)) {
                $validated['channels.web_enabled'] = $channels['web_enabled'];
            }
        }
        if (isset($validated['chatbot']) && is_array($validated['chatbot'])) {
            $chatbot = $validated['chatbot'];
            unset($validated['chatbot']);
            if (array_key_exists('takeover_timeout_minutes', $chatbot)) {
                $validated['chatbot.takeover_timeout_minutes'] = $chatbot['takeover_timeout_minutes'];
            }
            if (array_key_exists('session_timeout_seconds', $chatbot)) {
                $validated['chatbot.session_timeout_seconds'] = $chatbot['session_timeout_seconds'];
            }
        }
        if (isset($validated['firebase']) && is_array($validated['firebase'])) {
            $firebase = $validated['firebase'];
            unset($validated['firebase']);
            if (array_key_exists('pending_timeout_minutes', $firebase)) {
                $validated['firebase.pending_timeout_minutes'] = $firebase['pending_timeout_minutes'];
            }
            if (array_key_exists('heartbeat_interval_minutes', $firebase)) {
                $validated['firebase.heartbeat_interval_minutes'] = $firebase['heartbeat_interval_minutes'];
            }
        }
        $userId = $request->user()?->id;
        try {
            foreach ($validated as $key => $value) {
                Setting::set($key, $value, $userId);
            }
        } catch (\Throwable $e) {
            return redirect()->route('portal.settings')->with('error', 'Failed to save settings. Please try again.');
        }

        return redirect()->route('portal.settings')->with('success', 'Settings updated.');
    }
}
