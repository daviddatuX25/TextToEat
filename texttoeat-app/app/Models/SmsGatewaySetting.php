<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsGatewaySetting extends Model
{
    protected $table = 'sms_gateway_settings';

    protected $fillable = ['api_key'];

    /**
     * Resolve the SMS device API key: env/config override first, then DB.
     * Tests can set config('firebase.sms_device_api_key') to control behavior.
     */
    public static function getApiKey(): ?string
    {
        $fromConfig = config('firebase.sms_device_api_key');
        if ($fromConfig !== null && $fromConfig !== '') {
            return $fromConfig;
        }

        $row = self::first();
        $key = $row?->api_key;

        return $key !== null && $key !== '' ? $key : null;
    }
}
