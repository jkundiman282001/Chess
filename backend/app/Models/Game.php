<?php

namespace App\Models;

use App\Enums\GameMode;
use App\Enums\GameResult;
use App\Enums\GameStatus;
use App\Enums\GameTerminationReason;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'public_id',
    'created_by_user_id',
    'white_player_id',
    'black_player_id',
    'winner_user_id',
    'mode',
    'status',
    'result',
    'termination_reason',
    'rated',
    'time_control_name',
    'initial_time_seconds',
    'increment_seconds',
    'starting_fen',
    'current_fen',
    'state_version',
    'pgn',
    'ai_opponent_name',
    'ai_skill_level',
    'reward_soft_currency',
    'reward_experience',
    'rewards_granted_at',
    'last_move_at',
    'started_at',
    'ended_at',
])]
class Game extends Model
{
    public const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function whitePlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'white_player_id');
    }

    public function blackPlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'black_player_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function moves(): HasMany
    {
        return $this->hasMany(GameMove::class)->orderBy('ply');
    }

    protected function casts(): array
    {
        return [
            'mode' => GameMode::class,
            'status' => GameStatus::class,
            'result' => GameResult::class,
            'termination_reason' => GameTerminationReason::class,
            'rated' => 'boolean',
            'rewards_granted_at' => 'datetime',
            'last_move_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }
}
