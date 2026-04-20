<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'username' => ['sometimes', 'string', 'min:3', 'max:24', 'alpha_dash', Rule::unique('users', 'username')->ignore($userId)],
            'name' => ['sometimes', 'nullable', 'string', 'min:3', 'max:50'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'country_code' => ['sometimes', 'nullable', 'string', 'size:2'],
            'avatar_path' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
