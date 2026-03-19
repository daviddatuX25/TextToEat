<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InboundMessage extends Model
{
    protected $table = 'inbound_messages';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'chatbot_session_id',
        'conversation_id',
        'body',
        'channel',
    ];

    public function chatbotSession(): BelongsTo
    {
        return $this->belongsTo(ChatbotSession::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
