<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\GameMode;
use App\Enums\GameResult;
use App\Enums\GameStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameMoveRequest;
use App\Http\Requests\StoreGameRequest;
use App\Models\Game;
use App\Models\User;
use App\Services\AiGameService;
use App\Services\CasualGameService;
use App\Services\GameRewardService;
use App\Services\ShopService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class GameController extends Controller
{
    public function __construct(
        private readonly AiGameService $aiGameService,
        private readonly CasualGameService $casualGameService,
        private readonly GameRewardService $gameRewardService,
        private readonly ShopService $shopService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => ['nullable', 'string', 'in:casual,ranked,ai'],
            'status' => ['nullable', 'string', 'in:waiting,active,finished,aborted'],
            'include_hidden' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        $userId = $user->id;
        $hiddenGameIds = $user->hiddenGames()->pluck('game_id');

        $games = Game::query()
            ->with([
                'whitePlayer:id,username,name',
                'whitePlayer.profile.equippedPieceCosmetic',
                'blackPlayer:id,username,name',
                'blackPlayer.profile.equippedPieceCosmetic',
                'winner:id,username,name',
            ])
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('created_by_user_id', $userId)
                    ->orWhere('white_player_id', $userId)
                    ->orWhere('black_player_id', $userId);
            })
            ->when($request->filled('mode'), fn ($query) => $query->where('mode', $request->string('mode')->toString()))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when(! $request->boolean('include_hidden'), fn ($query) => $query->whereNotIn('id', $hiddenGameIds))
            ->latest('id')
            ->paginate(20);

        return response()->json([
            'data' => $games->getCollection()
                ->map(fn (Game $game) => $this->formatGame($game, false, $hiddenGameIds->contains($game->id)))
                ->all(),
            'meta' => [
                'current_page' => $games->currentPage(),
                'last_page' => $games->lastPage(),
                'per_page' => $games->perPage(),
                'total' => $games->total(),
            ],
        ]);
    }

    public function openCasual(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $games = Game::query()
            ->with([
                'whitePlayer:id,username,name',
                'whitePlayer.profile.equippedPieceCosmetic',
                'blackPlayer:id,username,name',
                'blackPlayer.profile.equippedPieceCosmetic',
                'winner:id,username,name',
            ])
            ->where('mode', GameMode::Casual)
            ->where('status', GameStatus::Waiting)
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('white_player_id', '!=', $userId)
                    ->orWhereNull('white_player_id');
            })
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('black_player_id', '!=', $userId)
                    ->orWhereNull('black_player_id');
            })
            ->latest('id')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $games
                ->map(fn (Game $game) => $this->formatGame($game, false, false))
                ->all(),
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

        if ($mode === GameMode::Ai) {
            $game = $this->aiGameService->initialize($game);
        }

        return response()->json([
            'game' => $this->formatGame($game->load([
                'whitePlayer:id,username,name',
                'whitePlayer.profile.equippedPieceCosmetic',
                'blackPlayer:id,username,name',
                'blackPlayer.profile.equippedPieceCosmetic',
                'winner:id,username,name',
                'moves.user:id,username,name',
            ]), true, false),
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
            'whitePlayer.profile.equippedPieceCosmetic',
            'blackPlayer:id,username,name',
            'blackPlayer.profile.equippedPieceCosmetic',
            'winner:id,username,name',
            'moves.user:id,username,name',
        ]);

        return response()->json([
            'game' => $this->formatGame($game, true, $request->user()->hiddenGames()->where('game_id', $game->id)->exists()),
        ]);
    }

    public function join(Request $request, Game $game): JsonResponse
    {
        try {
            $game = $this->casualGameService->join($game, $request->user());
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'game' => $this->formatGame($game, true, false),
        ]);
    }

    public function storeMove(StoreGameMoveRequest $request, Game $game): JsonResponse
    {
        $this->authorizeGameAccess($request->user()->id, $game);

        try {
            $game = match ($game->mode) {
                GameMode::Ai => $this->aiGameService->submitPlayerMove(
                    game: $game,
                    user: $request->user(),
                    from: $request->string('from')->toString(),
                    to: $request->string('to')->toString(),
                    promotion: $request->input('promotion'),
                    stateVersion: $request->integer('state_version'),
                ),
                GameMode::Casual => $this->casualGameService->submitPlayerMove(
                    game: $game,
                    user: $request->user(),
                    from: $request->string('from')->toString(),
                    to: $request->string('to')->toString(),
                    promotion: $request->input('promotion'),
                    stateVersion: $request->integer('state_version'),
                ),
                default => throw new RuntimeException('This game mode cannot accept moves yet.'),
            };
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'game' => $this->formatGame($game, true, false),
            'user' => $this->formatUser($request->user()->fresh()->load('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic')),
        ]);
    }

    public function resign(Request $request, Game $game): JsonResponse
    {
        $this->authorizeGameAccess($request->user()->id, $game);

        try {
            $game = match ($game->mode) {
                GameMode::Ai => $this->aiGameService->resign($game, $request->user()),
                GameMode::Casual => $this->casualGameService->resign($game, $request->user()),
                default => throw new RuntimeException('This game mode cannot be resigned yet.'),
            };
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'game' => $this->formatGame($game, true, false),
            'user' => $this->formatUser($request->user()->fresh()->load('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic')),
        ]);
    }

    public function hide(Request $request, Game $game): JsonResponse
    {
        $this->authorizeGameAccess($request->user()->id, $game);

        $request->user()->hiddenGames()->firstOrCreate([
            'game_id' => $game->id,
        ]);

        return response()->json([
            'message' => 'Match hidden from your history.',
        ]);
    }

    public function unhide(Request $request, Game $game): JsonResponse
    {
        $this->authorizeGameAccess($request->user()->id, $game);

        $request->user()->hiddenGames()
            ->where('game_id', $game->id)
            ->delete();

        return response()->json([
            'message' => 'Match restored to your history.',
        ]);
    }

    private function authorizeGameAccess(int $userId, Game $game): void
    {
        abort_unless(
            in_array($userId, [$game->created_by_user_id, $game->white_player_id, $game->black_player_id], true),
            403
        );
    }

    private function formatGame(Game $game, bool $includeMoves = false, bool $hidden = false): array
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
            'reward_summary' => $this->gameRewardService->summarize($game),
            'hidden' => $hidden,
            'players' => [
                'white' => $game->whitePlayer ? [
                    'id' => $game->whitePlayer->id,
                    'username' => $game->whitePlayer->username,
                    'name' => $game->whitePlayer->name,
                    'equipped_piece_set' => $this->formatEquippedPieceSet($game->whitePlayer),
                ] : null,
                'black' => $game->blackPlayer ? [
                    'id' => $game->blackPlayer->id,
                    'username' => $game->blackPlayer->username,
                    'name' => $game->blackPlayer->name,
                    'equipped_piece_set' => $this->formatEquippedPieceSet($game->blackPlayer),
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

    private function formatEquippedPieceSet(User $user): ?array
    {
        $pieceSet = $user->profile?->equippedPieceCosmetic;

        if ($pieceSet === null) {
            return null;
        }

        return [
            'slug' => $pieceSet->slug,
            'name' => $pieceSet->name,
            'preview' => $pieceSet->preview,
            'assets' => $pieceSet->assets,
        ];
    }

    private function formatUser($user): array
    {
        $profile = $user->profile ?? $user->profile()->firstOrCreate();
        $indicatorTheme = $this->formatMoveIndicatorTheme($profile->move_indicator_theme);

        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_active' => $user->is_active,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'profile' => [
                'bio' => $profile->bio,
                'country_code' => $profile->country_code,
                'avatar_path' => $profile->avatar_path,
                'board_theme' => [
                    'light' => $profile->board_light_color ?? '#f0d9b5',
                    'dark' => $profile->board_dark_color ?? '#b58863',
                    'pattern' => $profile->board_pattern ?? 'solid',
                    'frame_style' => $profile->board_frame_style ?? 'tournament',
                    'coordinate_style' => $profile->board_coordinate_style ?? 'classic',
                    'effect' => $profile->board_effect ?? 'none',
                    'indicators' => $indicatorTheme,
                ],
                'board_theme_presets' => collect($profile->board_theme_presets ?? [])
                    ->map(fn ($preset) => [
                        'name' => $preset['name'] ?? 'Preset',
                        'light' => $preset['light'] ?? '#f0d9b5',
                        'dark' => $preset['dark'] ?? '#b58863',
                        'pattern' => $preset['pattern'] ?? 'solid',
                        'frame_style' => $preset['frame_style'] ?? 'tournament',
                        'coordinate_style' => $preset['coordinate_style'] ?? 'classic',
                        'effect' => $preset['effect'] ?? 'none',
                        'indicators' => $this->formatMoveIndicatorTheme($preset['indicators'] ?? null),
                    ])
                    ->values()
                    ->all(),
                'daily_missions' => $profile->daily_missions ?? [],
                'achievements' => $profile->achievements ?? [],
                'equipped_board' => $profile->equippedBoardCosmetic ? [
                    'slug' => $profile->equippedBoardCosmetic->slug,
                    'name' => $profile->equippedBoardCosmetic->name,
                    'preview' => $profile->equippedBoardCosmetic->preview,
                    'assets' => $profile->equippedBoardCosmetic->assets,
                ] : null,
                'equipped_piece_set' => $profile->equippedPieceCosmetic ? [
                    'slug' => $profile->equippedPieceCosmetic->slug,
                    'name' => $profile->equippedPieceCosmetic->name,
                    'preview' => $profile->equippedPieceCosmetic->preview,
                    'assets' => $profile->equippedPieceCosmetic->assets,
                ] : null,
                'default_piece_sets' => $this->shopService->defaultPieceSets(),
                'ranked_rating' => $profile->ranked_rating,
                'highest_ranked_rating' => $profile->highest_ranked_rating,
                'experience' => $profile->experience,
                'level' => $profile->level,
                'soft_currency' => $profile->soft_currency,
            ],
        ];
    }

    private function formatMoveIndicatorTheme(?array $theme): array
    {
        return [
            'move_dot_color' => $theme['move_dot_color'] ?? '#ffffff',
            'capture_ring_color' => $theme['capture_ring_color'] ?? '#de4e4e',
            'selected_outline_color' => $theme['selected_outline_color'] ?? '#c9a84c',
            'last_move_overlay_color' => $theme['last_move_overlay_color'] ?? 'rgba(201,168,76,0.18)',
        ];
    }
}
