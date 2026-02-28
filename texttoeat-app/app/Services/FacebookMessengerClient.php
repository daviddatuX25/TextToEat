<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FacebookMessengerClient
{
    private string $pageAccessToken;

    private string $graphBaseUrl;

    private string $graphVersion;

    public function __construct()
    {
        $this->pageAccessToken = (string) config('facebook.page_access_token', '');
        $this->graphBaseUrl = (string) config('facebook.graph_base_url', 'https://graph.facebook.com');
        $this->graphVersion = (string) config('facebook.graph_version', 'v18.0');
    }

    public function sendTextMessage(string $recipientId, string $text): void
    {
        if ($this->pageAccessToken === '') {
            return;
        }

        $endpoint = sprintf(
            '%s/%s/me/messages',
            rtrim($this->graphBaseUrl, '/'),
            trim($this->graphVersion, '/')
        );

        Http::withToken($this->pageAccessToken)
            ->acceptJson()
            ->post($endpoint, [
                'recipient' => ['id' => $recipientId],
                'message' => ['text' => $text],
            ])
            ->throw();
    }
}

