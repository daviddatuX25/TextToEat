<?php

namespace Tests\Feature;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompletedOrdersTest extends TestCase
{
    use RefreshDatabase;

    /** @see DatabaseDialect: completed orders search uses portable case-insensitive LIKE (not ILIKE) for PostgreSQL and MySQL/MariaDB */
    public function test_completed_orders_search_is_case_insensitive(): void
    {
        $user = User::factory()->create();

        Order::factory()->create([
            'status' => OrderStatus::Completed,
            'customer_name' => 'Alice Smith',
            'channel' => OrderChannel::Web,
        ]);
        Order::factory()->create([
            'status' => OrderStatus::Completed,
            'customer_name' => 'Bob Jones',
            'channel' => OrderChannel::Web,
        ]);

        $this->actingAs($user)
            ->get('/portal/orders/completed?search=alice')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('CompletedOrders')
                ->has('orders')
                ->where('orders.0.customer_name', 'Alice Smith')
            );
    }
}
