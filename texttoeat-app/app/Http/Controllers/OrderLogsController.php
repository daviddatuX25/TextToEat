<?php

namespace App\Http\Controllers;

use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\ActionLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderLogsController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'customer' => ['nullable', 'string', 'max:255'],
            'order_reference' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'array'],
            'status.*' => ['string', Rule::in(array_map(
                static fn (OrderStatus $status): string => $status->value,
                OrderStatus::cases()
            ))],
            'channel' => ['nullable', 'array'],
            'channel.*' => ['string', Rule::in(array_map(
                static fn (OrderChannel $channel): string => $channel->value,
                OrderChannel::cases()
            ))],
            'staff_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $filters = [
            'date_from' => $validated['date_from'] ?? null,
            'date_to' => $validated['date_to'] ?? null,
            'customer' => $validated['customer'] ?? null,
            'order_reference' => $validated['order_reference'] ?? null,
            'status' => $validated['status'] ?? [],
            'channel' => $validated['channel'] ?? [],
            'staff_id' => $validated['staff_id'] ?? null,
        ];

        $logs = ActionLog::query()
            ->forOrders()
            ->with([
                'user:id,name',
                'order:id,reference,status,channel,customer_name,customer_phone',
            ])
            ->filterForLogs($filters)
            ->orderByDesc('created_at')
            ->paginate(50)
            ->withQueryString()
            ->through(function (ActionLog $log): array {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'created_at' => $log->created_at?->toIso8601String(),
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->displayName(),
                    ] : null,
                    'order' => $log->order ? [
                        'id' => $log->order->id,
                        'reference' => $log->order->reference,
                        'status' => $log->order->status,
                        'channel' => $log->order->channel,
                        'customer_name' => $log->order->customer_name,
                        'customer_phone' => $log->order->customer_phone,
                    ] : null,
                ];
            });

        $statusOptions = array_map(
            static function (OrderStatus $status): array {
                $value = $status->value;

                return [
                    'value' => $value,
                    'label' => ucfirst(str_replace('_', ' ', $value)),
                ];
            },
            OrderStatus::cases()
        );

        $channelOptions = array_map(
            static function (OrderChannel $channel): array {
                $value = $channel->value;

                return [
                    'value' => $value,
                    'label' => ucfirst(str_replace('_', ' ', $value)),
                ];
            },
            OrderChannel::cases()
        );

        $staffOptions = User::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(
                static fn (User $user): array => [
                    'value' => $user->id,
                    'label' => $user->name,
                ]
            )
            ->values()
            ->all();

        return Inertia::render('OrderLogs', [
            'logs' => $logs,
            'filters' => $filters,
            'meta' => [
                'statusOptions' => $statusOptions,
                'channelOptions' => $channelOptions,
                'staffOptions' => $staffOptions,
            ],
        ]);
    }
}
