<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Received = 'received';
    case Confirmed = 'confirmed';
    case Ready = 'ready';
    case OnTheWay = 'on_the_way';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
