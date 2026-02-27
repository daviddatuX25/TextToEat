<?php

namespace Tests\Feature;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\ActionLog;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_shows_order_logs_index_page(): void
    {
        $user = User::factory()->create();
        $order = Order::factory()->create([
            'status' => OrderStatus::Received,
            'channel' => OrderChannel::Chatbot,
        ]);

        ActionLog::create([
            'user_id' => $user->id,
            'action' => 'created',
            'model' => 'Order',
            'model_id' => $order->id,
            'payload' => [],
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/orders')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('OrderLogs')
                ->has('logs.data.0.action')
            );
    }

    public function test_it_filters_order_logs_by_customer(): void
    {
        $user = User::factory()->create();

        $matchingOrder = Order::factory()->create([
            'customer_name' => 'John Doe',
        ]);
        $otherOrder = Order::factory()->create([
            'customer_name' => 'Jane Smith',
        ]);

        ActionLog::create([
            'user_id' => $user->id,
            'action' => 'updated',
            'model' => 'Order',
            'model_id' => $matchingOrder->id,
            'payload' => [],
        ]);

        ActionLog::create([
            'user_id' => $user->id,
            'action' => 'updated',
            'model' => 'Order',
            'model_id' => $otherOrder->id,
            'payload' => [],
        ]);

        $this->actingAs($user)
            ->get('/portal/logs/orders?customer=John')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('OrderLogs')
                ->where('logs.data.0.order.customer_name', 'John Doe')
            );
    }
}

