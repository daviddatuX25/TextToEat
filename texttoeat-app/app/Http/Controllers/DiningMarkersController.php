<?php

namespace App\Http\Controllers;

use App\Models\DiningMarker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DiningMarkersController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'value' => ['required', 'string', 'max:' . DiningMarker::MAX_VALUE_LENGTH, 'unique:dining_markers,value'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        DiningMarker::create($validated);

        return redirect()->back()->with('success', 'Dining marker added.');
    }

    public function update(Request $request, DiningMarker $diningMarker): RedirectResponse
    {
        $validated = $request->validate([
            'value' => ['required', 'string', 'max:' . DiningMarker::MAX_VALUE_LENGTH, 'unique:dining_markers,value,' . $diningMarker->id],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $diningMarker->update($validated);

        return redirect()->back()->with('success', 'Dining marker updated.');
    }

    public function destroy(DiningMarker $diningMarker): RedirectResponse
    {
        $diningMarker->delete();

        return redirect()->back()->with('success', 'Dining marker removed.');
    }
}
