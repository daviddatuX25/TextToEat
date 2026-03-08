<?php

namespace Tests\Feature;

use App\Models\MenuItem;
use App\Models\MenuItemDailySnapshot;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MenuResetCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2025-03-08 06:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_rollover_copies_yesterday_to_today_and_resets(): void
    {
        $yesterday = Carbon::yesterday();

        MenuItem::create([
            'name' => 'Chicken Adobo',
            'price' => 125.00,
            'category' => 'Ulam',
            'image_url' => null,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => $yesterday,
        ]);

        MenuItem::create([
            'name' => 'Pork Sinigang',
            'price' => 135.00,
            'category' => 'Ulam',
            'image_url' => null,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => $yesterday,
        ]);

        Artisan::call('menu:reset-today');

        $todayItems = MenuItem::query()
            ->whereDate('menu_date', Carbon::today())
            ->get();

        $this->assertCount(2, $todayItems);

        foreach ($todayItems as $item) {
            $this->assertTrue($item->is_sold_out);
            $this->assertSame(0, (int) $item->units_today);
        }

        $names = $todayItems->pluck('name')->sort()->values()->all();
        $this->assertSame(['Chicken Adobo', 'Pork Sinigang'], $names);

        $this->assertSame(Carbon::today()->toDateString(), Cache::get('menu_reset_date'));
    }

    public function test_reset_updates_existing_today_items(): void
    {
        $today = Carbon::today();

        MenuItem::create([
            'name' => 'Lechon',
            'price' => 185.00,
            'category' => 'Ulam',
            'image_url' => null,
            'units_today' => 20,
            'is_sold_out' => false,
            'menu_date' => $today,
        ]);

        Artisan::call('menu:reset-today');

        $item = MenuItem::whereDate('menu_date', $today)->first();
        $this->assertNotNull($item);
        $this->assertTrue($item->is_sold_out);
        $this->assertSame(0, (int) $item->units_today);
    }

    public function test_rollover_is_idempotent_no_duplicates(): void
    {
        $yesterday = Carbon::yesterday();

        MenuItem::create([
            'name' => 'Adobo',
            'price' => 100,
            'category' => 'Ulam',
            'menu_date' => $yesterday,
        ]);

        Artisan::call('menu:reset-today');
        $count1 = MenuItem::whereDate('menu_date', Carbon::today())->count();

        Artisan::call('menu:reset-today');
        $count2 = MenuItem::whereDate('menu_date', Carbon::today())->count();

        $this->assertSame(1, $count1);
        $this->assertSame(1, $count2);
    }

    public function test_force_flag_bypasses_morning_check(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-03-08 14:00:00')); // 2pm

        $yesterday = Carbon::yesterday();
        MenuItem::create([
            'name' => 'Test',
            'price' => 50,
            'category' => 'Ulam',
            'menu_date' => $yesterday,
        ]);

        Artisan::call('menu:reset-today', ['--force' => true]);

        $todayCount = MenuItem::whereDate('menu_date', Carbon::today())->count();
        $this->assertSame(1, $todayCount);
    }

    public function test_snapshot_recorded_before_reset(): void
    {
        $today = Carbon::today();
        $item = MenuItem::create([
            'name' => 'Caldereta',
            'price' => 150.00,
            'category' => 'Ulam',
            'image_url' => null,
            'units_today' => 20,
            'is_sold_out' => false,
            'menu_date' => $today,
        ]);

        Artisan::call('menu:reset-today');

        $snapshot = MenuItemDailySnapshot::where('menu_item_id', $item->id)
            ->whereDate('menu_date', $today)
            ->first();
        $this->assertNotNull($snapshot);
        $this->assertSame(20, $snapshot->units_set);
        $this->assertSame(0, $snapshot->units_sold);
        $this->assertSame(20, $snapshot->units_leftover);
    }
}
