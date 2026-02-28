<?php

namespace App\Http\Controllers;

use App\Models\ChatbotSession;
use App\Services\FacebookMessengerClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FacebookMessengerWebhookController extends Controller
{
    private FacebookMessengerClient $client;

    private ChatbotWebhookController $chatbot;

    public function __construct(FacebookMessengerClient $client, ChatbotWebhookController $chatbot)
    {
        $this->client = $client;
        $this->chatbot = $chatbot;
    }

    /**
     * @return Response|JsonResponse
     */
    public function verify(Request $request)
    {
        $mode = $request->query('hub_mode', $request->query('hub.mode'));
        $token = $request->query('hub_verify_token', $request->query('hub.verify_token'));
        $challenge = $request->query('hub_challenge', $request->query('hub.challenge'));

        if (! \is_string($mode) || ! \is_string($token) || ! \is_string($challenge)) {
            return response()->json(['error' => 'Missing verification parameters'], 400);
        }

        $expectedToken = (string) config('facebook.verify_token', '');
        if ($mode === 'subscribe' && $token === $expectedToken && $expectedToken !== '') {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        return response()->json(['error' => 'Invalid verification token'], 403);
    }

    public function handle(Request $request): JsonResponse
    {
        if (! $this->isValidSignature($request)) {
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $payload = $request->all();
        $entries = $payload['entry'] ?? [];
        if (! \is_array($entries)) {
            return response()->json(['status' => 'ignored']);
        }

        foreach ($entries as $entry) {
            if (! \is_array($entry) || ! isset($entry['messaging']) || ! \is_array($entry['messaging'])) {
                continue;
            }

            foreach ($entry['messaging'] as $event) {
                $this->handleMessagingEvent($event);
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * @param array<string, mixed> $event
     */
    private function handleMessagingEvent(array $event): void
    {
        if (! isset($event['sender']['id'])) {
            return;
        }

        if (isset($event['message']['is_echo']) && $event['message']['is_echo'] === true) {
            return;
        }

        $psid = (string) $event['sender']['id'];

        $text = null;
        if (isset($event['message']['quick_reply']['payload']) && \is_string($event['message']['quick_reply']['payload'])) {
            $text = $event['message']['quick_reply']['payload'];
        } elseif (isset($event['message']['text']) && \is_string($event['message']['text'])) {
            $text = $event['message']['text'];
        } elseif (isset($event['postback']['payload']) && \is_string($event['postback']['payload'])) {
            $text = $event['postback']['payload'];
        }

        if ($text === null || $text === '') {
            return;
        }

        $existingSession = ChatbotSession::where('channel', 'messenger')
            ->where('external_id', $psid)
            ->first();
        if ($existingSession !== null) {
            $state = $existingSession->state ?? [];
            if ((bool) ($state['automation_disabled'] ?? false) === true) {
                $existingSession->update(['last_activity_at' => now()]);

                return;
            }
        }

        $chatbotRequest = Request::create(
            '/api/chatbot/webhook',
            'POST',
            [
                'channel' => 'messenger',
                'external_id' => $psid,
                'body' => $text,
            ]
        );

        $response = $this->chatbot->webhook($chatbotRequest);
        $data = $response->getData(true);

        $replies = $data['replies'] ?? null;
        if (\is_array($replies) && $replies !== []) {
            foreach ($replies as $replyText) {
                if (\is_string($replyText) && $replyText !== '') {
                    $this->client->sendTextMessage($psid, $replyText);
                }
            }

            return;
        }

        $reply = $data['reply'] ?? null;
        if (\is_string($reply) && $reply !== '') {
            $this->client->sendTextMessage($psid, $reply);
        }
    }

    private function isValidSignature(Request $request): bool
    {
        $signatureHeader = $request->header('X-Hub-Signature-256');
        if (! \is_string($signatureHeader) || $signatureHeader === '') {
            return false;
        }

        $appSecret = (string) config('facebook.app_secret', '');
        if ($appSecret === '') {
            return false;
        }

        $rawBody = $request->getContent();
        $expected = 'sha256=' . hash_hmac('sha256', $rawBody, $appSecret);

        return hash_equals($expected, $signatureHeader);
    }
}

