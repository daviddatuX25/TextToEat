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
        'device_token',
        'name',
        'last_used_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
        ];
    }

    public function touchLastUsedAt(): void
    {
        $this->update(['last_used_at' => now()]);
    }
}
