<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDeliveryAreaRequest;
use App\Models\DeliveryArea;
use Illuminate\Http\RedirectResponse;

class DeliveryAreasController extends Controller
{
    public function store(StoreDeliveryAreaRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['fee'] = $validated['is_free'] ? null : ($validated['fee'] ?? null);
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        DeliveryArea::create($validated);

        return redirect()->back()->with('success', 'Delivery area added.');
    }

    public function update(StoreDeliveryAreaRequest $request, DeliveryArea $deliveryArea): RedirectResponse
    {
        $validated = $request->validated();
        $validated['fee'] = $validated['is_free'] ? null : ($validated['fee'] ?? null);
        $validated['sort_order'] = $validated['sort_order'] ?? $deliveryArea->sort_order;

        $deliveryArea->update($validated);

        return redirect()->back()->with('success', 'Delivery area updated.');
    }

    public function destroy(DeliveryArea $deliveryArea): RedirectResponse
    {
        $deliveryArea->delete();

        return redirect()->back()->with('success', 'Delivery area removed.');
    }
}
