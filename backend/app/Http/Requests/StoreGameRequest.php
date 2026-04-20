<?php

namespace App\Http\Requests;

use App\Enums\GameMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mode' => ['required', Rule::enum(GameMode::class)],
            'color_preference' => ['nullable', Rule::in(['white', 'black', 'random'])],
            'initial_time_seconds' => ['required', 'integer', 'min:60', 'max:10800'],
            'increment_seconds' => ['required', 'integer', 'min:0', 'max:60'],
            'ai_skill_level' => ['nullable', 'integer', 'min:1', 'max:20'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $mode = $this->input('mode');
                $aiSkillLevel = $this->input('ai_skill_level');

                if ($mode === GameMode::Ai->value && $aiSkillLevel === null) {
                    $validator->errors()->add('ai_skill_level', 'The ai_skill_level field is required for AI games.');
                }

                if ($mode !== GameMode::Ai->value && $aiSkillLevel !== null) {
                    $validator->errors()->add('ai_skill_level', 'The ai_skill_level field is only allowed for AI games.');
                }
            },
        ];
    }
}
