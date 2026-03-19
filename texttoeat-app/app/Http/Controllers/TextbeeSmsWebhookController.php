<?php

namespace App\Http\Controllers;

use App\Contracts\SmsSenderInterface;
use App\Events\ConversationUpdated;
use App\Models\ChatbotSession;
use App\Models\InboundMessage;
use App\Models\Setting;
use App\Services\ChatbotSmsNumberLayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TextbeeSmsWebhookController extends Controller
{
    public function __construct(
        private SmsSenderInterface $smsSender,
        private ChatbotWebhookController $chatbot,
        private ChatbotSmsNumberLayer $smsNumberLayer
    ) {}

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
        $messageId = $validated['message_id'] ?? null;

        // Idempotency: avoid processing the same incoming message twice (gateway retries / duplicate delivery).
        // Real SMS gateways often retry or send duplicate webhooks; without this we send the same reply batch twice.
        $idempotencyKey = ($messageId !== null && $messageId !== '') ? 'sms_webhook_seen:' . $messageId : null;
        if ($idempotencyKey !== null && ! Cache::add($idempotencyKey, true, 600)) {
            return response()->json([
                'success' => true,
                'message_id' => $messageId,
                'duplicate' => true,
            ]);
        }

        try {
            $existingSession = ChatbotSession::where('channel', 'sms')
                ->where('external_id', $normalizedPhone)
                ->first();
            if ($existingSession !== null) {
                $state = $existingSession->state ?? [];
                if ((bool) ($state['automation_disabled'] ?? false) === true) {
                    $existingSession->update(['last_activity_at' => now()]);
                    $conversation = $existingSession->getOrCreateLatestHumanConversation();
                    InboundMessage::create([
                        'chatbot_session_id' => $existingSession->id,
                        'conversation_id' => $conversation->id,
                        'body' => $body,
                        'channel' => 'sms',
                    ]);
                    event(new ConversationUpdated($existingSession, 'message'));

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
            if (! \is_array($replies) || $replies === []) {
                $reply = $data['reply'] ?? null;
                $replies = \is_string($reply) && $reply !== '' ? [$reply] : [];
            }

            // Dedupe consecutive identical segments so we never send the same SMS twice in one batch.
            $replies = $this->dedupeConsecutiveReplies($replies);

            $anySendFailed = false;
            foreach ($replies as $replyText) {
                if (! \is_string($replyText) || $replyText === '') {
                    continue;
                }
                $sendResult = $this->smsSender->send($normalizedPhone, $replyText, 'sms', $sessionId);
                if (! ($sendResult['success'] ?? true)) {
                    $anySendFailed = true;
                    Log::warning('TextbeeSmsWebhook: send failed for reply segment', [
                        'to' => $normalizedPhone,
                        'message_id' => $messageId,
                        'reason' => $sendResult['message'] ?? 'unknown',
                    ]);
                }
            }

            if ($anySendFailed && $idempotencyKey !== null) {
                Cache::forget($idempotencyKey);
                Log::info('TextbeeSmsWebhook: forgot idempotency key after send failure so gateway can retry', ['message_id' => $messageId]);

                return response()->json([
                    'success' => false,
                    'message_id' => $messageId,
                    'retry' => true,
                ], 503);
            }

            return response()->json([
                'success' => true,
                'message_id' => $messageId,
            ]);
        } catch (\Throwable $e) {
            if ($idempotencyKey !== null) {
                Cache::forget($idempotencyKey);
                Log::info('TextbeeSmsWebhook: forgot idempotency key after exception so gateway retry can process', [
                    'message_id' => $messageId,
                    'exception' => $e->getMessage(),
                ]);
            }
            Log::error('TextbeeSmsWebhook: exception while processing inbound SMS', [
                'from' => $normalizedPhone,
                'message_id' => $messageId,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Remove consecutive duplicate reply segments so the same message is not sent twice in one batch.
     *
     * @param  array<int, string>  $replies
     * @return array<int, string>
     */
    private function dedupeConsecutiveReplies(array $replies): array
    {
        $out = [];
        $prev = null;
        foreach ($replies as $replyText) {
            $trimmed = \is_string($replyText) ? trim($replyText) : '';
            if ($trimmed !== '' && $trimmed !== $prev) {
                $out[] = $replyText;
                $prev = $trimmed;
            }
        }

        return $out;
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
        $secret = Setting::get('textbee.webhook_secret');
        $secret = is_string($secret) ? $secret : (string) config('textbee.webhook_secret', '');

        return $secret !== '';
    }

    private function isValidSignature(Request $request): bool
    {
        $signatureHeader = $request->header('X-Signature');
        if (! \is_string($signatureHeader) || $signatureHeader === '') {
            return false;
        }

        $secret = Setting::get('textbee.webhook_secret');
        $secret = is_string($secret) ? $secret : (string) config('textbee.webhook_secret', '');
        if ($secret === '') {
            return false;
        }

        $rawBody = $request->getContent();
        $expected = 'sha256=' . hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expected, $signatureHeader);
    }
}
