<?php

namespace App\Http\Controllers;

use App\Models\ChatbotReplyOverride;
use App\Services\ChatbotReplyResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ChatbotRepliesController extends Controller
{
    private const LOCALES = [
        'en' => 'English',
        'tl' => 'Tagalog',
        'ilo' => 'Ilocano',
    ];

    private const GROUP_ORDER_FALLBACK = [
        'Welcome & language',
        'Main menu',
        'Menu and ordering',
        'Cart',
        'Delivery and name',
        'Confirm',
        'Order placed',
        'Track',
        'Human takeover',
        'Help & errors',
        'Other',
    ];

    public function index(): Response
    {
        $keysConfig = config('chatbot.reply_overridable_keys', []);
        $byGroup = [];
        foreach ($keysConfig as $key => $meta) {
            $groupLabel = $meta['group'] ?? 'Other';
            if (! isset($byGroup[$groupLabel])) {
                $byGroup[$groupLabel] = [];
            }
            $byGroup[$groupLabel][] = [
                'key' => $key,
                'label' => $meta['label'] ?? $key,
                'required_placeholders' => $meta['required_placeholders'] ?? [],
            ];
        }

        $treeConfig = config('chatbot.reply_template_tree', []);
        if ($treeConfig !== [] && is_array($treeConfig)) {
            $groups = $this->buildTree($treeConfig, $byGroup);
            $groupsInTree = $this->collectGroupLabelsFromTree($treeConfig);
            $otherKeys = [];
            foreach ($byGroup as $groupLabel => $keyList) {
                if (! in_array($groupLabel, $groupsInTree, true)) {
                    foreach ($keyList as $keyMeta) {
                        $otherKeys[] = $keyMeta;
                    }
                }
            }
            if ($otherKeys !== []) {
                $groups[] = ['id' => 'other', 'label' => 'Other', 'keys' => $otherKeys, 'children' => []];
            }
        } else {
            $groups = $this->buildFlatGroupsFallback($byGroup);
        }

        $overrides = [];
        if (class_exists(ChatbotReplyOverride::class) && \Illuminate\Support\Facades\Schema::hasTable('chatbot_reply_overrides')) {
            foreach (ChatbotReplyOverride::all() as $row) {
                $overrides[$row->locale][$row->key] = $row->value;
            }
        }

        $defaults = [];
        foreach (array_keys(self::LOCALES) as $locale) {
            foreach (array_keys($keysConfig) as $key) {
                $defaults[$locale][$key] = __('chatbot.' . $key, [], $locale);
            }
        }

        $optionLabelKeys = $this->collectOptionLabelKeys();

        return Inertia::render('ChatbotReplies', [
            'locales' => self::LOCALES,
            'groups' => $groups,
            'overrides' => $overrides,
            'defaults' => $defaults,
            'optionLabelKeys' => $optionLabelKeys,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string', 'max:128'],
            'locale' => ['required', 'string', 'in:en,tl,ilo'],
            'value' => ['required', 'string', 'max:4096', 'min:1'],
        ], [
            'value.min' => 'Value cannot be empty or only whitespace.',
        ]);

        $value = trim($validated['value']);
        if ($value === '') {
            throw ValidationException::withMessages(['value' => 'Value cannot be empty or only whitespace.']);
        }

        $key = $validated['key'];
        $locale = $validated['locale'];

        $keysConfig = config('chatbot.reply_overridable_keys', []);
        if (! array_key_exists($key, $keysConfig)) {
            throw ValidationException::withMessages(['key' => 'Invalid key.']);
        }

        $required = $keysConfig[$key]['required_placeholders'] ?? [];
        foreach ($required as $placeholder) {
            if (! str_contains($value, $placeholder)) {
                throw ValidationException::withMessages([
                    'value' => "Custom text must include {$placeholder}.",
                ]);
            }
        }

        ChatbotReplyOverride::updateOrCreate(
            ['key' => $key, 'locale' => $locale],
            [
                'value' => $value,
                'updated_by' => $request->user()?->id,
            ]
        );

        app(ChatbotReplyResolver::class)->invalidateCache($key, $locale);

        return redirect()->back()->with('success', 'Saved.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->merge($request->query());
        $validated = $request->validate([
            'key' => ['required', 'string', 'max:128'],
            'locale' => ['required', 'string', 'in:en,tl,ilo'],
        ]);

        $key = $validated['key'];
        $locale = $validated['locale'];

        $keysConfig = config('chatbot.reply_overridable_keys', []);
        if (! array_key_exists($key, $keysConfig)) {
            throw ValidationException::withMessages(['key' => 'Invalid key.']);
        }

        ChatbotReplyOverride::where('key', $key)->where('locale', $locale)->delete();
        app(ChatbotReplyResolver::class)->invalidateCache($key, $locale);

        return redirect()->back()->with('success', 'Reset to default.');
    }

    /**
     * Collect all label_key values from choice_state_options (for "Option label" badge).
     */
    private function collectOptionLabelKeys(): array
    {
        $keys = [];
        $choiceOptions = config('chatbot.choice_state_options', []);
        foreach ($choiceOptions as $stateConfig) {
            if (! is_array($stateConfig)) {
                continue;
            }
            foreach ($stateConfig['options'] ?? [] as $opt) {
                if (is_array($opt) && isset($opt['label_key']) && $opt['label_key'] !== '') {
                    $keys[] = $opt['label_key'];
                }
            }
        }
        $extra = ['delivery_summary_paid', 'collect_name_use_saved_option'];
        foreach ($extra as $ek) {
            if (! in_array($ek, $keys, true)) {
                $keys[] = $ek;
            }
        }
        return array_values(array_unique($keys));
    }

    /**
     * Collect all group labels referenced in the tree config (for "Other" fallback).
     */
    private function collectGroupLabelsFromTree(array $treeConfig): array
    {
        $labels = [];
        foreach ($treeConfig as $node) {
            foreach ($node['groups'] ?? [] as $g) {
                $labels[] = $g;
            }
            if (! empty($node['children'])) {
                foreach ($this->collectGroupLabelsFromTree($node['children']) as $g) {
                    $labels[] = $g;
                }
            }
        }
        return array_values(array_unique($labels));
    }

    /**
     * Build nested tree from reply_template_tree config. Each node: id, label, keys, children.
     */
    private function buildTree(array $treeConfig, array $byGroup): array
    {
        $result = [];
        foreach ($treeConfig as $node) {
            $groups = $node['groups'] ?? [];
            $keys = [];
            foreach ($groups as $groupLabel) {
                if (isset($byGroup[$groupLabel])) {
                    foreach ($byGroup[$groupLabel] as $keyMeta) {
                        $keys[] = $keyMeta;
                    }
                }
            }
            $children = [];
            if (! empty($node['children'])) {
                $children = $this->buildTree($node['children'], $byGroup);
            }
            $result[] = [
                'id' => $node['id'] ?? '',
                'label' => $node['label'] ?? '',
                'keys' => $keys,
                'children' => $children,
            ];
        }
        return $result;
    }

    /**
     * Fallback when reply_template_tree is missing: flat list of groups in GROUP_ORDER + any other groups.
     */
    private function buildFlatGroupsFallback(array $byGroup): array
    {
        $groups = [];
        foreach (self::GROUP_ORDER_FALLBACK as $label) {
            if (isset($byGroup[$label]) && $byGroup[$label] !== []) {
                $groups[] = [
                    'id' => str_replace([' ', '&'], ['_', ''], strtolower($label)),
                    'label' => $label,
                    'keys' => $byGroup[$label],
                    'children' => [],
                ];
            }
        }
        foreach (array_keys($byGroup) as $label) {
            if (! in_array($label, self::GROUP_ORDER_FALLBACK, true)) {
                $groups[] = [
                    'id' => str_replace([' ', '&'], ['_', ''], strtolower($label)),
                    'label' => $label,
                    'keys' => $byGroup[$label],
                    'children' => [],
                ];
            }
        }
        return $groups;
    }
}
