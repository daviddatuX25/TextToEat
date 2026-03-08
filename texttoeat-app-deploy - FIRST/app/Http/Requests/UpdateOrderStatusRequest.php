<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderStatusRequest extends FormRequest
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
            'status' => ['required_without:payment_status', 'string', 'in:received,confirmed,ready,on_the_way,completed,cancelled'],
            'payment_status' => ['required_without:status', 'string', 'in:unpaid,paid'],
        ];
    }
}
