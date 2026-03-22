<?php

namespace App\Support;

use App\Models\Setting;
use Carbon\Carbon;

/**
 * Server-time hour window for manual / scheduled menu:reset-today (without --force).
 */
final class MenuManualResetWindow
{
    /**
     * @return array{0: int, 1: int} [from_hour, until_hour], each 0–23
     */
    public static function bounds(): array
    {
        $from = (int) Setting::get('menu.reset_morning_from_hour', config('menu.reset_morning_from_hour', 0));
        $until = (int) Setting::get('menu.reset_morning_until_hour', config('menu.reset_morning_until_hour', 11));

        return [max(0, min(23, $from)), max(0, min(23, $until))];
    }

    /**
     * Inclusive hour range on the same calendar day, or overnight when from > until.
     */
    public static function hourIsWithinWindow(int $hour, int $from, int $until): bool
    {
        $from = max(0, min(23, $from));
        $until = max(0, min(23, $until));

        if ($from <= $until) {
            return $hour >= $from && $hour <= $until;
        }

        return $hour >= $from || $hour <= $until;
    }

    public static function isNowWithinWindow(?Carbon $at = null): bool
    {
        $at ??= now();
        [$from, $until] = self::bounds();

        return self::hourIsWithinWindow($at->hour, $from, $until);
    }

    /** Short phrase for messages, e.g. "0–11" or "22–6 (overnight)". */
    public static function describeBounds(int $from, int $until): string
    {
        if ($from <= $until) {
            return $from.'–'.$until;
        }

        return $from.'–'.$until.' (overnight)';
    }
}
