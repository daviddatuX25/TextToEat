<?php

namespace App\Http\Controllers;

use App\Models\ChatbotSession;
use App\Services\OutboundSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TextbeeSmsWebhookController extends Controller
{
    private OutboundSmsService $outboundSmsService;

    private ChatbotWebhookController $chatbot;

    public function __construct(OutboundSmsService $outboundSmsService, ChatbotWebhookController $chatbot)
    {
        $this->outboundSmsService = $outboundSmsService;
        $this->chatbot = $chatbot;
    }

    public function handle(Request $request): JsonResponse
    {
        if ($this->hasWebhookSecret() && ! $this->isValidSignature($request)) {
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $validated = $request->validate([
            'from' => ['required', 'string'],
            'message' => ['required', 'string'],
            'message_id' => ['nullable', 'string'],
            'timestamp' => ['nullable', 'string'],
        ]);

        $normalizedPhone = $this->normalizePhone($validated['from']);
        $body = $validated['message'];

        $existingSession = ChatbotSession::where('channel', 'sms')
            ->where('external_id', $normalizedPhone)
            ->first();
        if ($existingSession !== null) {
            $state = $existingSession->state ?? [];
            if ((bool) ($state['automation_disabled'] ?? false) === true) {
                $existingSession->update(['last_activity_at' => now()]);

                return response()->json([
                    'success' => true,
                    'skipped' => 'automation_disabled',
                    'message_id' => $validated['message_id'] ?? null,
                ]);
            }
        }

        $chatbotRequest = Request::create(
            '/api/chatbot/webhook',
            'POST',
            [
                'channel' => 'sms',
                'external_id' => $normalizedPhone,
                'body' => $body,
            ]
        );

        $response = $this->chatbot->webhook($chatbotRequest);
        $data = $response->getData(true);

        $sessionId = $existingSession?->id
            ?? ChatbotSession::where('channel', 'sms')->where('external_id', $normalizedPhone)->value('id');

        $replies = $data['replies'] ?? null;
        if (\is_array($replies) && $replies !== []) {
            foreach ($replies as $replyText) {
                if (\is_string($replyText) && $replyText !== '') {
                    $this->outboundSmsService->enqueueAndSendFcm($normalizedPhone, $replyText, 'sms', $sessionId);
                }
            }
        } else {
            $reply = $data['reply'] ?? null;
            if (\is_string($reply) && $reply !== '') {
                $this->outboundSmsService->enqueueAndSendFcm($normalizedPhone, $reply, 'sms', $sessionId);
            }
        }

        return response()->json([
            'success' => true,
            'message_id' => $validated['message_id'] ?? null,
        ]);
    }

    /**
     * Normalize phone to canonical form (e.g. 09123456789).
     * Accepts +639123456789, 09123456789, 9123456789.
     */
    private function normalizePhone(string $value): string
    {
        $digits = (string) preg_replace('/\D/', '', $value);
        if ($digits === '') {
            return $value;
        }
        // Philippine: strip country code 63 if present
        if (strlen($digits) === 12 && str_starts_with($digits, '63')) {
            $digits = substr($digits, 2);
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
            return '0' . $digits;
        }
        if (! str_starts_with($digits, '0')) {
            return '0' . $digits;
        }

        return $digits;
    }

    private function hasWebhookSecret(): bool
    {
        return (string) config('textbee.webhook_secret', '') !== '';
    }

    private function isValidSignature(Request $request): bool
    {
        $signatureHeader = $request->header('X-Signature');
        if (! \is_string($signatureHeader) || $signatureHeader === '') {
            return false;
        }

        $secret = (string) config('textbee.webhook_secret', '');
        if ($secret === '') {
            return false;
        }

        $rawBody = $request->getContent();
        $expected = 'sha256=' . hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expected, $signatureHeader);
    }
}
