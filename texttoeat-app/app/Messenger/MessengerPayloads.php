<?php

namespace App\Messenger;

/**
 * Messenger postback/quick_reply payload constants and mapping to FSM body.
 * Convention: CATEGORY_ACTION_ID (e.g. LANG_EN, MAIN_ORDER, CONFIRM_YES).
 * Used so that button/quick_reply payloads are normalized to the strings
 * the shared ChatbotFsm expects (e.g. "1", "yes", "done") before calling the webhook.
 */
final class MessengerPayloads
{
    public const LANG_EN = 'LANG_EN';
    public const LANG_TL = 'LANG_TL';
    public const LANG_ILO = 'LANG_ILO';

    public const MAIN_HOME = 'MAIN_HOME';
    public const MAIN_ORDER = 'MAIN_ORDER';
    public const MAIN_TRACK = 'MAIN_TRACK';
    public const MAIN_LANGUAGE = 'MAIN_LANGUAGE';
    public const MAIN_SUPPORT = 'MAIN_SUPPORT';

    public const CART_VIEW = 'CART_VIEW';
    public const CART_DONE = 'CART_DONE';
    public const CART_EDIT = 'CART_EDIT';

    public const DELIVERY_PICKUP = 'DELIVERY_PICKUP';
    public const DELIVERY_DELIVERY = 'DELIVERY_DELIVERY';

    public const CONFIRM_YES = 'CONFIRM_YES';
    public const CONFIRM_NO = 'CONFIRM_NO';

    public const TRACK_LIST = 'TRACK_LIST';
    public const TRACK_REF = 'TRACK_REF';

    /** @var array<string, string> payload => FSM body */
    private const TO_FSM_BODY = [
        self::LANG_EN => '1',
        self::LANG_TL => '2',
        self::LANG_ILO => '3',
        self::MAIN_HOME => 'main',
        self::MAIN_ORDER => '1',
        self::MAIN_TRACK => '2',
        self::MAIN_LANGUAGE => '3',
        self::MAIN_SUPPORT => '4',
        self::CART_VIEW => '2',
        self::CART_DONE => 'done',
        self::CART_EDIT => '3',
        self::DELIVERY_PICKUP => '1',
        self::DELIVERY_DELIVERY => '2',
        self::CONFIRM_YES => 'yes',
        self::CONFIRM_NO => 'no',
        self::TRACK_LIST => '1',
        self::TRACK_REF => '2',
    ];

    /**
     * Map Messenger payload to the body string the ChatbotFsm expects.
     * Handles MENU_ITEM_<n> (1-based index) and DELIVERY_AREA_<n>.
     */
    public static function toFsmBody(string $payload): string
    {
        $payload = trim($payload);
        if ($payload === '') {
            return '';
        }

        if (isset(self::TO_FSM_BODY[$payload])) {
            return self::TO_FSM_BODY[$payload];
        }

        if (str_starts_with($payload, 'MENU_ITEM_')) {
            $index = substr($payload, 10);
            return is_numeric($index) ? $index : $payload;
        }

        if (str_starts_with($payload, 'DELIVERY_AREA_')) {
            $index = substr($payload, 13);
            return is_numeric($index) ? $index : $payload;
        }

        if (str_starts_with($payload, 'TRACK_REF_')) {
            return trim(substr($payload, 10)) ?: $payload;
        }

        return $payload;
    }
}
