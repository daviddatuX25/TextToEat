<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMenuItemRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'category' => ['sometimes', 'string', Rule::in(config('menu.categories', []))],
            'units_today' => ['sometimes', 'integer', 'min:0'],
            'is_sold_out' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }
}
