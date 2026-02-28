<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CustomerMenuController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveriesController;
use App\Http\Controllers\DeliveryAreasController;
use App\Http\Controllers\DiningMarkersController;
use App\Http\Controllers\MenuItemsController;
use App\Http\Controllers\OrderLogsController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\ChatbotLogsController;
use App\Http\Controllers\ConversationInboxController;
use App\Http\Controllers\PickupController;
use App\Http\Controllers\PickupSlotsController;
use App\Http\Controllers\QuickOrdersController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\WalkinController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::get('/login', [LoginController::class, 'create'])->name('login')->middleware('guest');
Route::post('/login', [LoginController::class, 'store'])->middleware('guest');
Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth');

Route::get('/menu', [CustomerMenuController::class, 'index'])->name('menu');
Route::post('/cart/add', [CustomerMenuController::class, 'addToCart']);
Route::post('/cart/update', [CustomerMenuController::class, 'updateCart']);
Route::post('/cart/remove', [CustomerMenuController::class, 'removeFromCart']);

Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout');
Route::post('/checkout', [CheckoutController::class, 'store']);
Route::get('/order-confirmation/{reference}', [CheckoutController::class, 'confirmation'])->name('order.confirmation');

Route::get('/track', function () {
    return Inertia::render('Track');
});
Route::get('/chat', function () {
    return Inertia::render('Chat', [
        'webChatExternalId' => request()->session()->getId(),
    ]);
});

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
    Route::get('/', [DashboardController::class, 'index'])->name('portal.dashboard');
    Route::get('/orders', [OrdersController::class, 'index'])->name('portal.orders');
    Route::get('/orders/completed', [OrdersController::class, 'completedIndex'])->name('portal.orders.completed');
    Route::get('/deliveries', [DeliveriesController::class, 'index'])->name('portal.deliveries');
    Route::get('/pickup', [PickupController::class, 'index'])->name('portal.pickup');
    Route::get('/walkin', [WalkinController::class, 'index'])->name('portal.walkin');
    Route::get('/menu-items', [MenuItemsController::class, 'index'])->name('portal.menu-items');
    Route::get('/logs/orders', [OrderLogsController::class, 'index'])->name('portal.logs.orders');
    Route::get('/logs/chatbot', [ChatbotLogsController::class, 'index'])->name('portal.logs.chatbot');
    Route::get('/inbox', [ConversationInboxController::class, 'index'])->name('portal.inbox');
    Route::get('/inbox/{session}', [ConversationInboxController::class, 'show'])->name('portal.inbox.show');
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
    Route::get('/users', [UsersController::class, 'index'])->name('portal.users')->middleware('admin');
    Route::post('/users', [UsersController::class, 'store'])->middleware('admin');
    Route::post('/users/{user}/send-password-reset', [UsersController::class, 'sendPasswordReset'])->name('portal.users.send-password-reset')->middleware('admin');
});
