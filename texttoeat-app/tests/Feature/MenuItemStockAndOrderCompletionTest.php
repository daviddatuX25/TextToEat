<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\MenuItemStockService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuItemStockAndOrderCompletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_virtual_available_excludes_pending_orders(): void
    {
        $today = Carbon::today();
        $category = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);
        $item = MenuItem::create([
            'name' => 'Adobo',
            'price' => 100,
            'category_id' => $category->id,
            'units_today' => 10,
            'menu_date' => $today,
        ]);
        // Seed today's stock row instead of relying on legacy units_today.
        \App\Models\MenuItemDailyStock::create([
            'menu_item_id' => $item->id,
            'menu_date' => $today,
            'units_set' => 10,
            'units_sold' => 0,
            'units_leftover' => 10,
        ]);

        $service = app(MenuItemStockService::class);
        $available = $service->getVirtualAvailableForToday([$item->id]);
        $this->assertSame(10, $available[$item->id]);

        $order = Order::create([
            'reference' => 'REF001',
            'channel' => 'web',
            'status' => OrderStatus::Received,
            'customer_name' => 'Test',
            'customer_phone' => '',
            'total' => 200,
            'delivery_type' => 'pickup',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'name' => $item->name,
            'category_name' => $category->name,
            'quantity' => 3,
            'price' => $item->price,
        ]);

        $available = $service->getVirtualAvailableForToday([$item->id]);
        $this->assertSame(7, $available[$item->id]);

        $order->update(['status' => OrderStatus::Cancelled]);
        $available = $service->getVirtualAvailableForToday([$item->id]);
        $this->assertSame(10, $available[$item->id]);
    }

    public function test_completing_order_increments_daily_units_sold(): void
    {
        $today = Carbon::today();
        $category = Category::firstOrCreate(['name' => 'Soup'], ['name' => 'Soup']);
        $item = MenuItem::create([
            'name' => 'Sinigang',
            'price' => 120,
            'category_id' => $category->id,
            'menu_date' => $today,
        ]);
        \App\Models\MenuItemDailyStock::create([
            'menu_item_id' => $item->id,
            'menu_date' => $today,
            'units_set' => 20,
            'units_sold' => 0,
            'units_leftover' => 20,
        ]);

        $order = Order::create([
            'reference' => 'REF002',
            'channel' => 'web',
            'status' => OrderStatus::Received,
            'customer_name' => 'Guest',
            'customer_phone' => '',
            'total' => 240,
            'delivery_type' => 'pickup',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => $item->id,
            'name' => $item->name,
            'category_name' => $category->name,
            'quantity' => 2,
            'price' => $item->price,
        ]);

        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);
        $response = $this->put('/portal/orders/' . $order->id, [
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);
        $response->assertRedirect();

        $stock = \App\Models\MenuItemDailyStock::where('menu_item_id', $item->id)
            ->whereDate('menu_date', $today)
            ->first();
        $this->assertNotNull($stock);
        $this->assertSame(2, (int) $stock->units_sold);
    }

    public function test_menu_item_category_must_be_from_fixed_list(): void
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        $category = \App\Models\Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);

        $response = $this->post('/portal/menu-items', [
            'name' => 'Test Item',
            'price' => 99,
            'category_id' => 99999,
            'units_today' => 10,
        ]);

        $response->assertSessionHasErrors('category_id');
        $this->assertDatabaseMissing('menu_items', ['name' => 'Test Item']);

        $response = $this->post('/portal/menu-items', [
            'name' => 'Valid Item',
            'price' => 99,
            'category_id' => $category->id,
            'units_today' => 10,
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('menu_items', ['name' => 'Valid Item', 'category_id' => $category->id]);
    }
}
