<?php

namespace App\Services;

/**
 * Number translation and formatting layer: maps numeric replies to canonical FSM input,
 * and formats choice-state replies as prompt + numbered options (single place for this logic).
 * Used by web, SMS, and Messenger (e.g. delivery_area_choice); delivery_choice on Messenger is button-only.
 * Menu item list is still built in ChatbotFsm::buildMenuText; for full uniformity it could be moved here later.
 */
class ChatbotSmsNumberLayer
{
    public function __construct(
        private ChatbotReplyResolver $replyResolver
    ) {}

    /**
     * If the current state is a choice state and body is a single digit 1..n,
     * return the canonical value for that option. Otherwise return body unchanged.
     *
     * For item_selection, pass item_selection_mode in context: 'cart_menu' or 'edit_action'.
     * For delivery_choice pass ['delivery_areas' => array].
     *
     * @param array<string, mixed> $context Optional. item_selection_mode, delivery_areas, etc.
     */
    public function normalizeBodyForChoiceState(?string $currentState, string $body, array $context = []): string
    {
        if ($currentState === null || $currentState === '') {
            return $body;
        }

        $trimmed = trim($body);
        // edit_select: map '0' → 'remove' so FSM never sees raw number (SMS/Web convenience).
        if ($currentState === 'item_selection' && ($context['item_selection_mode'] ?? '') === 'edit_select' && $trimmed === '0') {
            return 'remove';
        }

        $options = $this->getOptionsForChoiceState($currentState, $context);
        if ($options === []) {
            return $body;
        }

        if ($trimmed === '') {
            return $body;
        }

        if (! preg_match('/^[1-9]\d*$/', $trimmed)) {
            return $body;
        }

        $index = (int) $trimmed;
        if ($index < 1 || $index > count($options)) {
            return $body;
        }

        $option = $options[$index - 1];
        $canonical = $option['canonical'] ?? null;

        return $canonical !== null ? $canonical : $body;
    }

    /**
     * Resolve options for a choice state. For item_selection, uses item_selection_mode from context.
     *
     * @param array<string, mixed> $context
     * @return list<array{canonical: string, label_key: string}>
     */
    private function getOptionsForChoiceState(string $state, array $context = []): array
    {
        if ($state === 'item_selection') {
            $mode = (string) ($context['item_selection_mode'] ?? '');
            if ($mode === 'cart_menu') {
                return $this->getOptionsForState('cart_menu');
            }
            if ($mode === 'edit_action') {
                return $this->getOptionsForState('edit_action');
            }

            return [];
        }

        return $this->getOptionsForState($state);
    }

    /**
     * If nextState is a choice state, return prompt + "1. Label1\n2. Label2\n..."
     * for SMS display. Otherwise return null (caller uses raw reply).
     *
     * @param array<string, mixed> $context Optional. For delivery_choice pass ['delivery_areas' => array].
     */
    public function formatChoiceStateReply(string $nextState, string $locale, array $context = []): ?string
    {
        if ($nextState === 'delivery_area_choice' && isset($context['delivery_areas']) && is_array($context['delivery_areas'])) {
            return $this->formatDeliveryAreaChoiceReply($context['delivery_areas'], $locale);
        }

        if ($nextState === 'confirm') {
            $promptOnly = $this->getChoiceStatePromptOnly('confirm', $locale);
            if ($promptOnly === null) {
                return null;
            }
            $options = config('chatbot.choice_state_options.confirm.options', []);
            if (! \is_array($options)) {
                return null;
            }
            $lines = [trim($promptOnly)];
            foreach ($options as $i => $opt) {
                $labelKey = $opt['label_key'] ?? null;
                if ($labelKey === null) {
                    continue;
                }
                $label = $this->replyResolver->get($labelKey, $locale);
                $lines[] = ($i + 1) . '. ' . trim($label);
            }
            return implode("\n", $lines);
        }

        $config = config('chatbot.choice_state_options.' . $nextState);
        if (! is_array($config)) {
            return null;
        }

        $promptKey = $config['prompt_key'] ?? null;
        $options = $config['options'] ?? [];
        if ($promptKey === null || $options === []) {
            return null;
        }

        $prompt = $this->replyResolver->get($promptKey, $locale);
        $lines = [trim($prompt)];

        foreach ($options as $i => $opt) {
            $labelKey = $opt['label_key'] ?? null;
            if ($labelKey === null) {
                continue;
            }
            $label = $this->replyResolver->get($labelKey, $locale);
            $lines[] = ($i + 1) . '. ' . trim($label);
        }

        return implode("\n", $lines);
    }

    /**
     * Format delivery type choice: "1. Pickup", "2. Delivery" (first step).
     */
    public function formatDeliveryTypeChoiceReply(string $locale): string
    {
        $prompt = trim($this->replyResolver->get('delivery_choice_header', $locale));
        $lines = [
            $prompt,
            '1. ' . trim($this->replyResolver->get('delivery_summary_pickup', $locale)),
            '2. ' . trim($this->replyResolver->get('delivery_type_delivery', $locale)),
        ];
        return implode("\n", $lines);
    }

    /**
     * Format delivery area choice: "1. Area A", "2. Area B", ... "n. Other" (second step, from DB).
     *
     * @param array<int, array{name?: string}> $deliveryAreas
     */
    public function formatDeliveryAreaChoiceReply(array $deliveryAreas, string $locale): string
    {
        $prompt = trim($this->replyResolver->get('delivery_area_choice_header', $locale));
        $lines = [$prompt];
        foreach ($deliveryAreas as $i => $area) {
            $name = $area['name'] ?? ('Area ' . ($i + 1));
            $lines[] = ($i + 1) . '. ' . (is_string($name) ? $name : 'Area ' . ($i + 1));
        }
        $lines[] = (count($deliveryAreas) + 1) . '. ' . trim($this->replyResolver->get('delivery_summary_paid', $locale));
        return implode("\n", $lines);
    }

    /**
     * Return whether the given state is a choice state (has numbered options for SMS).
     * delivery_choice is dynamic (options from runtime) so always true.
     */
    public function isChoiceState(string $state): bool
    {
        if ($state === 'delivery_choice' || $state === 'delivery_area_choice') {
            return true;
        }
        return $this->getOptionsForState($state) !== [];
    }

    /**
     * Ensure choice-state replies include formatted options (prompt + "1. Label\n2. Label...").
     * Single place for numbering; replace or append so options are always shown where applicable.
     * delivery_choice on Messenger is button-only (no numbering); delivery_area_choice gets numbering on all channels.
     *
     * @param array<int, string> $replies
     * @param array<string, mixed> $context Optional: channel, delivery_areas, saved_customer_name.
     * @return array{replies: array<int, string>, reply: string}
     */
    public function ensureChoiceStateOptionsInReplies(array $replies, string $nextState, string $locale, array $context = []): array
    {
        $reply = implode("\n\n", $replies);
        $channel = $context['channel'] ?? null;

        // Messenger uses buttons for choice states; skip numbering except delivery_area_choice (many areas).
        // Menu item numbers are built in FSM, not here.
        if ($channel === 'messenger' && $nextState !== 'delivery_area_choice') {
            return ['replies' => $replies, 'reply' => $reply];
        }

        if ($nextState === 'collect_name' && isset($context['saved_customer_name']) && $context['saved_customer_name'] !== '') {
            $savedName = (string) $context['saved_customer_name'];
            $optionLine = '1. ' . trim($this->replyResolver->get('collect_name_use_saved_option', $locale, ['name' => $savedName]));
            foreach ($replies as $i => $replyText) {
                if (\is_string($replyText) && str_contains($replyText, 'or type a name') && ! str_contains($replyText, $optionLine)) {
                    $replies[$i] = $replyText . "\n" . $optionLine;
                    break;
                }
            }
            return ['replies' => $replies, 'reply' => implode("\n\n", $replies)];
        }

        if (! $this->isChoiceState($nextState)) {
            return ['replies' => $replies, 'reply' => $reply];
        }

        $formattedChoice = $this->formatChoiceStateReply($nextState, $locale, $context);
        $promptOnly = $this->getChoiceStatePromptOnly($nextState, $locale);
        if ($formattedChoice === null || $promptOnly === null) {
            return ['replies' => $replies, 'reply' => $reply];
        }

        $replaced = false;
        foreach ($replies as $i => $replyText) {
            if (! \is_string($replyText)) {
                continue;
            }
            if (str_contains($replyText, $promptOnly)) {
                $replies[$i] = str_replace($promptOnly, $formattedChoice, $replyText);
                $replaced = true;
            }
        }

        if (! $replaced) {
            $replies[] = $formattedChoice;
        }
        $reply = implode("\n\n", $replies);

        return ['replies' => $replies, 'reply' => $reply];
    }

    /**
     * Return the bare prompt string for a choice state (no numbers).
     * Used to detect which reply segment to replace with formatted prompt + options.
     */
    public function getChoiceStatePromptOnly(string $state, string $locale): ?string
    {
        if ($state === 'delivery_choice') {
            return trim($this->replyResolver->get('delivery_choice_header', $locale));
        }
        if ($state === 'delivery_area_choice') {
            return trim($this->replyResolver->get('delivery_area_choice_header', $locale));
        }
        if ($state === 'confirm') {
            $full = $this->replyResolver->get('confirm_prompt', $locale, ['summary' => '']);
            $parts = explode("\n\n", trim($full), 2);
            return isset($parts[1]) ? trim($parts[1]) : trim($full);
        }
        $config = config('chatbot.choice_state_options.' . $state);
        if (! is_array($config)) {
            return null;
        }
        $promptKey = $config['prompt_key'] ?? null;
        if ($promptKey === null) {
            return null;
        }
        return trim($this->replyResolver->get($promptKey, $locale));
    }

    /**
     * Replace __CART_FOOTER__ and __EDIT_ACTION_OPTIONS__ placeholders with numbered options.
     * Only for SMS/Web. Messenger never touches the layer — return reply unchanged.
     */
    public function replacePlaceholdersInReply(string $reply, string $locale, ?string $channel, ?string $itemSelectionMode = null): string
    {
        if ($channel === 'messenger') {
            return $reply;
        }

        $reply = str_replace('__CART_FOOTER__', $this->formatCartFooterOptions($locale), $reply);
        $reply = str_replace('__EDIT_ACTION_OPTIONS__', $this->formatEditActionOptions($locale), $reply);

        return $reply;
    }

    /**
     * Format cart footer options: "1. Add another item, 2. View cart, 3. Change/remove item, 4. Confirm order. Or type 'done' to confirm."
     */
    public function formatCartFooterOptions(string $locale): string
    {
        $options = $this->getOptionsForState('cart_menu');
        $lines = [];
        foreach ($options as $i => $opt) {
            $labelKey = $opt['label_key'] ?? null;
            if ($labelKey === null) {
                continue;
            }
            $label = $this->replyResolver->get($labelKey, $locale);
            $lines[] = ($i + 1) . '. ' . trim($label);
        }
        $suffix = trim($this->replyResolver->get('cart_footer_suffix', $locale));

        return implode(', ', $lines) . '. ' . $suffix;
    }

    /**
     * Format edit action options: "1. Change quantity, 2. Remove item, 3. Back"
     */
    public function formatEditActionOptions(string $locale): string
    {
        $options = $this->getOptionsForState('edit_action');
        $lines = [];
        foreach ($options as $i => $opt) {
            $labelKey = $opt['label_key'] ?? null;
            if ($labelKey === null) {
                continue;
            }
            $label = $this->replyResolver->get($labelKey, $locale);
            $lines[] = ($i + 1) . '. ' . trim($label);
        }

        return implode(', ', $lines);
    }

    /**
     * @return list<array{canonical: string, label_key: string}>
     */
    private function getOptionsForState(string $state): array
    {
        $config = config('chatbot.choice_state_options.' . $state);
        if (! is_array($config)) {
            return [];
        }

        $options = $config['options'] ?? [];
        if (! is_array($options)) {
            return [];
        }

        $out = [];
        foreach ($options as $opt) {
            if (is_array($opt) && isset($opt['canonical'], $opt['label_key'])) {
                $out[] = $opt;
            }
        }

        return $out;
    }
}
