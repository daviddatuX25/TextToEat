<?php

namespace App\Enums;

enum OrderChannel: string
{
    case Sms = 'sms';
    case Messenger = 'messenger';
    case Web = 'web';
    case WalkIn = 'walkin';
}
