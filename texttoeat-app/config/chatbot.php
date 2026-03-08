<?php

return [
    'session_timeout_seconds' => (int) env('CHATBOT_SESSION_TIMEOUT_SECONDS', 60),
    'takeover_timeout_minutes' => (int) env('CHATBOT_TAKEOVER_TIMEOUT_MINUTES', 60),
    'channel_mode' => env('CHANNEL_MODE', 'sim'), // 'sim' | 'prod'

    'reply_cache_ttl_seconds' => (int) env('CHATBOT_REPLY_CACHE_TTL_SECONDS', 21600), // 6 hours

    /**
     * Choice states where SMS/web show numbered options. Used for:
     * - SMS receive: map "1","2",... to canonical body before calling FSM.
     * - SMS send: format reply as prompt + "1. Label1\n2. Label2" from these options.
     * Canonical values are what the FSM accepts (exact answers); labels are for display.
     */
    'choice_state_options' => [
        'main_menu' => [
            'prompt_key' => 'main_menu_prompt',
            'options' => [
                ['canonical' => 'order', 'label_key' => 'main_menu_option_order'],
                ['canonical' => 'track', 'label_key' => 'main_menu_option_track'],
                ['canonical' => 'language', 'label_key' => 'main_menu_option_language'],
                ['canonical' => 'human_takeover', 'label_key' => 'main_menu_option_support'],
            ],
        ],
        'language_selection' => [
            'prompt_key' => 'language_prompt',
            'options' => [
                ['canonical' => 'en', 'label_key' => 'language_option_en'],
                ['canonical' => 'tl', 'label_key' => 'language_option_tl'],
                ['canonical' => 'ilo', 'label_key' => 'language_option_ilo'],
            ],
        ],
        'track_choice' => [
            'prompt_key' => 'track_choice_prompt',
            'options' => [
                ['canonical' => 'track_list', 'label_key' => 'track_choice_list'],
                ['canonical' => 'track_ref', 'label_key' => 'track_choice_ref'],
            ],
        ],
        'confirm' => [
            'prompt_key' => 'confirm_prompt',
            'options' => [
                ['canonical' => 'yes', 'label_key' => 'confirm_option_yes'],
                ['canonical' => 'no', 'label_key' => 'confirm_option_no'],
            ],
        ],
        'delivery_choice' => [
            'prompt_key' => 'delivery_choice_header',
            'options' => [
                ['canonical' => '1', 'label_key' => 'delivery_summary_pickup'],
                ['canonical' => '2', 'label_key' => 'delivery_type_delivery'],
            ],
        ],
        'cart_menu' => [
            'prompt_key' => null,
            'options' => [
                ['canonical' => 'add', 'label_key' => 'cart_option_add'],
                ['canonical' => 'view_cart', 'label_key' => 'cart_option_view_cart'],
                ['canonical' => 'edit', 'label_key' => 'cart_option_edit'],
                ['canonical' => 'confirm', 'label_key' => 'cart_option_confirm'],
            ],
        ],
        'edit_action' => [
            'prompt_key' => 'cart_edit_action_intro',
            'options' => [
                ['canonical' => 'change_quantity', 'label_key' => 'edit_option_change_qty'],
                ['canonical' => 'remove', 'label_key' => 'edit_option_remove'],
                ['canonical' => 'back', 'label_key' => 'edit_option_back'],
            ],
        ],
    ],

    'reply_overridable_keys' => [
        'greeting' => ['label' => 'Greeting', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'welcome' => ['label' => 'Welcome', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'language_prompt' => ['label' => 'Language prompt', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'invalid_language' => ['label' => 'Invalid language', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'language_option_en' => ['label' => 'Language: English', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'language_option_tl' => ['label' => 'Language: Tagalog', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'language_option_ilo' => ['label' => 'Language: Ilocano', 'required_placeholders' => [], 'group' => 'Welcome & language'],
        'main_menu_prompt' => ['label' => 'Main menu prompt', 'required_placeholders' => [], 'group' => 'Main menu'],
        'main_menu_invalid' => ['label' => 'Main menu invalid', 'required_placeholders' => [], 'group' => 'Main menu'],
        'main_menu_option_order' => ['label' => 'Main menu: Place order', 'required_placeholders' => [], 'group' => 'Main menu'],
        'main_menu_option_track' => ['label' => 'Main menu: Track order', 'required_placeholders' => [], 'group' => 'Main menu'],
        'main_menu_option_language' => ['label' => 'Main menu: Change language', 'required_placeholders' => [], 'group' => 'Main menu'],
        'main_menu_option_support' => ['label' => 'Main menu: Talk to staff', 'required_placeholders' => [], 'group' => 'Main menu'],
        'track_choice_prompt' => ['label' => 'Track choice prompt', 'required_placeholders' => [], 'group' => 'Track'],
        'track_list_header' => ['label' => 'Track list header', 'required_placeholders' => [], 'group' => 'Track'],
        'track_list_empty' => ['label' => 'Track list empty', 'required_placeholders' => [], 'group' => 'Track'],
        'track_list_reply' => ['label' => 'Track list reply', 'required_placeholders' => [], 'group' => 'Track'],
        'track_enter_ref' => ['label' => 'Track enter reference', 'required_placeholders' => [], 'group' => 'Track'],
        'track_choice_list' => ['label' => 'Track: List recent orders', 'required_placeholders' => [], 'group' => 'Track'],
        'track_choice_ref' => ['label' => 'Track: Enter reference number', 'required_placeholders' => [], 'group' => 'Track'],
        'menu_header' => ['label' => 'Menu header', 'required_placeholders' => [], 'group' => 'Menu and ordering'],
        'menu_footer' => ['label' => 'Menu footer', 'required_placeholders' => [], 'group' => 'Menu and ordering'],
        'no_menu_today' => ['label' => 'No menu today', 'required_placeholders' => [], 'group' => 'Menu and ordering'],
        'delivery_choice_header' => ['label' => 'Delivery choice header', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'delivery_type_delivery' => ['label' => 'Delivery type: Delivery', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'delivery_summary_pickup' => ['label' => 'Delivery: Pickup', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'delivery_summary_paid' => ['label' => 'Delivery: Other (paid on delivery)', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'delivery_area_choice_header' => ['label' => 'Delivery area choice header', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'delivery_choice_invalid' => ['label' => 'Delivery choice invalid', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'delivery_area_choice_invalid' => ['label' => 'Delivery area choice invalid', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'collect_name_prompt' => ['label' => 'Collect name prompt', 'required_placeholders' => [], 'group' => 'Delivery and name'],
        'collect_name_prompt_with_saved' => ['label' => 'Collect name (with saved)', 'required_placeholders' => [':name'], 'group' => 'Delivery and name'],
        'collect_name_use_saved_option' => ['label' => 'Collect name: Use saved name option', 'required_placeholders' => [':name'], 'group' => 'Delivery and name'],
        'confirm_prompt' => ['label' => 'Confirm prompt', 'required_placeholders' => [':summary'], 'group' => 'Confirm'],
        'confirm_option_yes' => ['label' => 'Confirm: Yes, place order', 'required_placeholders' => [], 'group' => 'Confirm'],
        'confirm_option_no' => ['label' => 'Confirm: No / Cancel', 'required_placeholders' => [], 'group' => 'Confirm'],
        'confirm_invalid' => ['label' => 'Confirm invalid', 'required_placeholders' => [], 'group' => 'Confirm'],
        'confirm_slots_full_warning' => ['label' => 'Confirm slots full warning', 'required_placeholders' => [], 'group' => 'Confirm'],
        'order_placed' => ['label' => 'Order placed', 'required_placeholders' => [], 'group' => 'Order placed'],
        'order_placed_reference' => ['label' => 'Order placed (with reference)', 'required_placeholders' => [':reference'], 'group' => 'Order placed'],
        'cart_menu_prompt' => ['label' => 'Cart menu prompt', 'required_placeholders' => [':summary'], 'group' => 'Cart'],
        'cart_header' => ['label' => 'Cart header', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_empty' => ['label' => 'Cart empty', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_option_add' => ['label' => 'Cart: Add another item', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_option_view_cart' => ['label' => 'Cart: View cart', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_option_edit' => ['label' => 'Cart: Change/remove item', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_option_confirm' => ['label' => 'Cart: Confirm order', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_footer_suffix' => ['label' => 'Cart footer suffix', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_edit_action_intro' => ['label' => 'Cart edit action intro', 'required_placeholders' => [':name', ':quantity'], 'group' => 'Cart'],
        'edit_option_change_qty' => ['label' => 'Edit: Change quantity', 'required_placeholders' => [], 'group' => 'Cart'],
        'edit_option_remove' => ['label' => 'Edit: Remove item', 'required_placeholders' => [], 'group' => 'Cart'],
        'edit_option_back' => ['label' => 'Edit: Back', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_invalid_prefix' => ['label' => 'Cart invalid prefix', 'required_placeholders' => [], 'group' => 'Cart'],
        'cart_edit_select_prompt' => ['label' => 'Cart edit select prompt', 'required_placeholders' => [':summary'], 'group' => 'Cart'],
        'cart_edit_select_prompt_messenger' => ['label' => 'Cart edit select prompt (Messenger)', 'required_placeholders' => [':summary'], 'group' => 'Cart'],
        'cart_edit_quantity_prompt' => ['label' => 'Cart edit quantity prompt', 'required_placeholders' => [':name', ':quantity'], 'group' => 'Cart'],
        'cart_edit_invalid_index' => ['label' => 'Cart edit invalid index', 'required_placeholders' => [], 'group' => 'Cart'],
        'done_empty' => ['label' => 'Done empty', 'required_placeholders' => [], 'group' => 'Cart'],
        'human_takeover_reply' => ['label' => 'Human takeover reply', 'required_placeholders' => [], 'group' => 'Human takeover'],
        'exit_session_ack' => ['label' => 'Exit session ack', 'required_placeholders' => [], 'group' => 'Human takeover'],
        'takeover_ended_by_staff' => ['label' => 'Takeover ended by staff', 'required_placeholders' => [], 'group' => 'Human takeover'],
        'help_text' => ['label' => 'Help text', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'back_main_menu_options' => ['label' => 'Back/main menu options', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'cancel_ok' => ['label' => 'Cancel OK', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'invalid_option_menu' => ['label' => 'Invalid option (menu)', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'status_none' => ['label' => 'Status none', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'status_not_found' => ['label' => 'Status not found', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'inventory_failure' => ['label' => 'Inventory failure', 'required_placeholders' => [], 'group' => 'Help & errors'],
        'use_real_phone_or_messenger' => ['label' => 'Use real phone or Messenger', 'required_placeholders' => [], 'group' => 'Help & errors'],
    ],

    /**
     * Nested hierarchy for Reply Templates UI (mirrors FSM flow / branches).
     * Each node: id, label, groups (group labels whose keys belong here), optional children.
     */
    'reply_template_tree' => [
        ['id' => 'start', 'label' => 'Start', 'groups' => ['Welcome & language']],
        ['id' => 'main_menu', 'label' => 'Main menu', 'groups' => ['Main menu'], 'children' => [
            ['id' => 'order_flow', 'label' => 'Order flow', 'groups' => [], 'children' => [
                ['id' => 'menu_ordering', 'label' => 'Menu and ordering', 'groups' => ['Menu and ordering']],
                ['id' => 'cart', 'label' => 'Cart', 'groups' => ['Cart']],
                ['id' => 'delivery_name', 'label' => 'Delivery and name', 'groups' => ['Delivery and name']],
                ['id' => 'confirm', 'label' => 'Confirm', 'groups' => ['Confirm']],
                ['id' => 'order_placed', 'label' => 'Order placed', 'groups' => ['Order placed']],
            ]],
            ['id' => 'track', 'label' => 'Track', 'groups' => ['Track']],
            ['id' => 'human_takeover', 'label' => 'Human takeover', 'groups' => ['Human takeover']],
        ]],
        ['id' => 'help_errors', 'label' => 'Help and errors', 'groups' => ['Help & errors']],
    ],
];
