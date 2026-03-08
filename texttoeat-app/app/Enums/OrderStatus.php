<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Received = 'received';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case OnTheWay = 'on_the_way';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * Statuses that count as unfulfilled (not completed, not cancelled).
     * Used for "cancel previous unfulfilled" on manual menu reset; badge stays received + preparing only.
     */
    public static function unfulfilledStatuses(): array
    {
        return [
            self::Received,
            self::Preparing,
            self::Ready,
            self::OnTheWay,
        ];
    }
}
