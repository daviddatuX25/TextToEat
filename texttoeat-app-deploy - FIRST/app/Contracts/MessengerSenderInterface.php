<?php

namespace App\Contracts;

interface MessengerSenderInterface
{
    public function send(string $recipientId, string $text): void;
}
