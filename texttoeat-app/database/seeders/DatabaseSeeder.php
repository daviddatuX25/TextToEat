<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application database.
     *
     * Default: production data only (1 admin, 2 staff, pickup slots, dining
     * markers, delivery areas, categories, menu). Counts come from config/seed.php.
     *
     * For demo (production + analytics, orders, action logs):
     *   php artisan db:seed --class=DemoSeeder
     */
    public function run(): void
    {
        $this->call(ProductionSeeder::class);
    }
}
