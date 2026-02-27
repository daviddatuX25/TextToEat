<?php

namespace App\Http\Controllers;

use App\Models\ChatbotSession;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ChatbotLogsController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'customer' => ['nullable', 'string'],
            'status' => ['nullable', 'array'],
            'status.*' => ['string'],
            'channel' => ['nullable', 'array'],
            'channel.*' => ['string'],
            'has_human_takeover' => ['nullable', 'boolean'],
        ]);

        $sessions = ChatbotSession::query()
            ->withCount('conversations')
            ->withCount([
                'conversations as human_takeover_count' => function ($query): void {
                    $query->where('status', 'human_takeover');
                },
            ])
            ->filterForLogs($filters)
            ->recent()
            ->paginate(50)
            ->withQueryString();

        $sessions->getCollection()->transform(function (ChatbotSession $s) {
            $state = $s->state ?? [];
            $hasHumanInState = ($state['current_state'] ?? null) === 'human_takeover';
            $humanTakeoverCount = (int) ($s->human_takeover_count ?? 0);

            return [
                'id' => $s->id,
                'channel' => $s->channel,
                'external_id' => $s->external_id,
                'language' => $s->language,
                'saved_customer_name' => $s->saved_customer_name,
                'last_activity_at' => $s->last_activity_at?->toIso8601String(),
                'created_at' => $s->created_at?->toIso8601String(),
                'conversations_count' => $s->conversations_count ?? 0,
                'has_human_takeover' => $hasHumanInState || $humanTakeoverCount > 0,
            ];
        });

        $statusValues = ChatbotSession::query()
            ->selectRaw("distinct state->>'current_state' as value")
            ->pluck('value')
            ->filter()
            ->values();

        $statusOptions = $statusValues->map(function (string $value): array {
            return [
                'value' => $value,
                'label' => Str::headline(str_replace('_', ' ', $value)),
            ];
        })->values();

        $channelValues = ChatbotSession::query()
            ->whereNotNull('channel')
            ->distinct()
            ->pluck('channel')
            ->filter()
            ->values();

        $channelOptions = $channelValues->map(function (string $value): array {
            return [
                'value' => $value,
                'label' => Str::headline(str_replace('_', ' ', $value)),
            ];
        })->values();

        return Inertia::render('ChatbotLogs', [
            'sessions' => $sessions,
            'filters' => [
                'date_from' => $filters['date_from'] ?? null,
                'date_to' => $filters['date_to'] ?? null,
                'customer' => $filters['customer'] ?? null,
                'status' => $filters['status'] ?? [],
                'channel' => $filters['channel'] ?? [],
                'has_human_takeover' => $filters['has_human_takeover'] ?? null,
            ],
            'meta' => [
                'statusOptions' => $statusOptions,
                'channelOptions' => $channelOptions,
            ],
        ]);
    }
}
