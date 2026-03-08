<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
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
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:50'],
            'delivery_type' => ['required', 'string', 'in:pickup,delivery'],
            'delivery_place' => ['nullable', 'string', 'max:255'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
