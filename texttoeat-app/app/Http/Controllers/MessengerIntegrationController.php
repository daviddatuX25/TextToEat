<?php

namespace App\Http\Controllers;

use App\Messenger\FacebookMessengerClient;
use App\Messenger\MessengerPayloads;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessengerIntegrationController extends Controller
{
    public function __construct(
        private FacebookMessengerClient $messengerClient
    ) {}

    /**
     * Show the Facebook Messenger integration page (admin).
     */
    public function index(): Response
    {
        $token = (string) config('facebook.page_access_token', '');
        $appUrl = rtrim((string) config('app.url', ''), '/');

        return Inertia::render('FacebookMessengerIntegration', [
            'token_configured' => $token !== '',
            'webhook_url' => $appUrl !== '' ? $appUrl . '/api/messenger/webhook' : '',
            'persistent_menu' => $this->getPersistentMenuItems(),
        ]);
    }

    /**
     * Set the persistent menu via Graph API (admin).
     */
    public function setPersistentMenu(Request $request): RedirectResponse
    {
        $token = (string) config('facebook.page_access_token', '');
        if ($token === '') {
            return redirect()->route('portal.facebook-messenger')
                ->with('error', 'FACEBOOK_PAGE_ACCESS_TOKEN is not set. Add it to .env.');
        }

        try {
            $menu = $this->getPersistentMenuItems();
            $this->messengerClient->setPersistentMenu($menu);

            return redirect()->route('portal.facebook-messenger')
                ->with('success', 'Persistent menu set successfully.');
        } catch (\Throwable $e) {
            return redirect()->route('portal.facebook-messenger')
                ->with('error', $e->getMessage() ?: 'Failed to set persistent menu.');
        }
    }

    /**
     * @return array<int, array{title: string, payload: string}>
     */
    private function getPersistentMenuItems(): array
    {
        return [
            ['title' => 'Home', 'payload' => MessengerPayloads::MAIN_HOME],
            ['title' => 'Track order', 'payload' => MessengerPayloads::MAIN_TRACK],
            ['title' => 'Talk to staff', 'payload' => MessengerPayloads::MAIN_SUPPORT],
        ];
    }
}
