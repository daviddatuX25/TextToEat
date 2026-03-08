<?php

namespace Tests\Feature;

use App\Contracts\MessengerSenderInterface;
use App\Contracts\SmsSenderInterface;
use App\Models\ChatbotSession;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class OrderStatusNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sms_delivery_on_the_way_sends_push(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09171234567',
            'language' => 'en',
            'state' => [],
            'last_activity_at' => now(),
        ]);

        $order = Order::create([
            'reference' => 'ABC123',
            'channel' => 'sms',
            'external_id' => '09171234567',
            'status' => 'preparing',
            'payment_status' => 'unpaid',
            'customer_name' => 'Juan',
            'customer_phone' => '09171234567',
            'total' => 100.00,
            'delivery_type' => 'delivery',
            'delivery_place' => 'Barangay Tagudin',
            'delivery_fee' => null,
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldReceive('send')
            ->once()
            ->with('09171234567', Mockery::on(fn ($m) => str_contains($m, 'on the way') && str_contains($m, 'ABC123')), 'sms', Mockery::any())
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $this->actingAs($user)
            ->put("/portal/orders/{$order->id}", ['status' => 'on_the_way'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_sms_pickup_ready_sends_push(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09181234567',
            'language' => 'en',
            'state' => [],
            'last_activity_at' => now(),
        ]);

        $order = Order::create([
            'reference' => 'XYZ789',
            'channel' => 'sms',
            'external_id' => '09181234567',
            'status' => 'preparing',
            'payment_status' => 'unpaid',
            'customer_name' => 'Maria',
            'customer_phone' => '09181234567',
            'total' => 150.00,
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldReceive('send')
            ->once()
            ->with('09181234567', Mockery::on(fn ($m) => str_contains($m, 'ready for pickup') && str_contains($m, 'XYZ789')), 'sms', Mockery::any())
            ->andReturn(['success' => true, 'ids' => [1]]);
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $this->actingAs($user)
            ->put("/portal/orders/{$order->id}", ['status' => 'ready'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_messenger_delivery_on_the_way_sends_push(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'messenger',
            'external_id' => 'psid-456',
            'language' => 'en',
            'state' => [],
            'last_activity_at' => now(),
        ]);

        $order = Order::create([
            'reference' => 'MSG001',
            'channel' => 'messenger',
            'external_id' => 'psid-456',
            'status' => 'preparing',
            'payment_status' => 'unpaid',
            'customer_name' => 'Pedro',
            'customer_phone' => '',
            'total' => 200.00,
            'delivery_type' => 'delivery',
            'delivery_place' => 'Barangay Tagudin',
            'delivery_fee' => null,
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $fbMock->shouldReceive('send')
            ->once()
            ->with('psid-456', Mockery::on(fn ($m) => str_contains($m, 'on the way') && str_contains($m, 'MSG001')));
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $this->actingAs($user)
            ->put("/portal/orders/{$order->id}", ['status' => 'on_the_way'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_web_order_status_change_does_not_send(): void
    {
        $user = User::factory()->create();

        $order = Order::create([
            'reference' => 'WEB001',
            'channel' => 'web',
            'external_id' => null,
            'status' => 'preparing',
            'payment_status' => 'unpaid',
            'customer_name' => 'Online User',
            'customer_phone' => '',
            'total' => 75.00,
            'delivery_type' => 'delivery',
            'delivery_place' => 'Some place',
            'delivery_fee' => null,
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldNotReceive('send');
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $fbMock->shouldNotReceive('send');
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $this->actingAs($user)
            ->put("/portal/orders/{$order->id}", ['status' => 'on_the_way'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_walkin_order_status_change_does_not_send(): void
    {
        $user = User::factory()->create();

        $order = Order::create([
            'reference' => 'WALK01',
            'channel' => 'walkin',
            'external_id' => null,
            'status' => 'preparing',
            'payment_status' => 'unpaid',
            'customer_name' => 'Walk-in',
            'customer_phone' => '',
            'total' => 50.00,
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldNotReceive('send');
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $fbMock->shouldNotReceive('send');
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $this->actingAs($user)
            ->put("/portal/orders/{$order->id}", ['status' => 'ready'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    public function test_status_change_to_received_does_not_send(): void
    {
        $user = User::factory()->create();

        ChatbotSession::create([
            'channel' => 'sms',
            'external_id' => '09191111111',
            'language' => 'en',
            'state' => [],
            'last_activity_at' => now(),
        ]);

        $order = Order::create([
            'reference' => 'RCV01',
            'channel' => 'sms',
            'external_id' => '09191111111',
            'status' => 'preparing',
            'payment_status' => 'unpaid',
            'customer_name' => 'Test',
            'customer_phone' => '09191111111',
            'total' => 50.00,
            'delivery_type' => 'delivery',
            'delivery_place' => null,
            'delivery_fee' => null,
        ]);

        $smsMock = Mockery::mock(SmsSenderInterface::class);
        $smsMock->shouldNotReceive('send');
        $this->app->instance(SmsSenderInterface::class, $smsMock);

        $fbMock = Mockery::mock(MessengerSenderInterface::class);
        $fbMock->shouldNotReceive('send');
        $this->app->instance(MessengerSenderInterface::class, $fbMock);

        $this->actingAs($user)
            ->put("/portal/orders/{$order->id}", ['status' => 'received'])
            ->assertStatus(302)
            ->assertSessionHas('success');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
