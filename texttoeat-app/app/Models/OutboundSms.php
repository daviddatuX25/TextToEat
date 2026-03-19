<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutboundSms extends Model
{
    protected $table = 'outbound_sms';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'to',
        'body',
        'status',
        'sent_at',
        'delivered_at',
        'failure_reason',
        'error_code',
        'error_message',
        'channel',
        'chatbot_session_id',
        'conversation_id',
        'sms_batch_id',
        'sms_device_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeSent(Builder $query): Builder
    {
        return $query->where('status', 'sent');
    }

    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'failed');
    }

    public function scopeDelivered(Builder $query): Builder
    {
        return $query->where('status', 'delivered');
    }

    public function chatbotSession(): BelongsTo
    {
        return $this->belongsTo(ChatbotSession::class);
    }

    public function smsDevice(): BelongsTo
    {
        return $this->belongsTo(SmsDevice::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
