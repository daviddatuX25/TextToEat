<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\MenuItemDailySnapshot;
use App\Models\MenuItemDailyStock;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MenuResetCommandTest extends TestCase
{
    use RefreshDatabase;

    private ?Category $ulamCategory = null;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2025-03-08 06:00:00'));
        $this->ulamCategory = Category::firstOrCreate(['name' => 'Ulam'], ['name' => 'Ulam']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_rollover_copies_yesterday_to_today_and_resets(): void
    {
        $yesterday = Carbon::yesterday();
        $today = Carbon::today();

        $adobo = MenuItem::create([
            'name' => 'Chicken Adobo',
            'price' => 125.00,
            'category_id' => $this->ulamCategory->id,
            'image_url' => null,
            'units_today' => 10,
            'is_sold_out' => false,
            'menu_date' => $yesterday,
        ]);

        $sinigang = MenuItem::create([
            'name' => 'Pork Sinigang',
            'price' => 135.00,
            'category_id' => $this->ulamCategory->id,
            'image_url' => null,
            'units_today' => 5,
            'is_sold_out' => false,
            'menu_date' => $yesterday,
        ]);

        // Yesterday's stock rows
        \App\Models\MenuItemDailyStock::create([
            'menu_item_id' => $adobo->id,
            'menu_date' => $yesterday,
            'units_set' => 10,
            'units_sold' => 3,
            'units_leftover' => 7,
        ]);
        \App\Models\MenuItemDailyStock::create([
            'menu_item_id' => $sinigang->id,
            'menu_date' => $yesterday,
            'units_set' => 5,
            'units_sold' => 1,
            'units_leftover' => 4,
        ]);

        Artisan::call('menu:reset-today');

        // Snapshot created for yesterday
        $snapshots = MenuItemDailySnapshot::whereDate('menu_date', $yesterday)->get();
        $this->assertCount(2, $snapshots);

        $adoboSnap = $snapshots->firstWhere('menu_item_id', $adobo->id);
        $this->assertNotNull($adoboSnap);
        $this->assertSame(10, (int) $adoboSnap->units_set);
        $this->assertSame(3, (int) $adoboSnap->units_sold);
        $this->assertSame(7, (int) $adoboSnap->units_leftover);

        // Today's stock initialized to zero for all catalog items
        $todayStock = \App\Models\MenuItemDailyStock::whereDate('menu_date', $today)->get();
        $this->assertGreaterThanOrEqual(2, $todayStock->count());
        foreach ($todayStock as $row) {
            $this->assertSame(0, (int) $row->units_set);
            $this->assertSame(0, (int) $row->units_sold);
            $this->assertSame(0, (int) $row->units_leftover);
        }

        $this->assertSame(Carbon::today()->toDateString(), Cache::get('menu_reset_date'));
    }

    public function test_reset_updates_existing_today_items(): void
    {
        $today = Carbon::today();

        MenuItem::create([
            'name' => 'Lechon',
            'price' => 185.00,
            'category_id' => $this->ulamCategory->id,
            'image_url' => null,
            'units_today' => 20,
            'is_sold_out' => false,
            'menu_date' => $today,
        ]);

        Artisan::call('menu:reset-today');

        $this->assertSame(0, MenuItemDailyStock::whereDate('menu_date', Carbon::today())->sum('units_set'));
    }

    public function test_rollover_is_idempotent_no_duplicates(): void
    {
        $today = Carbon::today();

        $item = MenuItem::create([
            'name' => 'Adobo',
            'price' => 100,
            'category_id' => $this->ulamCategory->id,
            'menu_date' => $today,
        ]);

        Artisan::call('menu:reset-today');
        $count1 = MenuItemDailyStock::where('menu_item_id', $item->id)
            ->whereDate('menu_date', Carbon::today())
            ->count();

        Artisan::call('menu:reset-today');
        $count2 = MenuItemDailyStock::where('menu_item_id', $item->id)
            ->whereDate('menu_date', Carbon::today())
            ->count();

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
            'category_id' => $this->ulamCategory->id,
            'menu_date' => $yesterday,
        ]);

        Artisan::call('menu:reset-today', ['--force' => true]);

        // Force flag should still run the reset logic even outside the morning window,
        // which means today's stock rows get initialized for catalog items.
        $todayStockCount = MenuItemDailyStock::whereDate('menu_date', Carbon::today())->count();
        $this->assertGreaterThanOrEqual(1, $todayStockCount);
    }

    public function test_snapshot_recorded_before_reset(): void
    {
        $yesterday = Carbon::yesterday();
        $item = MenuItem::create([
            'name' => 'Caldereta',
            'price' => 150.00,
            'category_id' => $this->ulamCategory->id,
            'image_url' => null,
            'units_today' => 20,
            'is_sold_out' => false,
            'menu_date' => $yesterday,
        ]);

        MenuItemDailyStock::create([
            'menu_item_id' => $item->id,
            'menu_date' => $yesterday,
            'units_set' => 20,
            'units_sold' => 0,
            'units_leftover' => 20,
        ]);

        Artisan::call('menu:reset-today');

        $snapshot = MenuItemDailySnapshot::where('menu_item_id', $item->id)
            ->whereDate('menu_date', Carbon::yesterday())
            ->first();
        $this->assertNotNull($snapshot);
        $this->assertSame(20, $snapshot->units_set);
        $this->assertSame(0, $snapshot->units_sold);
        $this->assertSame(20, $snapshot->units_leftover);
    }
}
