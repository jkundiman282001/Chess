<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'cosmetic_item_id',
])]
class UserCosmetic extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cosmeticItem(): BelongsTo
    {
        return $this->belongsTo(CosmeticItem::class);
    }
}
