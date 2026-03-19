<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'chatbot_session_id',
        'channel',
        'external_id',
        'status',
    ];

    public function chatbotSession(): BelongsTo
    {
        return $this->belongsTo(ChatbotSession::class);
    }

    public function inboundMessages(): HasMany
    {
        return $this->hasMany(InboundMessage::class);
    }

    public function outboundSms(): HasMany
    {
        return $this->hasMany(OutboundSms::class);
    }

    public function outboundMessenger(): HasMany
    {
        return $this->hasMany(OutboundMessenger::class);
    }
}
