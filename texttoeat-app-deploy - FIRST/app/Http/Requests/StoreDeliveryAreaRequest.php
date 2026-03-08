<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeliveryAreaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'is_free' => ['required', 'boolean'],
            'fee' => [
                'nullable',
                'numeric',
                'min:0',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($this->boolean('is_free')) {
                        if ($value !== null && $value !== '' && (float) $value > 0) {
                            $fail('Fee must be empty or zero when area is free.');
                        }
                        return;
                    }
                    if ($value !== null && $value !== '' && (float) $value < 0) {
                        $fail('Fee must be at least 0 when set.');
                    }
                },
            ],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
