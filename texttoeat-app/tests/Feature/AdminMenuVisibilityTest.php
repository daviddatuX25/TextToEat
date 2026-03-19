<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMenuVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_see_sold_out_and_zero_stock_items_for_today(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-03-08 09:00:00'));

        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        $category = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);

        $item = MenuItem::create([
            'name' => 'Test Sold Out Item',
            'price' => 100,
            'category_id' => $category->id,
            'image_url' => null,
            'units_today' => 0,
            'is_sold_out' => true,
            'menu_date' => Carbon::today(),
        ]);

        $response = $this->get('/portal/menu-items');

        $response->assertStatus(200);
        $response->assertSee($item->name);
    }
}

