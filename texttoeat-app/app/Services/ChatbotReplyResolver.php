<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Single source for chatbot reply strings. Resolves by key + locale, with optional
 * DB overrides and cache. Fallback is always the lang file for that locale (no cross-locale).
 *
 * Cache: Override lookups use cache key chatbot_reply:{locale}:{key}. Invalidate on save/destroy
 * in ChatbotRepliesController to avoid stale overrides in production.
 */
class ChatbotReplyResolver
{
    public function get(string $key, string $locale, array $replace = []): string
    {
        $overridableKeys = config('chatbot.reply_overridable_keys', []);

        if (! array_key_exists($key, $overridableKeys)) {
            return __('chatbot.' . $key, $replace, $locale);
        }

        if (Schema::hasTable('chatbot_reply_overrides')) {
            $override = $this->getOverride($key, $locale);
            if ($override !== null && $override !== '') {
                return $this->applyReplace($override, $replace);
            }
        }

        return __('chatbot.' . $key, $replace, $locale);
    }

    /**
     * Get override from cache or DB. Returns null if no override.
     * Cache must be invalidated in ChatbotRepliesController on store/destroy.
     */
    private function getOverride(string $key, string $locale): ?string
    {
        $ttl = config('chatbot.reply_cache_ttl_seconds', 21600);
        $cacheKey = "chatbot_reply:{$locale}:{$key}";

        return Cache::remember($cacheKey, $ttl, function () use ($key, $locale) {
            try {
                $row = \App\Models\ChatbotReplyOverride::where('key', $key)->where('locale', $locale)->first();

                return $row?->value;
            } catch (\Throwable) {
                return null;
            }
        });
    }

    private function applyReplace(string $text, array $replace): string
    {
        foreach ($replace as $placeholder => $value) {
            $search = is_string($placeholder) && str_starts_with($placeholder, ':')
                ? $placeholder
                : ':' . $placeholder;
            $text = str_replace($search, (string) $value, $text);
        }

        return $text;
    }

    /**
     * Invalidate cache for one key/locale. Call from ChatbotRepliesController on store and destroy.
     */
    public function invalidateCache(string $key, string $locale): void
    {
        Cache::forget("chatbot_reply:{$locale}:{$key}");
    }
}
