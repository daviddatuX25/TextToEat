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
        'failure_reason',
        'channel',
        'chatbot_session_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
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

    public function chatbotSession(): BelongsTo
    {
        return $this->belongsTo(ChatbotSession::class);
    }
}
