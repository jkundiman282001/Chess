<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\GameMode;
use App\Enums\GameResult;
use App\Enums\GameStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GameController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => ['nullable', 'string', 'in:casual,ranked,ai'],
            'status' => ['nullable', 'string', 'in:waiting,active,finished,aborted'],
        ]);

        $userId = $request->user()->id;

        $games = Game::query()
            ->with(['whitePlayer:id,username,name', 'blackPlayer:id,username,name', 'winner:id,username,name'])
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('created_by_user_id', $userId)
                    ->orWhere('white_player_id', $userId)
                    ->orWhere('black_player_id', $userId);
            })
            ->when($request->filled('mode'), fn ($query) => $query->where('mode', $request->string('mode')->toString()))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest('id')
            ->paginate(20);

        return response()->json([
            'data' => $games->getCollection()
                ->map(fn (Game $game) => $this->formatGame($game))
                ->all(),
            'meta' => [
                'current_page' => $games->currentPage(),
                'last_page' => $games->lastPage(),
                'per_page' => $games->perPage(),
                'total' => $games->total(),
            ],
        ]);
    }

    public function store(StoreGameRequest $request): JsonResponse
    {
        $user = $request->user();
        $mode = GameMode::from($request->string('mode')->toString());
        $colorPreference = $request->string('color_preference')->toString() ?: 'random';
        $playsWhite = match ($colorPreference) {
            'white' => true,
            'black' => false,
            default => (bool) random_int(0, 1),
        };

        $game = Game::query()->create([
            'public_id' => (string) Str::ulid(),
            'created_by_user_id' => $user->id,
            'white_player_id' => $playsWhite ? $user->id : null,
            'black_player_id' => $playsWhite ? null : $user->id,
            'mode' => $mode,
            'status' => $mode === GameMode::Ai ? GameStatus::Active : GameStatus::Waiting,
            'result' => GameResult::InProgress,
            'rated' => $mode === GameMode::Ranked,
            'time_control_name' => sprintf(
                '%d+%d',
                $request->integer('initial_time_seconds'),
                $request->integer('increment_seconds'),
            ),
            'initial_time_seconds' => $request->integer('initial_time_seconds'),
            'increment_seconds' => $request->integer('increment_seconds'),
            'starting_fen' => Game::STARTING_FEN,
            'current_fen' => Game::STARTING_FEN,
            'state_version' => 0,
            'ai_opponent_name' => $mode === GameMode::Ai ? 'Stockfish' : null,
            'ai_skill_level' => $mode === GameMode::Ai ? $request->integer('ai_skill_level') : null,
            'started_at' => $mode === GameMode::Ai ? now() : null,
        ]);

        return response()->json([
            'game' => $this->formatGame($game->load(['whitePlayer:id,username,name', 'blackPlayer:id,username,name'])),
        ], 201);
    }

    public function show(Request $request, Game $game): JsonResponse
    {
        $userId = $request->user()->id;
        abort_unless(
            in_array($userId, [$game->created_by_user_id, $game->white_player_id, $game->black_player_id], true),
            403
        );

        $game->load([
            'creator:id,username,name',
            'whitePlayer:id,username,name',
            'blackPlayer:id,username,name',
            'winner:id,username,name',
            'moves.user:id,username,name',
        ]);

        return response()->json([
            'game' => $this->formatGame($game, true),
        ]);
    }

    private function formatGame(Game $game, bool $includeMoves = false): array
    {
        return [
            'id' => $game->public_id,
            'created_by_user_id' => $game->created_by_user_id,
            'mode' => $game->mode->value,
            'status' => $game->status->value,
            'result' => $game->result->value,
            'termination_reason' => $game->termination_reason?->value,
            'rated' => $game->rated,
            'time_control_name' => $game->time_control_name,
            'initial_time_seconds' => $game->initial_time_seconds,
            'increment_seconds' => $game->increment_seconds,
            'starting_fen' => $game->starting_fen,
            'current_fen' => $game->current_fen,
            'state_version' => $game->state_version,
            'ai_opponent_name' => $game->ai_opponent_name,
            'ai_skill_level' => $game->ai_skill_level,
            'players' => [
                'white' => $game->whitePlayer ? [
                    'id' => $game->whitePlayer->id,
                    'username' => $game->whitePlayer->username,
                    'name' => $game->whitePlayer->name,
                ] : null,
                'black' => $game->blackPlayer ? [
                    'id' => $game->blackPlayer->id,
                    'username' => $game->blackPlayer->username,
                    'name' => $game->blackPlayer->name,
                ] : null,
                'winner' => $game->winner ? [
                    'id' => $game->winner->id,
                    'username' => $game->winner->username,
                    'name' => $game->winner->name,
                ] : null,
            ],
            'started_at' => $game->started_at?->toIso8601String(),
            'last_move_at' => $game->last_move_at?->toIso8601String(),
            'ended_at' => $game->ended_at?->toIso8601String(),
            'moves' => $includeMoves
                ? $game->moves->map(fn ($move) => [
                    'ply' => $move->ply,
                    'move_number' => $move->move_number,
                    'san' => $move->san,
                    'uci' => $move->uci,
                    'fen_after' => $move->fen_after,
                    'move_time_ms' => $move->move_time_ms,
                    'created_at' => $move->created_at?->toIso8601String(),
                    'player' => $move->user ? [
                        'id' => $move->user->id,
                        'username' => $move->user->username,
                        'name' => $move->user->name,
                    ] : null,
                ])->all()
                : null,
        ];
    }
}
