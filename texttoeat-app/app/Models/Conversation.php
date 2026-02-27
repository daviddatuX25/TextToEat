<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
}
