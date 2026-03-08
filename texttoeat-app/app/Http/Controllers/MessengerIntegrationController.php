<?php

namespace App\Http\Controllers;

use App\Messenger\FacebookMessengerClient;
use App\Messenger\MessengerPayloads;
use App\Models\Setting;
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
        $token = Setting::get('facebook.page_access_token');
        $token = is_string($token) ? $token : (string) config('facebook.page_access_token', '');
        $appUrl = rtrim((string) config('app.url', ''), '/');

        return Inertia::render('FacebookMessengerIntegration', [
            'token_configured' => $token !== '',
            'webhook_url' => $appUrl !== '' ? $appUrl . '/api/messenger/webhook' : '',
            'persistent_menu' => $this->getPersistentMenuItems(),
            'credentials_configured' => [
                'app_id' => Setting::has('facebook.app_id'),
                'app_secret' => Setting::has('facebook.app_secret'),
                'verify_token' => Setting::has('facebook.verify_token'),
                'page_access_token' => Setting::has('facebook.page_access_token'),
            ],
        ]);
    }

    /**
     * Update Facebook credentials (store encrypted in settings). Audit logged.
     */
    public function updateCredentials(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_id' => ['nullable', 'string', 'max:255'],
            'app_secret' => ['nullable', 'string', 'max:255'],
            'verify_token' => ['nullable', 'string', 'max:255'],
            'page_access_token' => ['nullable', 'string', 'max:2000'],
        ]);

        $userId = $request->user()?->id;
        foreach ($validated as $key => $value) {
            $settingKey = 'facebook.' . $key;
            $value = trim((string) $value);
            if ($value !== '') {
                Setting::set($settingKey, $value, $userId);
            }
        }

        return redirect()->route('portal.facebook-messenger')
            ->with('success', 'Facebook credentials updated.');
    }

    /**
     * Set the persistent menu via Graph API (admin).
     */
    public function setPersistentMenu(Request $request): RedirectResponse
    {
        $token = Setting::get('facebook.page_access_token');
        $token = is_string($token) ? $token : (string) config('facebook.page_access_token', '');
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
