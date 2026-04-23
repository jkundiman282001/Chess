<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Services\ProgressionService;
use App\Services\ShopService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ShopService $shopService,
        private readonly ProgressionService $progressionService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');
        $this->progressionService->syncUserProgress($user);
        $profile = $user->profile()->firstOrCreate();
        $indicatorTheme = $this->formatMoveIndicatorTheme($profile->move_indicator_theme);

        return response()->json([
            'profile' => [
                'username' => $user->username,
                'name' => $user->name,
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
                'board_theme_presets' => $this->formatBoardThemePresets($profile->board_theme_presets),
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
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->profile()->firstOrCreate();
        $profile->loadMissing('equippedBoardCosmetic', 'equippedPieceCosmetic');

        $user->fill($request->safe()->only(['username', 'name']));
        $user->save();

        $profile->fill($request->safe()->only([
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
        ]));
        $profile->save();
        $this->progressionService->syncUserProgress($user);
        $profile = $profile->fresh();
        $profile->loadMissing('equippedBoardCosmetic', 'equippedPieceCosmetic');
        $indicatorTheme = $this->formatMoveIndicatorTheme($profile->move_indicator_theme);

        return response()->json([
            'message' => 'Profile updated.',
            'profile' => [
                'username' => $user->username,
                'name' => $user->name,
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
                'board_theme_presets' => $this->formatBoardThemePresets($profile->board_theme_presets),
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
        ]);
    }

    private function formatBoardThemePresets(?array $presets): array
    {
        return collect($presets ?? [])
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
            ->all();
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
