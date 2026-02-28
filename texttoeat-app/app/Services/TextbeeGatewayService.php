<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TextbeeGatewayService
{
    private string $baseUrl;

    private const SMS_CHAR_LIMIT = 160;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('textbee.api_url', ''), '/');
    }

    /**
     * Send SMS via Textbee API. Splits messages longer than 160 chars into multiple SMS.
     *
     * @return array{success: bool, message?: string}
     */
    public function sendSms(string $phoneNumber, string $message): array
    {
        if ($this->baseUrl === '') {
            Log::debug('TextbeeGatewayService: api_url not configured, skipping send');

            return ['success' => false, 'message' => 'Textbee API URL not configured'];
        }

        $segments = $this->splitMessage($message);

        foreach ($segments as $segment) {
            $result = $this->sendSingleSms($phoneNumber, $segment);
            if (! $result['success']) {
                return $result;
            }
        }

        return ['success' => true];
    }

    /**
     * @return array{success: bool, message?: string}
     */
    private function sendSingleSms(string $phoneNumber, string $text): array
    {
        $endpoint = $this->baseUrl . '/send';

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->post($endpoint, [
                    'to' => $phoneNumber,
                    'message' => $text,
                ]);

            if (! $response->successful()) {
                Log::warning('TextbeeGatewayService send failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'phone' => $phoneNumber,
                ]);

                return [
                    'success' => false,
                    'message' => 'Textbee API error: ' . $response->status(),
                ];
            }

            return ['success' => true];
        } catch (\Throwable $e) {
            Log::error('TextbeeGatewayService exception', [
                'message' => $e->getMessage(),
                'phone' => $phoneNumber,
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Split message into segments of max 160 characters (GSM 7-bit segment size).
     *
     * @return list<string>
     */
    private function splitMessage(string $message): array
    {
        if ($message === '') {
            return [];
        }

        $segments = [];
        $remaining = $message;

        while ($remaining !== '') {
            if (mb_strlen($remaining) <= self::SMS_CHAR_LIMIT) {
                $segments[] = $remaining;
                break;
            }
            $segments[] = mb_substr($remaining, 0, self::SMS_CHAR_LIMIT);
            $remaining = mb_substr($remaining, self::SMS_CHAR_LIMIT);
        }

        return $segments;
    }

    /**
     * Check if the gateway is reachable. Returns true when api_url is not set (no-op).
     */
    public function getGatewayStatus(): bool
    {
        if ($this->baseUrl === '') {
            return true;
        }

        try {
            $response = Http::timeout(5)->get($this->baseUrl . '/status');

            return $response->successful();
        } catch (\Throwable $e) {
            Log::debug('TextbeeGatewayService status check failed', ['message' => $e->getMessage()]);

            return false;
        }
    }
}
