<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['username', 'name', 'email', 'password', 'is_admin', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function createdGames(): HasMany
    {
        return $this->hasMany(Game::class, 'created_by_user_id');
    }

    public function whiteGames(): HasMany
    {
        return $this->hasMany(Game::class, 'white_player_id');
    }

    public function blackGames(): HasMany
    {
        return $this->hasMany(Game::class, 'black_player_id');
    }

    public function wonGames(): HasMany
    {
        return $this->hasMany(Game::class, 'winner_user_id');
    }

    public function gameMoves(): HasMany
    {
        return $this->hasMany(GameMove::class, 'by_user_id');
    }

    public function userCosmetics(): HasMany
    {
        return $this->hasMany(UserCosmetic::class);
    }

    public function hiddenGames(): HasMany
    {
        return $this->hasMany(UserHiddenGame::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
