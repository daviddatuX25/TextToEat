<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class FilipinoMealsSeeder extends Seeder
{
    /**
     * Filipino meals with real food images (Picsum allows hotlinking; stable per seed).
     */
    public function run(): void
    {
        $today = Carbon::today(config('app.timezone'));
        $menuDate = $today->toDateString();

        $meals = [
            [
                'name' => 'Chicken Adobo',
                'price' => 125.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/chicken-adobo/800/600',
                'units_today' => 30,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Pork Sinigang na Baboy',
                'price' => 135.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/sinigang/800/600',
                'units_today' => 25,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Lechon Kawali',
                'price' => 185.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/lechon/800/600',
                'units_today' => 20,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Kare-Kare',
                'price' => 165.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/kare-kare/800/600',
                'units_today' => 18,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Beef Caldereta',
                'price' => 155.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/caldereta/800/600',
                'units_today' => 22,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Pork Sisig',
                'price' => 145.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/sisig/800/600',
                'units_today' => 28,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Lumpiang Shanghai (6 pcs)',
                'price' => 85.00,
                'category' => 'Merienda',
                'image_url' => 'https://picsum.photos/seed/lumpia/800/600',
                'units_today' => 40,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Pancit Canton',
                'price' => 95.00,
                'category' => 'Noodles',
                'image_url' => 'https://picsum.photos/seed/pancit/800/600',
                'units_today' => 35,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Tapsilog',
                'price' => 115.00,
                'category' => 'Silog',
                'image_url' => 'https://picsum.photos/seed/tapsilog/800/600',
                'units_today' => 25,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Longsilog',
                'price' => 95.00,
                'category' => 'Silog',
                'image_url' => 'https://picsum.photos/seed/longsilog/800/600',
                'units_today' => 30,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Halo-Halo',
                'price' => 75.00,
                'category' => 'Dessert',
                'image_url' => 'https://picsum.photos/seed/halo-halo/800/600',
                'units_today' => 45,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Turon (2 pcs)',
                'price' => 45.00,
                'category' => 'Dessert',
                'image_url' => 'https://picsum.photos/seed/turon/800/600',
                'units_today' => 50,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Leche Flan',
                'price' => 65.00,
                'category' => 'Dessert',
                'image_url' => 'https://picsum.photos/seed/leche-flan/800/600',
                'units_today' => 20,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Dinuguan',
                'price' => 105.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/dinuguan/800/600',
                'units_today' => 15,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
            [
                'name' => 'Pinakbet',
                'price' => 95.00,
                'category' => 'Ulam',
                'image_url' => 'https://picsum.photos/seed/pinakbet/800/600',
                'units_today' => 25,
                'is_sold_out' => false,
                'menu_date' => $menuDate,
            ],
        ];

        foreach ($meals as $meal) {
            $categoryName = $meal['category'];
            $category = Category::firstOrCreate(['name' => $categoryName], ['name' => $categoryName]);
            $data = $meal;
            unset($data['category']);
            $data['category_id'] = $category->id;
            MenuItem::updateOrCreate(
                [
                    'name' => $meal['name'],
                    'menu_date' => $meal['menu_date'],
                ],
                $data
            );
        }

        foreach (MenuItem::whereDate('menu_date', $today)->get() as $item) {
            MenuItemDailyStock::updateOrCreate(
                [
                    'menu_item_id' => $item->id,
                    'menu_date' => $menuDate,
                ],
                [
                    'units_set' => (int) $item->units_today,
                    'units_sold' => 0,
                    'units_leftover' => (int) $item->units_today,
                ]
            );
        }
    }
}
