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
            'board_light_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_dark_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_pattern' => ['sometimes', 'string', Rule::in(['solid', 'wood', 'marble', 'obsidian', 'parchment', 'neon'])],
            'board_frame_style' => ['sometimes', 'string', Rule::in(['none', 'tournament', 'gold', 'iron', 'royal'])],
            'board_coordinate_style' => ['sometimes', 'string', Rule::in(['classic', 'mono', 'minimal', 'hidden'])],
            'board_effect' => ['sometimes', 'string', Rule::in(['none', 'fire'])],
            'move_indicator_theme' => ['sometimes', 'array'],
            'move_indicator_theme.move_dot_color' => ['required_with:move_indicator_theme', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'move_indicator_theme.capture_ring_color' => ['required_with:move_indicator_theme', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'move_indicator_theme.selected_outline_color' => ['required_with:move_indicator_theme', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'move_indicator_theme.last_move_overlay_color' => ['required_with:move_indicator_theme', 'regex:/^rgba\((\s*\d{1,3}\s*,){3}\s*(0|0?\.\d+|1(\.0+)?)\)$/'],
            'board_theme_presets' => ['sometimes', 'array', 'max:8'],
            'board_theme_presets.*.name' => ['required_with:board_theme_presets', 'string', 'min:1', 'max:40'],
            'board_theme_presets.*.light' => ['required_with:board_theme_presets', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_theme_presets.*.dark' => ['required_with:board_theme_presets', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_theme_presets.*.pattern' => ['required_with:board_theme_presets', 'string', Rule::in(['solid', 'wood', 'marble', 'obsidian', 'parchment', 'neon'])],
            'board_theme_presets.*.frame_style' => ['required_with:board_theme_presets', 'string', Rule::in(['none', 'tournament', 'gold', 'iron', 'royal'])],
            'board_theme_presets.*.coordinate_style' => ['required_with:board_theme_presets', 'string', Rule::in(['classic', 'mono', 'minimal', 'hidden'])],
            'board_theme_presets.*.indicators' => ['required_with:board_theme_presets', 'array'],
            'board_theme_presets.*.indicators.move_dot_color' => ['required_with:board_theme_presets.*.indicators', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_theme_presets.*.indicators.capture_ring_color' => ['required_with:board_theme_presets.*.indicators', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_theme_presets.*.indicators.selected_outline_color' => ['required_with:board_theme_presets.*.indicators', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'board_theme_presets.*.indicators.last_move_overlay_color' => ['required_with:board_theme_presets.*.indicators', 'regex:/^rgba\((\s*\d{1,3}\s*,){3}\s*(0|0?\.\d+|1(\.0+)?)\)$/'],
        ];
    }
}
