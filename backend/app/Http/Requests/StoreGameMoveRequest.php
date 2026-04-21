<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGameMoveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'string', 'size:2', 'regex:/^[a-h][1-8]$/'],
            'to' => ['required', 'string', 'size:2', 'regex:/^[a-h][1-8]$/'],
            'promotion' => ['nullable', 'string', Rule::in(['q', 'r', 'b', 'n'])],
            'state_version' => ['required', 'integer', 'min:0'],
        ];
    }
}
