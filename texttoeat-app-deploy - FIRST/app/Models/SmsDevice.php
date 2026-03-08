<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsDevice extends Model
{
    protected $table = 'sms_devices';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'device_id',
        'device_token',
        'name',
        'brand',
        'model',
        'os',
        'app_version_code',
        'sim_info',
        'preferred_sim_subscription_id',
        'enabled',
        'last_used_at',
        'last_heartbeat_at',
        'last_heartbeat_payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sim_info' => 'array',
            'last_used_at' => 'datetime',
            'last_heartbeat_at' => 'datetime',
            'last_heartbeat_payload' => 'array',
            'enabled' => 'boolean',
        ];
    }

    public function touchLastUsedAt(): void
    {
        $this->update(['last_used_at' => now()]);
    }
}
