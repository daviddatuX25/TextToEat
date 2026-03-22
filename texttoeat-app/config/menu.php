<?php

return [
    /** Inclusive start hour (0–23) for manual menu rollover without override. */
    'reset_morning_from_hour' => (int) env('MENU_RESET_MORNING_FROM_HOUR', 0),
    /** Inclusive end hour (0–23). If from > until, window crosses midnight. */
    'reset_morning_until_hour' => (int) env('MENU_RESET_MORNING_UNTIL_HOUR', 11),

    'categories' => [
        'Ulam',
        'Merienda',
        'Noodles',
        'Silog',
        'Dessert',
        'Soup',
        'Beverages',
    ],
];
