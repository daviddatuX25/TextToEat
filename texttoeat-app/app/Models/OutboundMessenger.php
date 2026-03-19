<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutboundMessenger extends Model
{
    protected $table = 'outbound_messenger';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'to',
        'body',
        'conversation_id',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
