<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\MenuItemDailyStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsSellThroughTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Sell-through should use completed order quantities vs sum(units_set), not daily_stock.units_sold,
     * so it stays aligned with the leaderboard “Units” column when the ledger was not incremented.
     */
    public function test_item_leaderboard_sell_through_uses_order_units_over_units_set(): void
    {
        $day = Carbon::parse('2026-03-15 12:00:00');
        Carbon::setTestNow($day);

        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);

        $item = MenuItem::create([
            'name' => 'Analytics Adobo',
            'price' => 100,
            'category_id' => $category->id,
            'units_today' => 100,
            'menu_date' => $day->toDateString(),
        ]);

        MenuItemDailyStock::create([
            'menu_item_id' => $item->id,
            'menu_date' => $day->toDateString(),
            'units_set' => 100,
            'units_sold' => 0,
            'units_leftover' => 100,
        ]);

        $order = Order::create([
            'reference' => 'AN-SELL-1',
            'channel' => 'web',
            'status' => OrderStatus::Completed,
            'payment_status' => 'paid',
            'customer_name' => 'Test',
            'customer_phone' => '',
            'total' => 500,
            'delivery_type' => 'pickup',
        ]);
        $order->forceFill(['updated_at' => $day])->save();

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'name' => $item->name,
            'category_name' => $category->name,
            'quantity' => 5,
            'price' => $item->price,
        ]);

        $this->actingAs($admin)
            ->get('/portal/analytics?date_from=2026-03-01&date_to=2026-03-31')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Analytics')
                ->where('menu_intelligence.leaderboard.0.name', 'Analytics Adobo')
                ->where('menu_intelligence.leaderboard.0.units_sold', 5)
                ->where('menu_intelligence.leaderboard.0.sell_through_pct', 5)
            );
    }
}
