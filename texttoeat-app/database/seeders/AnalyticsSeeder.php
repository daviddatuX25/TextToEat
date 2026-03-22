<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Short alias for {@see AnalyticsAndWorkflowsSeeder}.
 *
 * Use either:
 *   php artisan db:seed --class=AnalyticsSeeder
 *   php artisan db:seed --class=AnalyticsAndWorkflowsSeeder
 */
class AnalyticsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AnalyticsAndWorkflowsSeeder::class);
    }
}
