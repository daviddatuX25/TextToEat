<?php

namespace App\Http\Controllers;

use App\Models\ActionLog;
use App\Models\ChatbotSession;
use App\Contracts\MessengerSenderInterface;
use App\Contracts\SmsSenderInterface;
use App\Models\OutboundSms;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ConversationInboxController extends Controller
{
    public function __construct(
        private SmsSenderInterface $smsSender,
        private MessengerSenderInterface $messengerSender
    ) {}

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'customer' => ['nullable', 'string'],
            'status' => ['nullable', 'array'],
            'status.*' => ['string'],
            'channel' => ['nullable', 'array'],
            'channel.*' => ['string'],
            'has_human_takeover' => ['nullable', 'boolean'],
        ]);

        $filters = [
            'date_from' => $validated['date_from'] ?? null,
            'date_to' => $validated['date_to'] ?? null,
            'customer' => $validated['customer'] ?? null,
            'status' => $validated['status'] ?? [],
            'channel' => $validated['channel'] ?? [],
            'has_human_takeover' => array_key_exists('has_human_takeover', $validated)
                ? $validated['has_human_takeover']
                : true,
        ];

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

        $smsSessionIds = $sessions->getCollection()
            ->filter(fn ($s) => ($s->channel ?? '') === 'sms')
            ->pluck('id')
            ->values()
            ->all();

        $smsSummaries = [];
        if ($smsSessionIds !== []) {
            $rows = OutboundSms::query()
                ->whereIn('chatbot_session_id', $smsSessionIds)
                ->get(['chatbot_session_id', 'status', 'sent_at']);
            foreach ($rows->groupBy('chatbot_session_id') as $sessionId => $items) {
                $smsSummaries[(int) $sessionId] = [
                    'pending_count' => $items->where('status', 'pending')->count(),
                    'sent_count' => $items->where('status', 'sent')->count(),
                    'failed_count' => $items->where('status', 'failed')->count(),
                    'last_sent_at' => $items->whereNotNull('sent_at')->max('sent_at')?->toIso8601String(),
                ];
            }
        }

        $sessions->getCollection()->transform(function (ChatbotSession $s) use ($smsSummaries) {
            $state = $s->state ?? [];
            $hasHumanInState = ($state['current_state'] ?? null) === 'human_takeover';
            $humanTakeoverCount = (int) ($s->human_takeover_count ?? 0);
            $sessionId = $s->id;
            $smsSummary = $s->channel === 'sms' ? ($smsSummaries[$sessionId] ?? null) : null;
            $automationDisabled = (bool) ($state['automation_disabled'] ?? false);
            $currentState = $state['current_state'] ?? null;

            $mode = 'bot';
            if ($automationDisabled) {
                $mode = 'staff_only';
            } elseif ($currentState === 'human_takeover') {
                $mode = 'takeover';
            }

            return [
                'id' => $s->id,
                'channel' => $s->channel,
                'external_id' => $s->external_id,
                'language' => $s->language,
                'saved_customer_name' => $s->saved_customer_name,
                'last_activity_at' => $s->last_activity_at?->toIso8601String(),
                'created_at' => $s->created_at?->toIso8601String(),
                'current_state' => $currentState,
                'conversations_count' => $s->conversations_count ?? 0,
                'has_human_takeover' => $hasHumanInState || $humanTakeoverCount > 0,
                'automation_disabled' => $automationDisabled,
                'mode' => $mode,
                'sms_summary' => $smsSummary,
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

        return Inertia::render('ConversationInbox', [
            'sessions' => $sessions,
            'filters' => $filters,
            'meta' => [
                'statusOptions' => $statusOptions,
                'channelOptions' => $channelOptions,
                'takeoverTimeoutMinutes' => (int) config('chatbot.takeover_timeout_minutes', 60),
            ],
        ]);
    }

    public function show(ChatbotSession $session): Response
    {
        if (! \in_array((string) $session->channel, ['sms', 'messenger'], true)) {
            abort(404);
        }

        $state = $session->state ?? [];
        $automationDisabled = (bool) ($state['automation_disabled'] ?? false);
        $currentState = $state['current_state'] ?? null;
        $mode = $automationDisabled ? 'staff_only' : ($currentState === 'human_takeover' ? 'takeover' : 'bot');

        $outbound = [];
        if ($session->channel === 'sms') {
            $outbound = OutboundSms::query()
                ->where('chatbot_session_id', $session->id)
                ->orderByDesc('created_at')
                ->limit(25)
                ->get()
                ->map(fn (OutboundSms $o): array => [
                    'id' => $o->id,
                    'to' => $o->to,
                    'body' => $o->body,
                    'status' => $o->status,
                    'sent_at' => $o->sent_at?->toIso8601String(),
                    'failure_reason' => $o->failure_reason,
                    'created_at' => $o->created_at?->toIso8601String(),
                ])
                ->values()
                ->all();
        }

        return Inertia::render('ConversationInboxShow', [
            'session' => [
                'id' => $session->id,
                'channel' => $session->channel,
                'external_id' => $session->external_id,
                'language' => $session->language,
                'saved_customer_name' => $session->saved_customer_name,
                'last_activity_at' => $session->last_activity_at?->toIso8601String(),
                'created_at' => $session->created_at?->toIso8601String(),
                'current_state' => $currentState,
                'automation_disabled' => $automationDisabled,
                'mode' => $mode,
            ],
            'outbound_sms' => $outbound,
            'meta' => [
                'takeoverTimeoutMinutes' => (int) config('chatbot.takeover_timeout_minutes', 60),
            ],
        ]);
    }

    public function reply(Request $request, ChatbotSession $session): RedirectResponse
    {
        if (! \in_array((string) $session->channel, ['sms', 'messenger'], true)) {
            abort(404);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $message = trim((string) $validated['message']);
        if ($message === '') {
            return redirect()->back()->with('error', 'Message cannot be empty.');
        }

        try {
            if ($session->channel === 'sms') {
                $result = $this->smsSender->send($session->external_id, $message, 'sms', $session->id);
                if (! ($result['success'] ?? false)) {
                    return redirect()->back()->with('error', $result['message'] ?? 'Failed to send SMS.');
                }
            } else {
                $this->messengerSender->send($session->external_id, $message);
            }

            $session->update(['last_activity_at' => now()]);

            return redirect()->back()->with('success', 'Message sent.');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: 'Failed to send message.');
        }
    }

    public function automation(Request $request, ChatbotSession $session): RedirectResponse
    {
        if (! \in_array((string) $session->channel, ['sms', 'messenger'], true)) {
            abort(404);
        }

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $enabled = (bool) $validated['enabled'];
        $state = $session->state ?? [];
        $previousAutomationDisabled = (bool) ($state['automation_disabled'] ?? false);
        $state['automation_disabled'] = ! $enabled;
        $session->state = $state;
        $session->last_activity_at = now();
        $session->save();

        $action = $enabled ? 'takeover_automation_enabled' : 'takeover_automation_disabled';
        ActionLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'model' => 'ChatbotSession',
            'model_id' => $session->id,
            'payload' => [
                'session_id' => $session->id,
                'channel' => $session->channel,
                'external_id' => $session->external_id,
                'enabled' => $enabled,
                'previous_automation_disabled' => $previousAutomationDisabled,
            ],
        ]);
        Log::info("Takeover: {$action}", ['session_id' => $session->id, 'channel' => $session->channel, 'user_id' => $request->user()?->id]);

        return redirect()->back()->with('success', $enabled ? 'Automated responses enabled.' : 'Automated responses disabled.');
    }

    public function resolve(Request $request, ChatbotSession $session): RedirectResponse
    {
        if (! \in_array((string) $session->channel, ['sms', 'messenger'], true)) {
            abort(404);
        }

        $state = $session->state ?? [];
        $previousState = $state['current_state'] ?? null;
        $state['current_state'] = 'main_menu';
        $state['automation_disabled'] = false;
        $session->state = $state;
        $session->last_activity_at = now();
        $session->save();

        ActionLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'takeover_resolved',
            'model' => 'ChatbotSession',
            'model_id' => $session->id,
            'payload' => [
                'session_id' => $session->id,
                'channel' => $session->channel,
                'external_id' => $session->external_id,
                'previous_state' => $previousState,
                'new_state' => 'main_menu',
            ],
        ]);
        Log::info('Takeover: takeover_resolved', ['session_id' => $session->id, 'channel' => $session->channel, 'user_id' => $request->user()?->id]);

        return redirect()->route('portal.inbox')->with('success', 'Marked solved. Bot mode restored.');
    }
}
