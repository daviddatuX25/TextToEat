<?php

namespace Database\Factories;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => fake()->unique()->regexify('[A-Za-z0-9]{8}'),
            'channel' => OrderChannel::Web,
            'status' => OrderStatus::Received,
            'payment_status' => 'unpaid',
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->phoneNumber(),
            'total' => fake()->randomFloat(2, 50, 500),
            'delivery_type' => 'pickup',
            'delivery_place' => null,
            'delivery_fee' => 0,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Completed,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Cancelled,
        ]);
    }
}
