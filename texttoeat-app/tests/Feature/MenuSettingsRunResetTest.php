<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuSettingsRunResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancel_previous_unfulfilled_runs_after_morning_cutoff_when_checkbox_checked(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-06-10 14:30:00', config('app.timezone')));
        Setting::set('menu.reset_morning_from_hour', 0);
        Setting::set('menu.reset_morning_until_hour', 11);

        $admin = User::factory()->create(['role' => 'admin']);

        $order = Order::factory()->create([
            'status' => OrderStatus::Received,
            'created_at' => Carbon::parse('2025-06-08 10:00:00'),
        ]);

        $response = $this->actingAs($admin)->post('/portal/menu-settings/run-reset', [
            'cancel_previous_unfulfilled' => true,
            'force' => false,
        ]);

        $response->assertRedirect(route('portal.menu-settings'));
        $order->refresh();
        $this->assertSame(OrderStatus::Cancelled->value, (string) $order->status);

        Carbon::setTestNow();
    }

    public function test_menu_rollover_still_blocked_after_cutoff_without_force_even_when_orders_cancelled(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-06-10 14:30:00', config('app.timezone')));
        Setting::set('menu.reset_morning_from_hour', 0);
        Setting::set('menu.reset_morning_until_hour', 11);

        $admin = User::factory()->create(['role' => 'admin']);
        Order::factory()->create([
            'status' => OrderStatus::Received,
            'created_at' => Carbon::parse('2025-06-08 10:00:00'),
        ]);

        $response = $this->actingAs($admin)->from(route('portal.menu-settings'))->post('/portal/menu-settings/run-reset', [
            'cancel_previous_unfulfilled' => true,
            'force' => false,
        ]);

        $response->assertSessionHas('success');
        $this->assertStringContainsString('cancelled', (string) session('success'));
        $this->assertStringContainsString('rollover', strtolower((string) session('success')));

        Carbon::setTestNow();
    }

    public function test_preview_includes_unfulfilled_orders_from_earlier_today(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-06-10 12:00:00', config('app.timezone')));

        $admin = User::factory()->create(['role' => 'admin']);

        Order::factory()->create([
            'status' => OrderStatus::Preparing,
            'created_at' => Carbon::parse('2025-06-10 09:00:00'),
        ]);

        $response = $this->actingAs($admin)->getJson('/portal/menu-settings/preview-reset-cancellations');

        $response->assertOk();
        $response->assertJsonPath('count', 1);

        Carbon::setTestNow();
    }

    public function test_reset_cancels_unfulfilled_order_created_earlier_same_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-06-10 15:00:00', config('app.timezone')));
        Setting::set('menu.reset_morning_from_hour', 0);
        Setting::set('menu.reset_morning_until_hour', 11);

        $admin = User::factory()->create(['role' => 'admin']);

        $order = Order::factory()->create([
            'status' => OrderStatus::Ready,
            'created_at' => Carbon::parse('2025-06-10 08:30:00'),
        ]);

        $this->actingAs($admin)->post('/portal/menu-settings/run-reset', [
            'cancel_previous_unfulfilled' => true,
            'force' => true,
        ]);

        $order->refresh();
        $this->assertSame(OrderStatus::Cancelled->value, (string) $order->status);

        Carbon::setTestNow();
    }
}
