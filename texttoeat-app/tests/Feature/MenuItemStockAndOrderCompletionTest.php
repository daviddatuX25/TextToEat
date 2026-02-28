<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
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
        $item = MenuItem::create([
            'name' => 'Adobo',
            'price' => 100,
            'category' => 'Ulam',
            'units_today' => 10,
            'menu_date' => $today,
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
            'quantity' => 3,
            'price' => $item->price,
        ]);

        $available = $service->getVirtualAvailableForToday([$item->id]);
        $this->assertSame(7, $available[$item->id]);

        $order->update(['status' => OrderStatus::Cancelled]);
        $available = $service->getVirtualAvailableForToday([$item->id]);
        $this->assertSame(10, $available[$item->id]);
    }

    public function test_completing_order_decrements_units_today(): void
    {
        $today = Carbon::today();
        $item = MenuItem::create([
            'name' => 'Sinigang',
            'price' => 120,
            'category' => 'Soup',
            'units_today' => 20,
            'menu_date' => $today,
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

        $item->refresh();
        $this->assertSame(18, $item->units_today);
    }

    public function test_menu_item_category_must_be_from_fixed_list(): void
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        $response = $this->post('/portal/menu-items', [
            'name' => 'Test Item',
            'price' => 99,
            'category' => 'InvalidCategory',
            'units_today' => 10,
        ]);

        $response->assertSessionHasErrors('category');
        $this->assertDatabaseMissing('menu_items', ['name' => 'Test Item']);

        $response = $this->post('/portal/menu-items', [
            'name' => 'Valid Item',
            'price' => 99,
            'category' => 'Ulam',
            'units_today' => 10,
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('menu_items', ['name' => 'Valid Item', 'category' => 'Ulam']);
    }
}
