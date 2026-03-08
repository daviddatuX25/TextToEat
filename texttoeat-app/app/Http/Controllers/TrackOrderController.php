<?php

namespace App\Http\Controllers;

use App\Chatbot\ChatbotOrderLookupService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrackOrderController extends Controller
{
    public function __construct(
        private ChatbotOrderLookupService $orderLookup
    ) {}

    public function show(Request $request): Response
    {
        $reference = $request->query('reference');
        $searchedReference = null;
        $order = null;

        $normalized = $reference !== null && $reference !== '' ? strtoupper(trim((string) $reference)) : '';
        if ($normalized !== '') {
            $searchedReference = $normalized;
            $found = $this->orderLookup->findByReference($normalized);
            if ($found) {
                $order = [
                    'reference' => $found->reference,
                    'status' => $found->status,
                    'delivery_type' => $found->delivery_type ?? 'pickup',
                    'status_copy' => $this->statusCopy($found->status, $found->delivery_type ?? 'pickup'),
                ];
            }
        }

        return Inertia::render('Track', [
            'order' => $order,
            'searched_reference' => $searchedReference,
        ]);
    }

    private function statusCopy(string $status, string $deliveryType): string
    {
        $isDelivery = $deliveryType === 'delivery';

        return match ($status) {
            'received' => 'Order received. Being prepared.',
            'confirmed' => 'Order confirmed. Preparing.',
            'ready' => $isDelivery ? 'Ready. Will be on the way soon.' : 'Ready for pickup.',
            'on_the_way' => 'On the way to you.',
            'completed' => 'Order complete. Thank you.',
            'cancelled' => 'Order cancelled.',
            default => 'Order received. Being prepared.',
        };
    }
}
