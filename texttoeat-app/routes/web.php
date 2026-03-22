<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatbotLogsController;
use App\Http\Controllers\ChatbotRepliesController;
use App\Http\Controllers\ChatbotWebhookController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ConversationInboxController;
use App\Http\Controllers\CustomerMenuController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveriesController;
use App\Http\Controllers\DeliveryAreasController;
use App\Http\Controllers\DiningMarkersController;
use App\Http\Controllers\DismissDailyGreetingController;
use App\Http\Controllers\MenuItemsController;
use App\Http\Controllers\MenuSettingsController;
use App\Http\Controllers\MessengerIntegrationController;
use App\Http\Controllers\OrderLogsController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\PickupController;
use App\Http\Controllers\PickupSlotsController;
use App\Http\Controllers\PortalNavBadgesController;
use App\Http\Controllers\QuickOrdersController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SmsDevicesController;
use App\Http\Controllers\TrackOrderController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\WalkinController;
use App\Models\Setting;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::get('/login', [LoginController::class, 'create'])->name('login')->middleware('guest');
Route::post('/login', [LoginController::class, 'store'])->middleware('guest');
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth');

Route::get('/web-unavailable', fn () => Inertia::render('WebOrderingUnavailable'))->name('web-unavailable');
Route::get('/menu', [CustomerMenuController::class, 'index'])->name('menu');
Route::post('/cart/add', [CustomerMenuController::class, 'addToCart']);
Route::post('/cart/update', [CustomerMenuController::class, 'updateCart']);
Route::post('/cart/remove', [CustomerMenuController::class, 'removeFromCart']);

Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout');
Route::post('/checkout', [CheckoutController::class, 'store']);
Route::get('/order-confirmation/{reference}', [CheckoutController::class, 'confirmation'])->name('order.confirmation');

Route::get('/track', [TrackOrderController::class, 'show']);

Route::get('/about', function () {
    return Inertia::render('About');
})->name('about');

Route::middleware(['auth', 'admin'])->get('/api/chatbot/outbound-messages', [ChatbotWebhookController::class, 'outboundMessages']);

// Redirect old staff URLs to /portal/* (301)
Route::get('/dashboard', fn () => redirect('/portal', 301));
Route::get('/dashboard/orders', fn () => redirect('/portal/orders', 301));
Route::get('/dashboard/deliveries', fn () => redirect('/portal/deliveries', 301));
Route::get('/dashboard/pickup', fn () => redirect('/portal/pickup', 301));
Route::get('/dashboard/walkin', fn () => redirect('/portal/walkin', 301));
Route::get('/dashboard/menu-items', fn () => redirect('/portal/menu-items', 301));
Route::get('/orders', fn () => redirect('/portal/orders', 301));
Route::get('/deliveries', fn () => redirect('/portal/deliveries', 301));
Route::get('/pickup', fn () => redirect('/portal/pickup', 301));
Route::get('/menu-items', fn () => redirect('/portal/menu-items', 301));
Route::get('/delivery-areas', fn () => redirect('/portal/deliveries', 302));

Route::prefix('portal')->middleware('auth')->group(function () {
    Route::post('/dismiss-daily-greeting', DismissDailyGreetingController::class)->name('portal.dismiss-daily-greeting');
    Route::get('/nav-badges', PortalNavBadgesController::class)->name('portal.nav-badges');
    Route::get('/', [DashboardController::class, 'index'])->name('portal.dashboard');
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('portal.analytics')->middleware('admin');
    Route::get('/orders', [OrdersController::class, 'index'])->name('portal.orders');
    Route::get('/orders/completed', [OrdersController::class, 'completedIndex'])->name('portal.orders.completed');
    Route::get('/deliveries', [DeliveriesController::class, 'index'])->name('portal.deliveries');
    Route::get('/pickup', [PickupController::class, 'index'])->name('portal.pickup');
    Route::get('/walkin', [WalkinController::class, 'index'])->name('portal.walkin');
    Route::get('/categories', [CategoryController::class, 'index'])->name('portal.categories')->middleware('admin');
    Route::post('/categories', [CategoryController::class, 'store'])->middleware('admin');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->middleware('admin');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->middleware('admin');
    Route::get('/menu-items', [MenuItemsController::class, 'index'])->name('portal.menu-items');
    Route::get('/menu-settings', [MenuSettingsController::class, 'index'])->name('portal.menu-settings')->middleware('admin');
    Route::patch('/menu-settings', [MenuSettingsController::class, 'update'])->name('portal.menu-settings.update')->middleware('admin');
    Route::get('/menu-settings/preview-reset-cancellations', [MenuSettingsController::class, 'previewResetCancellations'])->name('portal.menu-settings.preview-reset-cancellations')->middleware('admin');
    Route::post('/menu-settings/run-reset', [MenuSettingsController::class, 'runReset'])->name('portal.menu-settings.run-reset')->middleware('admin');
    Route::get('/logs/orders', [OrderLogsController::class, 'index'])->name('portal.logs.orders');
    Route::get('/logs/chatbot', [ChatbotLogsController::class, 'index'])->name('portal.logs.chatbot');
    Route::get('/logs/chatbot/{session}', [ChatbotLogsController::class, 'show'])->name('portal.logs.chatbot.show');
    Route::get('/inbox', [ConversationInboxController::class, 'index'])->name('portal.inbox');
    Route::get('/inbox/{session}', [ConversationInboxController::class, 'show'])->name('portal.inbox.show');
    Route::get('/settings', [SettingsController::class, 'index'])->name('portal.settings')->middleware('admin');
    Route::patch('/settings', [SettingsController::class, 'update'])->name('portal.settings.update')->middleware('admin');
    Route::get('/facebook-messenger', [MessengerIntegrationController::class, 'index'])->name('portal.facebook-messenger')->middleware('admin');
    Route::put('/facebook-messenger/credentials', [MessengerIntegrationController::class, 'updateCredentials'])->name('portal.facebook-messenger.update-credentials')->middleware('admin');
    Route::post('/facebook-messenger/set-persistent-menu', [MessengerIntegrationController::class, 'setPersistentMenu'])->name('portal.facebook-messenger.set-persistent-menu')->middleware('admin');
    Route::get('/chatbot-replies', [ChatbotRepliesController::class, 'index'])->name('portal.chatbot-replies')->middleware('admin');
    Route::post('/chatbot-replies', [ChatbotRepliesController::class, 'store'])->name('portal.chatbot-replies.store')->middleware('admin');
    Route::delete('/chatbot-replies', [ChatbotRepliesController::class, 'destroy'])->name('portal.chatbot-replies.destroy')->middleware('admin');
    Route::get('/sms-devices', [SmsDevicesController::class, 'index'])->name('portal.sms-devices')->middleware('admin');
    Route::get('/sms-devices/inbound-webhook-skipped', [SmsDevicesController::class, 'inboundWebhookSkipped'])->name('portal.sms-devices.inbound-webhook-skipped')->middleware('admin');
    Route::get('/sms-devices/{deviceId}/logs', [SmsDevicesController::class, 'logs'])->name('portal.sms-devices.logs')->middleware('admin');
    Route::put('/sms-devices/credentials', [SmsDevicesController::class, 'updateCredentials'])->name('portal.sms-devices.update-credentials')->middleware('admin');
    Route::post('/sms-devices/{deviceId}/heartbeat', [SmsDevicesController::class, 'heartbeat'])->name('portal.sms-devices.heartbeat')->middleware('admin');
    Route::patch('/sms-devices/{deviceId}', [SmsDevicesController::class, 'update'])->name('portal.sms-devices.update')->middleware('admin');
    Route::post('/inbox/sessions/{session}/reply', [ConversationInboxController::class, 'reply'])->name('portal.inbox.reply');
    Route::patch('/inbox/sessions/{session}/automation', [ConversationInboxController::class, 'automation'])->name('portal.inbox.automation');
    Route::post('/inbox/sessions/{session}/resolve', [ConversationInboxController::class, 'resolve'])->name('portal.inbox.resolve');
    Route::post('/menu-items', [MenuItemsController::class, 'store']);
    Route::put('/menu-items/{menuItem}', [MenuItemsController::class, 'update']);
    Route::delete('/menu-items/{menuItem}', [MenuItemsController::class, 'destroy']);
    Route::get('/quick-orders', [QuickOrdersController::class, 'create'])->name('portal.quick-orders');
    Route::post('/quick-orders', [QuickOrdersController::class, 'store']);
    Route::put('/orders/{order}', [OrdersController::class, 'update']);
    Route::patch('/orders/{order}/pickup-slot', [PickupController::class, 'updateSlot'])->name('portal.orders.pickup-slot');
    Route::patch('/orders/{order}/order-marker', [WalkinController::class, 'updateOrderMarker'])->name('portal.orders.order-marker');
    Route::post('/delivery-areas', [DeliveryAreasController::class, 'store']);
    Route::put('/delivery-areas/{deliveryArea}', [DeliveryAreasController::class, 'update']);
    Route::delete('/delivery-areas/{deliveryArea}', [DeliveryAreasController::class, 'destroy']);
    Route::post('/pickup-slots', [PickupSlotsController::class, 'store']);
    Route::put('/pickup-slots/{pickupSlot}', [PickupSlotsController::class, 'update']);
    Route::delete('/pickup-slots/{pickupSlot}', [PickupSlotsController::class, 'destroy']);
    Route::post('/dining-markers', [DiningMarkersController::class, 'store']);
    Route::put('/dining-markers/{diningMarker}', [DiningMarkersController::class, 'update']);
    Route::delete('/dining-markers/{diningMarker}', [DiningMarkersController::class, 'destroy']);
    Route::get('/account', [AccountController::class, 'index'])->name('portal.account');
    Route::put('/account', [AccountController::class, 'updateAccount'])->name('portal.account.update');
    Route::put('/account/password', [AccountController::class, 'updatePassword'])->name('portal.account.password');
    Route::get('/users', [UsersController::class, 'index'])->name('portal.users')->middleware('admin');
    Route::post('/users', [UsersController::class, 'store'])->middleware('admin');
    Route::post('/users/{user}/reset-password', [UsersController::class, 'resetPassword'])->name('portal.users.reset-password')->middleware('admin');
    Route::delete('/users/{user}', [UsersController::class, 'destroy'])->name('portal.users.destroy')->middleware('admin');
    Route::get('/simulate', function () {
        return Inertia::render('Chat', [
            'webChatExternalId' => request()->session()->getId(),
            'channelsEnabled' => [
                'web' => Setting::get('channels.web_enabled', true),
                'sms' => Setting::get('channels.sms_enabled', true),
                'messenger' => Setting::get('channels.messenger_enabled', true),
            ],
        ]);
    })->name('portal.simulate')->middleware('admin');
});
