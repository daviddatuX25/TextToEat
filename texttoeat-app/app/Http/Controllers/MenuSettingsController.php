<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class MenuSettingsController extends Controller
{
    /**
     * Show the Menu settings page: Menu & daily reset and Levels reminder only.
     */
    public function index(): Response
    {
        $menuResetHour = Setting::get('menu.reset_morning_until_hour', (int) config('menu.reset_morning_until_hour', 11));
        $lastResetDate = Cache::get('menu_reset_date');

        $levelsReminder = [
            'low_stock_threshold' => (int) Setting::get('menu.low_stock_threshold', 5),
            'low_stock_badge_style' => Setting::get('menu.low_stock_badge_style', 'count'),
        ];

        return Inertia::render('MenuSettings', [
            'menu' => [
                'reset_morning_until_hour' => $menuResetHour,
                'last_reset_date' => $lastResetDate,
            ],
            'levels_reminder' => $levelsReminder,
        ]);
    }

    /**
     * Update menu-related settings (levels reminder only; reset hour is config/code).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'menu' => ['sometimes', 'array'],
            'menu.low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'menu.low_stock_badge_style' => ['sometimes', 'string', 'in:count,one'],
        ]);

        $userId = $request->user()?->id;
        $menu = $validated['menu'] ?? [];
        if (array_key_exists('low_stock_threshold', $menu)) {
            Setting::set('menu.low_stock_threshold', $menu['low_stock_threshold'], $userId);
        }
        if (array_key_exists('low_stock_badge_style', $menu)) {
            Setting::set('menu.low_stock_badge_style', $menu['low_stock_badge_style'], $userId);
        }

        return redirect()->route('portal.menu-settings')->with('success', 'Settings updated.');
    }
}
