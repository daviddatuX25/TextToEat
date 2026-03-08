<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Setting extends Model
{
    protected $table = 'settings';

    protected $fillable = ['key', 'value'];

    /**
     * Keys whose values are encrypted at rest (secrets).
     */
    protected static array $encryptedKeys = [
        'facebook.app_id',
        'facebook.app_secret',
        'facebook.verify_token',
        'facebook.page_access_token',
        'textbee.webhook_secret',
        'firebase.device_token',
        'sms_device_api_key', // from sms_gateway_settings or settings
    ];

    /**
     * Env fallback map: setting key => env var name.
     */
    protected static array $envFallback = [
        'menu.reset_morning_until_hour' => 'MENU_RESET_MORNING_UNTIL_HOUR',
        'channels.sms_enabled' => 'CHANNEL_SMS_ENABLED',
        'channels.messenger_enabled' => 'CHANNEL_MESSENGER_ENABLED',
        'channels.web_enabled' => 'CHANNEL_WEB_ENABLED',
        'facebook.app_id' => 'FACEBOOK_APP_ID',
        'facebook.app_secret' => 'FACEBOOK_APP_SECRET',
        'facebook.verify_token' => 'FACEBOOK_VERIFY_TOKEN',
        'facebook.page_access_token' => 'FACEBOOK_PAGE_ACCESS_TOKEN',
        'textbee.api_url' => 'TEXTBEE_API_URL',
        'textbee.webhook_secret' => 'TEXTBEE_WEBHOOK_SECRET',
        'firebase.credentials_path' => 'FIREBASE_CREDENTIALS',
        'firebase.device_token' => 'FCM_DEVICE_TOKEN',
        'chatbot.takeover_timeout_minutes' => 'CHATBOT_TAKEOVER_TIMEOUT_MINUTES',
        'chatbot.session_timeout_seconds' => 'CHATBOT_SESSION_TIMEOUT_SECONDS',
        'firebase.pending_timeout_minutes' => 'SMS_PENDING_TIMEOUT_MINUTES',
        'firebase.heartbeat_interval_minutes' => 'SMS_HEARTBEAT_INTERVAL_MINUTES',
    ];

    /**
     * Get a setting value: DB first (decrypt if needed), then env fallback.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $row = self::query()->where('key', $key)->first();
        if ($row !== null && $row->value !== null && $row->value !== '') {
            $value = $row->value;
            if (self::isEncrypted($key)) {
                try {
                    $value = Crypt::decryptString($value);
                } catch (\Throwable) {
                    return self::envFallback($key, $default);
                }
            }
            return self::castValue($key, $value);
        }
        return self::envFallback($key, $default);
    }

    /**
     * Set a setting value (encrypt if secret). Logs to settings_audit_log.
     */
    public static function set(string $key, mixed $value, ?int $userId = null): void
    {
        $action = 'updated';
        $existing = self::query()->where('key', $key)->first();
        if ($existing === null) {
            $action = 'created';
        }

        $stored = $value;
        if (is_bool($value)) {
            $stored = $value ? '1' : '0';
        }
        if (is_scalar($stored) && self::isEncrypted($key)) {
            $stored = Crypt::encryptString((string) $stored);
        }
        if (! is_scalar($stored)) {
            $stored = json_encode($stored);
        }

        self::query()->updateOrInsert(
            ['key' => $key],
            ['value' => $stored, 'updated_at' => now()]
        );

        SettingsAuditLog::log($key, $userId, $action);
    }

    /**
     * Check if key has a value set in DB (for "configured" display). Does not decrypt.
     */
    public static function has(string $key): bool
    {
        $row = self::query()->where('key', $key)->first();

        return $row !== null && $row->value !== null && $row->value !== '';
    }

    public static function isEncrypted(string $key): bool
    {
        return in_array($key, self::$encryptedKeys, true);
    }

    protected static function envFallback(string $key, mixed $default): mixed
    {
        $envKey = self::$envFallback[$key] ?? null;
        if ($envKey === null) {
            return $default;
        }
        $env = env($envKey);
        if ($env === null || $env === '') {
            // Channel toggles: default enabled when not set
            if (in_array($key, ['channels.sms_enabled', 'channels.messenger_enabled', 'channels.web_enabled'], true)) {
                return true;
            }
            return $default;
        }
        return self::castValue($key, $env);
    }

    protected static function castValue(string $key, mixed $value): mixed
    {
        if (str_starts_with($key, 'channels.')) {
            if ($value === '1' || $value === 'true' || $value === true) {
                return true;
            }
            if ($value === '0' || $value === 'false' || $value === false) {
                return false;
            }
        }
        if ($key === 'menu.reset_morning_until_hour' || $key === 'menu.low_stock_threshold' || $key === 'menu.auto_reset_at_hour') {
            return (int) $value;
        }
        if ($key === 'menu.auto_reset_enabled') {
            return $value === '1' || $value === 'true' || $value === true;
        }
        if ($key === 'menu.low_stock_badge_style') {
            $v = (string) $value;
            return in_array($v, ['count', 'one'], true) ? $v : 'count';
        }
        if (str_contains($key, 'timeout') || str_contains($key, 'heartbeat_interval_minutes')) {
            return (int) $value;
        }
        return $value;
    }
}
