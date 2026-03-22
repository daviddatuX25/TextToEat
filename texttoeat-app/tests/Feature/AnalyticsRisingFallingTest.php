<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsRisingFallingTest extends TestCase
{
    use RefreshDatabase;

    public function test_falling_list_includes_items_with_lower_units_than_previous_period(): void
    {
        $category = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);
        $menuItem = MenuItem::create([
            'name' => 'Pancit Decline Test',
            'price' => 50,
            'category_id' => $category->id,
            'menu_date' => Carbon::parse('2026-03-08'),
        ]);

        $prevWindow = Carbon::parse('2026-03-08 12:00:00');
        $currWindow = Carbon::parse('2026-03-10 12:00:00');

        $orderPrev = Order::create([
            'reference' => 'RF-PREV',
            'channel' => 'web',
            'status' => OrderStatus::Completed,
            'payment_status' => 'paid',
            'customer_name' => 'A',
            'customer_phone' => '',
            'total' => 500,
            'delivery_type' => 'pickup',
        ]);
        $orderPrev->forceFill(['updated_at' => $prevWindow])->save();

        OrderItem::create([
            'order_id' => $orderPrev->id,
            'menu_item_id' => $menuItem->id,
            'name' => $menuItem->name,
            'category_name' => $category->name,
            'quantity' => 10,
            'price' => $menuItem->price,
        ]);

        $orderCurr = Order::create([
            'reference' => 'RF-CURR',
            'channel' => 'web',
            'status' => OrderStatus::Completed,
            'payment_status' => 'paid',
            'customer_name' => 'B',
            'customer_phone' => '',
            'total' => 100,
            'delivery_type' => 'pickup',
        ]);
        $orderCurr->forceFill(['updated_at' => $currWindow])->save();

        OrderItem::create([
            'order_id' => $orderCurr->id,
            'menu_item_id' => $menuItem->id,
            'name' => $menuItem->name,
            'category_name' => $category->name,
            'quantity' => 2,
            'price' => $menuItem->price,
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get('/portal/analytics?date_from=2026-03-10&date_to=2026-03-11')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Analytics')
                ->where('menu_intelligence.rising_falling.falling.0.name', 'Pancit Decline Test')
                ->where('menu_intelligence.rising_falling.falling.0.delta', -8)
                ->where('menu_intelligence.rising_falling.summary.falling_count', 1)
                ->where('menu_intelligence.rising_falling.summary.rising_count', 0)
            );
    }
}
