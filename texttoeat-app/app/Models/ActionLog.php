<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'action_log';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'model',
        'model_id',
        'payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'model_id' => 'integer',
            'payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
