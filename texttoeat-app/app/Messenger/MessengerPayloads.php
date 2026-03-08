<?php

namespace App\Messenger;

/**
 * Messenger postback/quick_reply payload constants and mapping to FSM body.
 * Convention: CATEGORY_ACTION_ID (e.g. LANG_EN, MAIN_ORDER, CONFIRM_YES).
 * Used so that button/quick_reply payloads are normalized to the canonical strings
 * the shared ChatbotFsm expects. Use canonicals (e.g. "add", "view_cart", "edit", "pickup", "yes")
 * not numbers — the layer only normalizes numbers for SMS/Web; Messenger sends these directly.
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

    public const CART_ADD = 'CART_ADD';
    public const CART_VIEW = 'CART_VIEW';
    public const CART_DONE = 'CART_DONE';
    public const CART_EDIT = 'CART_EDIT';

    public const EDIT_CHANGE_QTY = 'EDIT_CHANGE_QTY';
    public const EDIT_REMOVE = 'EDIT_REMOVE';
    public const EDIT_BACK = 'EDIT_BACK';

    public const DELIVERY_PICKUP = 'DELIVERY_PICKUP';
    public const DELIVERY_DELIVERY = 'DELIVERY_DELIVERY';

    public const CONFIRM_YES = 'CONFIRM_YES';
    public const CONFIRM_NO = 'CONFIRM_NO';

    public const TRACK_LIST = 'TRACK_LIST';
    public const TRACK_REF = 'TRACK_REF';

    /** @var array<string, string> payload => FSM body (canonical; numbers only for MENU_ITEM_n, DELIVERY_AREA_n) */
    private const TO_FSM_BODY = [
        self::LANG_EN => 'en',
        self::LANG_TL => 'tl',
        self::LANG_ILO => 'ilo',
        self::MAIN_HOME => 'main',
        self::MAIN_ORDER => 'order',
        self::MAIN_TRACK => 'track',
        self::MAIN_LANGUAGE => 'language',
        self::MAIN_SUPPORT => 'human_takeover',
        self::CART_ADD => 'add',
        self::CART_VIEW => 'view_cart',
        self::CART_DONE => 'done',
        self::CART_EDIT => 'edit',
        self::EDIT_CHANGE_QTY => 'change_quantity',
        self::EDIT_REMOVE => 'remove',
        self::EDIT_BACK => 'back',
        self::DELIVERY_PICKUP => 'pickup',
        self::DELIVERY_DELIVERY => 'delivery',
        self::CONFIRM_YES => 'yes',
        self::CONFIRM_NO => 'no',
        self::TRACK_LIST => 'track_list',
        self::TRACK_REF => 'track_ref',
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
