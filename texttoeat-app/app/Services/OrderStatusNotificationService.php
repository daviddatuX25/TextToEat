<?php

namespace App\Services;

use App\Contracts\MessengerSenderInterface;
use App\Contracts\SmsSenderInterface;
use App\Models\ChatbotSession;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

class OrderStatusNotificationService
{
    public function __construct(
        private SmsSenderInterface $smsSender,
        private MessengerSenderInterface $messengerSender
    ) {}

    /**
     * Send proactive notification when order status changes to a notifyable state.
     * Only for SMS/Messenger channels with external_id.
     */
    public function maybeNotify(Order $order, string $fromStatus): void
    {
        $toStatus = $order->status;
        if (! $this->shouldNotify($order, $fromStatus, $toStatus)) {
            return;
        }
        $this->notifyCustomer($order, $toStatus);
    }

    public function shouldNotify(Order $order, string $fromStatus, string $toStatus): bool
    {
        $channel = $order->channel ?? '';
        $externalId = trim((string) ($order->external_id ?? ''));
        if (! \in_array($channel, ['sms', 'messenger'], true) || $externalId === '') {
            return false;
        }

        $deliveryType = $order->delivery_type ?? 'pickup';

        if ($deliveryType === 'delivery') {
            return $toStatus === 'on_the_way';
        }

        if ($deliveryType === 'pickup') {
            return $toStatus === 'ready';
        }

        return false;
    }

    public function notifyCustomer(Order $order, string $toStatus): void
    {
        $channel = $order->channel;
        $externalId = $order->external_id;
        $locale = $this->resolveLocale($order);

        $message = $this->buildPushMessage($order, $toStatus, $locale);
        if ($message === '') {
            return;
        }

        try {
            if ($channel === 'sms') {
                $session = ChatbotSession::where('channel', 'sms')
                    ->where('external_id', $externalId)
                    ->first();
                $this->smsSender->send($externalId, $message, 'sms', $session?->id);
            } else {
                $this->messengerSender->send($externalId, $message);
            }
        } catch (\Throwable $e) {
            Log::warning('OrderStatusNotificationService: failed to send', [
                'order_id' => $order->id,
                'channel' => $channel,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveLocale(Order $order): string
    {
        $session = ChatbotSession::where('channel', $order->channel)
            ->where('external_id', $order->external_id)
            ->first();

        return $session?->language ?? 'en';
    }

    private function buildPushMessage(Order $order, string $toStatus, string $locale): string
    {
        $reference = $order->reference ?? '';
        $deliveryType = $order->delivery_type ?? 'pickup';
        $pickupSlot = trim((string) ($order->pickup_slot ?? ''));
        $paymentStatus = $order->payment_status;
        $isPaid = $paymentStatus === 'paid' || (is_object($paymentStatus) && $paymentStatus->value === 'paid');
        $totalFormatted = number_format((float) ($order->total ?? 0), 2);

        if ($toStatus === 'on_the_way' && $deliveryType === 'delivery') {
            $message = __('chatbot.status_push_on_the_way', ['reference' => $reference], $locale);
            if (! $isPaid) {
                $message .= "\n\n" . $this->unpaidDeliveryReminder($order, $locale, $totalFormatted);
            }

            return $message;
        }

        if ($toStatus === 'ready' && $deliveryType === 'pickup') {
            if ($pickupSlot !== '') {
                $message = __('chatbot.status_push_ready_pickup_slot', [
                    'reference' => $reference,
                    'slot' => $pickupSlot,
                ], $locale);
            } else {
                $message = __('chatbot.status_push_ready_pickup', ['reference' => $reference], $locale);
            }
            if (! $isPaid) {
                $message .= "\n\n" . __('chatbot.status_push_unpaid_pickup', ['total' => $totalFormatted], $locale);
            }

            return $message;
        }

        return '';
    }

    /**
     * Message for unpaid delivery: known total (₱X) or "cash for payment on delivery" when fee is paid at door.
     */
    private function unpaidDeliveryReminder(Order $order, string $locale, string $totalFormatted): string
    {
        $place = $order->delivery_place ?? '';

        if ($place === 'Other (paid on delivery)') {
            return __('chatbot.status_push_unpaid_delivery_cash', [], $locale);
        }

        return __('chatbot.status_push_unpaid_delivery_total', ['total' => $totalFormatted], $locale);
    }
}
