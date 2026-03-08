<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettingsAuditLog extends Model
{
    public $timestamps = false;

    protected $table = 'settings_audit_log';

    protected $fillable = ['setting_key', 'user_id', 'changed_at', 'action'];

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    public static function log(string $settingKey, ?int $userId, string $action = 'updated'): void
    {
        self::query()->create([
            'setting_key' => $settingKey,
            'user_id' => $userId,
            'changed_at' => now(),
            'action' => $action,
        ]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
