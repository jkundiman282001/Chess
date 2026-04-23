<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\ProgressionService;
use App\Services\ShopService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly ShopService $shopService,
        private readonly ProgressionService $progressionService,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::query()->create([
            'username' => $request->string('username')->toString(),
            'name' => $request->string('name')->toString() ?: $request->string('username')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
        ]);

        $user->profile()->create();
        $this->shopService->ensureStarterCosmetics($user);
        $this->progressionService->syncUserProgress($user);

        $token = $user->createToken($request->userAgent() ?: 'web-client')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUser($user->fresh()->load('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic')),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $login = $request->string('login')->toString();
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $user = User::query()
            ->with('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic')
            ->where($field, $login)
            ->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'login' => ['This account is disabled.'],
            ]);
        }

        $this->shopService->ensureStarterCosmetics($user);
        $this->progressionService->syncUserProgress($user);

        $deviceName = $request->string('device_name')->toString() ?: ($request->userAgent() ?: 'web-client');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUser($user->fresh()->load('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic')),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');
        $this->shopService->ensureStarterCosmetics($user);
        $this->progressionService->syncUserProgress($user);

        return response()->json([
            'user' => $this->formatUser($user->fresh()->load('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }

    private function formatUser(User $user): array
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
            'profile' => $profile ? [
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
            ] : null,
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
