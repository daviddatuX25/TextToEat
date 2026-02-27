<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatbotSession extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'channel',
        'external_id',
        'language',
        'saved_customer_name',
        'state',
        'last_activity_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'state' => 'array',
            'last_activity_at' => 'datetime',
        ];
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }
}
