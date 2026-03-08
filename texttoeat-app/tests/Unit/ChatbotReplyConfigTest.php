<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Ensures every label_key in choice_state_options exists in reply_overridable_keys,
 * so option labels can be customized via Reply Templates.
 */
class ChatbotReplyConfigTest extends TestCase
{
    public function test_every_choice_state_option_label_key_is_overridable(): void
    {
        $choiceStateOptions = config('chatbot.choice_state_options', []);
        $overridableKeys = array_keys(config('chatbot.reply_overridable_keys', []));

        $missing = [];
        foreach ($choiceStateOptions as $state => $config) {
            if (! is_array($config)) {
                continue;
            }
            $options = $config['options'] ?? [];
            foreach ($options as $opt) {
                if (! is_array($opt)) {
                    continue;
                }
                $labelKey = $opt['label_key'] ?? null;
                if ($labelKey !== null && $labelKey !== '' && ! in_array($labelKey, $overridableKeys, true)) {
                    $missing[] = "{$state}: {$labelKey}";
                }
            }
        }

        $this->assertEmpty($missing, 'These choice_state_options label_keys must be in reply_overridable_keys: ' . implode(', ', $missing));
    }
}
