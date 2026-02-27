<?php

namespace App\Chatbot;

/**
 * Matches user body to chatbot keywords and intents.
 * Exact match first; optional fuzzy match via similar_text when >= 80%.
 * Legacy match() for help, menu, cancel, status, human_takeover.
 * matchIntent() for extended intents with phrase lists (order, track, language, anonymous, pickup, delivery, etc.).
 */
class ChatbotKeywordMatcher
{
    private const FUZZY_THRESHOLD = 80.0;

    /**
     * Intent => list of phrases (normalized lowercase). Used for exact and fuzzy matching.
     * @var array<string, list<string>>
     */
    private const INTENT_PHRASES = [
        'order' => ['order', 'order food', 'menu', 'eat', 'food', 'order food'],
        'track' => ['track', 'status', 'my order', 'reference', 'track order'],
        'language' => ['language', 'change language', 'lang', 'change lang'],
        'anonymous' => ['anonymous', 'anon', 'skip', '0'],
        'pickup' => ['pickup', 'pick up', 'pick-up'],
        'delivery' => ['delivery', 'deliver'],
        'help' => ['help'],
        'menu' => ['menu'],
        'cancel' => ['cancel', 'no'],
        'status' => ['status', 'track', 'my order'],
        'human_takeover' => ['tao', 'person', 'human', 'agent'],
        'main_menu' => ['main', 'main menu', 'back', 'home'],
    ];

    /**
     * Return matched keyword (e.g. 'help', 'menu', 'tao') or null.
     * 'tao' and 'person' both return 'human_takeover' for FSM.
     * Backward compatible: same behavior as before for help, menu, cancel, status, tao, person.
     */
    public function match(string $body): ?string
    {
        return $this->matchIntent($body, ['help', 'menu', 'cancel', 'status', 'human_takeover', 'main_menu']);
    }

    /**
     * Match body to an intent using phrase lists. Exact match first, then fuzzy (similar_text >= 80%).
     *
     * @param array<string>|null $allowedIntents If provided, only these intents are considered.
     * @return string|null Intent key or null.
     */
    public function matchIntent(string $body, ?array $allowedIntents = null): ?string
    {
        $normalized = strtolower(trim($body));
        if ($normalized === '') {
            return null;
        }

        $intents = $allowedIntents !== null
            ? array_intersect_key(self::INTENT_PHRASES, array_flip($allowedIntents))
            : self::INTENT_PHRASES;

        foreach ($intents as $intent => $phrases) {
            foreach ($phrases as $phrase) {
                if ($normalized === $phrase) {
                    return $this->normalizeIntent($intent);
                }
            }
        }

        foreach ($intents as $intent => $phrases) {
            foreach ($phrases as $phrase) {
                similar_text($normalized, $phrase, $percent);
                if ($percent >= self::FUZZY_THRESHOLD) {
                    return $this->normalizeIntent($intent);
                }
            }
        }

        return null;
    }

    private function normalizeIntent(string $intent): string
    {
        return $intent;
    }
}
