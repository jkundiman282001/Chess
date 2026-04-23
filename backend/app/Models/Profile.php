<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo as BelongsToRelation;

#[Fillable([
    'bio',
    'country_code',
    'avatar_path',
    'board_light_color',
    'board_dark_color',
    'board_pattern',
    'board_frame_style',
    'board_coordinate_style',
    'board_effect',
    'move_indicator_theme',
    'board_theme_presets',
    'daily_missions',
    'achievements',
    'equipped_board_cosmetic_id',
    'equipped_piece_cosmetic_id',
    'ranked_rating',
    'highest_ranked_rating',
    'experience',
    'level',
    'soft_currency',
])]
class Profile extends Model
{
    protected function casts(): array
    {
        return [
            'move_indicator_theme' => 'array',
            'board_theme_presets' => 'array',
            'daily_missions' => 'array',
            'achievements' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function equippedBoardCosmetic(): BelongsToRelation
    {
        return $this->belongsTo(CosmeticItem::class, 'equipped_board_cosmetic_id');
    }

    public function equippedPieceCosmetic(): BelongsToRelation
    {
        return $this->belongsTo(CosmeticItem::class, 'equipped_piece_cosmetic_id');
    }
}
