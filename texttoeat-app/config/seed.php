<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Production seed counts
    |--------------------------------------------------------------------------
    |
    | Used by PortalSeedDataSeeder when seeding pickup slots and dining
    | markers. Demo runs the same production base, then adds analytics data.
    |
    */

    'pickup_slots' => (int) env('SEED_PICKUP_SLOTS', 10),

    'dining_markers' => (int) env('SEED_DINING_MARKERS', 20),

];
