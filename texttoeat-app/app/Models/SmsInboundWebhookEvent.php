<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsInboundWebhookEvent extends Model
{
    public const OUTCOME_DUPLICATE_MESSAGE_ID = 'duplicate_message_id';

    protected $table = 'sms_inbound_webhook_events';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'outcome',
        'from_phone',
        'gateway_message_id',
        'message_body',
    ];
}
