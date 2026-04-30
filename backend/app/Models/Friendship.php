<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'requester_user_id',
    'addressee_user_id',
    'status',
    'responded_at',
])]
class Friendship extends Model
{
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function addressee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'addressee_user_id');
    }

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }
}
