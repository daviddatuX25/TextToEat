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
            ->withCount(['inboundMessages as inbound_messages_count' => fn ($q) => $q->whereNull('conversation_id')])
            ->withCount(['outboundSms as outbound_sms_count' => fn ($q) => $q->whereNull('conversation_id')])
            ->withCount(['outboundMessenger as outbound_messenger_count' => fn ($q) => $q->whereNull('conversation_id')])
            ->filterForLogs($filters)
            ->recent()
            ->paginate(50)
            ->withQueryString();

        $sessions->getCollection()->transform(function (ChatbotSession $s) {
            $state = $s->state ?? [];
            $hasHumanInState = ($state['current_state'] ?? null) === 'human_takeover';
            $humanTakeoverCount = (int) ($s->human_takeover_count ?? 0);
            $inboundCount = (int) ($s->inbound_messages_count ?? 0);
            $outboundSmsCount = (int) ($s->outbound_sms_count ?? 0);
            $outboundMessengerCount = (int) ($s->outbound_messenger_count ?? 0);
            $messageCount = $inboundCount + $outboundSmsCount + $outboundMessengerCount;

            return [
                'id' => $s->id,
                'channel' => $s->channel,
                'external_id' => $s->external_id,
                'language' => $s->language,
                'saved_customer_name' => $s->saved_customer_name,
                'last_activity_at' => $s->last_activity_at?->toIso8601String(),
                'created_at' => $s->created_at?->toIso8601String(),
                'conversations_count' => $s->conversations_count ?? 0,
                'message_count' => $messageCount,
                'has_human_takeover' => $hasHumanInState || $humanTakeoverCount > 0,
            ];
        });

        $statusValues = ChatbotSession::query()
            ->select('state->current_state as value')
            ->distinct()
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

    public function show(ChatbotSession $session): Response
    {
        $state = $session->state ?? [];
        $hasHumanInState = ($state['current_state'] ?? null) === 'human_takeover';

        $inboundMessages = $session->inboundMessages()
            ->whereNull('conversation_id')
            ->orderBy('created_at')
            ->get();
        $outboundSms = $session->outboundSms()
            ->whereNull('conversation_id')
            ->orderBy('created_at')
            ->get();
        $outboundMessenger = $session->outboundMessenger()
            ->whereNull('conversation_id')
            ->orderBy('created_at')
            ->get();

        $messages = collect();

        foreach ($inboundMessages as $message) {
            $messages->push([
                'id' => 'inbound-' . $message->id,
                'direction' => 'inbound',
                'channel' => $message->channel ?? $session->channel,
                'body' => $message->body,
                'created_at' => $message->created_at?->toIso8601String(),
                'status' => null,
                'type' => 'inbound',
            ]);
        }

        foreach ($outboundSms as $sms) {
            $messages->push([
                'id' => 'sms-' . $sms->id,
                'direction' => 'outbound',
                'channel' => $sms->channel ?? 'sms',
                'body' => $sms->body,
                'created_at' => ($sms->sent_at ?? $sms->created_at)?->toIso8601String(),
                'status' => $sms->status,
                'type' => 'outbound_sms',
            ]);
        }

        foreach ($outboundMessenger as $om) {
            $messages->push([
                'id' => 'messenger-' . $om->id,
                'direction' => 'outbound',
                'channel' => 'messenger',
                'body' => $om->body,
                'created_at' => $om->created_at?->toIso8601String(),
                'status' => null,
                'type' => 'outbound_messenger',
            ]);
        }

        $messages = $messages
            ->sortBy('created_at')
            ->values();

        $humanTakeoverCount = (int) $session->conversations()
            ->where('status', 'human_takeover')
            ->count();

        $messageCount = $inboundMessages->count()
            + $outboundSms->count()
            + $outboundMessenger->count();

        $sessionData = [
            'id' => $session->id,
            'channel' => $session->channel,
            'external_id' => $session->external_id,
            'language' => $session->language,
            'saved_customer_name' => $session->saved_customer_name,
            'last_activity_at' => $session->last_activity_at?->toIso8601String(),
            'created_at' => $session->created_at?->toIso8601String(),
            'conversations_count' => $session->conversations()->count(),
            'message_count' => $messageCount,
            'has_human_takeover' => $hasHumanInState || $humanTakeoverCount > 0,
        ];

        return Inertia::render('ChatbotLogShow', [
            'session' => $sessionData,
            'messages' => $messages,
        ]);
    }
}
