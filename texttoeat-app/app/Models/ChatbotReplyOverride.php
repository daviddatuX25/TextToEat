<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotReplyOverride extends Model
{
    protected $table = 'chatbot_reply_overrides';

    protected $fillable = [
        'key',
        'locale',
        'value',
        'updated_by',
    ];

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
