<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'slug',
    'name',
    'category',
    'rarity',
    'description',
    'price_soft_currency',
    'sort_order',
    'is_active',
    'preview',
    'assets',
])]
class CosmeticItem extends Model
{
    protected function casts(): array
    {
        return [
            'preview' => 'array',
            'assets' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function userCosmetics(): HasMany
    {
        return $this->hasMany(UserCosmetic::class);
    }
}
