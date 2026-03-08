<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    /**
     * Seed demo data: production base plus orders, order items, and action logs
     * for dashboards, analytics, and workflow screens.
     *
     * Run with: php artisan db:seed --class=DemoSeeder
     */
    public function run(): void
    {
        $this->call(ProductionSeeder::class);
        $this->call(AnalyticsAndWorkflowsSeeder::class);
    }
}
