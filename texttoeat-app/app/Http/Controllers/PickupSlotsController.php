<?php

namespace App\Http\Controllers;

use App\Models\PickupSlot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PickupSlotsController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'value' => ['required', 'string', 'max:' . PickupSlot::MAX_VALUE_LENGTH, 'unique:pickup_slots,value'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        PickupSlot::create($validated);

        return redirect()->back()->with('success', 'Pickup slot added.');
    }

    public function update(Request $request, PickupSlot $pickupSlot): RedirectResponse
    {
        $validated = $request->validate([
            'value' => ['required', 'string', 'max:' . PickupSlot::MAX_VALUE_LENGTH, 'unique:pickup_slots,value,' . $pickupSlot->id],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $pickupSlot->update($validated);

        return redirect()->back()->with('success', 'Pickup slot updated.');
    }

    public function destroy(PickupSlot $pickupSlot): RedirectResponse
    {
        $pickupSlot->delete();

        return redirect()->back()->with('success', 'Pickup slot removed.');
    }
}
