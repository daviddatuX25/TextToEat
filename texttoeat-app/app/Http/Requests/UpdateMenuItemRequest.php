<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'category' => ['sometimes', 'string', 'max:255'],
            'units_today' => ['sometimes', 'integer', 'min:0'],
            'is_sold_out' => ['sometimes', 'boolean'],
        ];
    }
}
