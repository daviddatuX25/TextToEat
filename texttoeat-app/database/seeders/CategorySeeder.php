<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Seed categories from config. Run before any seeder that creates menu items.
     */
    public function run(): void
    {
        $names = config('menu.categories', []);

        foreach ($names as $index => $name) {
            Category::firstOrCreate(
                ['name' => $name],
                ['sort_order' => $index]
            );
        }
    }
}
