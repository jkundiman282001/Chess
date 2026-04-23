<?php

namespace App\Services;

use App\Enums\GameResult;
use App\Enums\GameStatus;
use App\Enums\GameTerminationReason;
use App\Models\Game;
use App\Models\User;

class GameRewardService
{
    public function __construct(private readonly ProgressionService $progressionService) {}

    public function settleAiRewards(Game $game): void
    {
        if ($game->status !== GameStatus::Finished || $game->rewards_granted_at !== null) {
            return;
        }

        $player = $this->resolveHumanPlayer($game);

        if (! $player) {
            return;
        }

        $profile = $player->profile()->firstOrCreate();
        $rewards = $this->calculateAiRewards($game, $player);

        $totalExperience = $profile->experience + $rewards['experience'];

        $profile->forceFill([
            'soft_currency' => $profile->soft_currency + $rewards['coins'],
            'experience' => $totalExperience,
            'level' => $this->levelForExperience($totalExperience),
        ])->save();

        $game->forceFill([
            'reward_soft_currency' => $rewards['coins'],
            'reward_experience' => $rewards['experience'],
            'rewards_granted_at' => now(),
        ])->save();

        $this->progressionService->processFinishedAiGame($player);
    }

    public function summarize(Game $game): ?array
    {
        if ($game->mode->value !== 'ai' || $game->rewards_granted_at === null) {
            return null;
        }

        return [
            'coins' => $game->reward_soft_currency,
            'experience' => $game->reward_experience,
            'granted_at' => $game->rewards_granted_at?->toIso8601String(),
        ];
    }

    private function calculateAiRewards(Game $game, User $player): array
    {
        $skill = max(1, min(20, $game->ai_skill_level ?? 6));
        $moveBonus = min(18, intdiv(max(0, $game->state_version), 6));

        $won =
            ($game->result === GameResult::WhiteWin && $game->white_player_id === $player->id) ||
            ($game->result === GameResult::BlackWin && $game->black_player_id === $player->id);

        $drew = $game->result === GameResult::Draw;
        $resignedLoss = $game->termination_reason === GameTerminationReason::Resignation && ! $won;

        if ($won) {
            return [
                'coins' => 24 + ($skill * 6) + $moveBonus,
                'experience' => 48 + ($skill * 11) + ($moveBonus * 2),
            ];
        }

        if ($drew) {
            return [
                'coins' => 10 + ($skill * 3) + intdiv($moveBonus, 2),
                'experience' => 22 + ($skill * 5) + $moveBonus,
            ];
        }

        if ($resignedLoss) {
            return [
                'coins' => 0,
                'experience' => 5,
            ];
        }

        return [
            'coins' => 4 + intdiv($skill, 2),
            'experience' => 14 + ($skill * 3) + $moveBonus,
        ];
    }

    private function levelForExperience(int $experience): int
    {
        $level = 1;
        $requiredForNextLevel = 100;
        $remainingExperience = $experience;

        while ($remainingExperience >= $requiredForNextLevel) {
            $remainingExperience -= $requiredForNextLevel;
            $level += 1;
            $requiredForNextLevel = $level * 100;
        }

        return $level;
    }

    private function resolveHumanPlayer(Game $game): ?User
    {
        $playerId = $game->white_player_id ?? $game->black_player_id ?? $game->created_by_user_id;

        if ($playerId === null) {
            return null;
        }

        return User::query()->find($playerId);
    }
}
