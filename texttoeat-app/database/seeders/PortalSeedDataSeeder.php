<?php

namespace Database\Seeders;

use App\Models\DeliveryArea;
use App\Models\DiningMarker;
use App\Models\PickupSlot;
use Illuminate\Database\Seeder;

class PortalSeedDataSeeder extends Seeder
{
    /**
     * Seed pickup slots, dining markers, and delivery areas for portal use.
     */
    public function run(): void
    {
        $this->seedPickupSlots();
        $this->seedDiningMarkers();
        $this->seedDeliveryAreas();
    }

    private function seedPickupSlots(): void
    {
        $slots = [];
        for ($i = 1; $i <= 30; $i++) {
            $slots[] = 'P' . $i;
        }
        foreach ($slots as $i => $value) {
            PickupSlot::firstOrCreate(
                ['value' => $value],
                ['sort_order' => $i]
            );
        }
    }

    private function seedDiningMarkers(): void
    {
        $markers = [];
        for ($i = 1; $i <= 30; $i++) {
            $markers[] = (string) $i;
        }
        foreach ($markers as $i => $value) {
            DiningMarker::firstOrCreate(
                ['value' => $value],
                ['sort_order' => $i]
            );
        }
    }

    private function seedDeliveryAreas(): void
    {
        $areas = [
            ['name' => 'Municipal Hall', 'is_free' => true, 'fee' => null, 'sort_order' => 0],
            ['name' => 'Poblacion', 'is_free' => false, 'fee' => 25.00, 'sort_order' => 1],
            ['name' => 'Barangay Center', 'is_free' => false, 'fee' => 35.00, 'sort_order' => 2],
            ['name' => 'Other (fee on delivery)', 'is_free' => false, 'fee' => null, 'sort_order' => 3],
        ];
        foreach ($areas as $area) {
            DeliveryArea::firstOrCreate(
                ['name' => $area['name']],
                [
                    'is_free' => $area['is_free'],
                    'fee' => $area['fee'],
                    'sort_order' => $area['sort_order'],
                ]
            );
        }
    }
}
