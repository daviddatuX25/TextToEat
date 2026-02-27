<?php

namespace App\Http\Controllers;

use App\Models\ChatbotSession;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatbotLogsController extends Controller
{
    public function index(Request $request): Response
    {
        $sessions = ChatbotSession::query()
            ->withCount('conversations')
            ->orderByDesc('last_activity_at')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(function (ChatbotSession $s) {
                return [
                    'id' => $s->id,
                    'channel' => $s->channel,
                    'external_id' => $s->external_id,
                    'language' => $s->language,
                    'conversations_count' => $s->conversations_count ?? 0,
                    'last_activity_at' => $s->last_activity_at?->toIso8601String(),
                    'created_at' => $s->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('ChatbotLogs', [
            'sessions' => $sessions,
        ]);
    }
}
