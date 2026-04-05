<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuItemAutoReplenishTest extends TestCase
{
    use RefreshDatabase;

    public function test_auto_clears_is_sold_out_when_units_today_increased_from_zero(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);
        $item = MenuItem::create([
            'name' => 'Adobo',
            'price' => 50,
            'category_id' => $category->id,
            'is_sold_out' => true,
            'menu_date' => Carbon::today(),
        ]);
        MenuItemDailyStock::create([
            'menu_item_id' => $item->id,
            'menu_date' => Carbon::today(),
            'units_set' => 0,
            'units_sold' => 0,
            'units_leftover' => 0,
        ]);

        $response = $this->actingAs($admin)
            ->put("/portal/menu-items/{$item->id}", ['units_today' => 10]);

        $response->assertRedirect();
        $item->refresh();
        $this->assertFalse($item->is_sold_out);
    }

    public function test_does_not_change_is_sold_out_when_units_today_stays_at_zero(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);
        $item = MenuItem::create([
            'name' => 'Sinigang',
            'price' => 60,
            'category_id' => $category->id,
            'is_sold_out' => true,
            'menu_date' => Carbon::today(),
        ]);
        MenuItemDailyStock::create([
            'menu_item_id' => $item->id,
            'menu_date' => Carbon::today(),
            'units_set' => 0,
            'units_sold' => 0,
            'units_leftover' => 0,
        ]);

        $this->actingAs($admin)
            ->put("/portal/menu-items/{$item->id}", ['units_today' => 0]);

        $item->refresh();
        $this->assertTrue($item->is_sold_out);
    }
}
