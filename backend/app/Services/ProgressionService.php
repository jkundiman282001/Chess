<?php

namespace App\Services;

use App\Enums\GameMode;
use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Carbon;

class ProgressionService
{
    public function syncUserProgress(User $user): void
    {
        $profile = $user->profile()->firstOrCreate();

        $dailyMissions = $this->buildDailyMissionState($user, $profile);
        $achievements = $this->buildAchievementState($user, $profile);

        $profile->forceFill([
            'daily_missions' => $dailyMissions,
            'achievements' => $achievements,
        ])->save();
    }

    public function processFinishedAiGame(User $user): void
    {
        $this->syncUserProgress($user);
    }

    private function buildDailyMissionState(User $user, Profile $profile): array
    {
        $today = now()->toDateString();
        $existing = collect($profile->daily_missions ?? [])->keyBy('key');
        $stats = $this->todayAiStats($user);

        return collect($this->dailyMissionTemplates())->map(function (array $template) use ($existing, $today, $profile, $stats): array {
            $current = $existing->get($template['key']);

            if (($current['date'] ?? null) !== $today) {
                $current = null;
            }

            $progress = min($template['target'], (int) ($stats[$template['metric']] ?? 0));
            $completed = $progress >= $template['target'];
            $rewardedAt = $current['rewarded_at'] ?? null;

            if ($completed && $rewardedAt === null) {
                $this->grantProfileRewards($profile, $template['reward']['coins'], $template['reward']['experience']);
                $rewardedAt = now()->toIso8601String();
            }

            return [
                'key' => $template['key'],
                'title' => $template['title'],
                'description' => $template['description'],
                'date' => $today,
                'target' => $template['target'],
                'progress' => $progress,
                'completed' => $completed,
                'reward' => $template['reward'],
                'rewarded_at' => $rewardedAt,
            ];
        })->values()->all();
    }

    private function buildAchievementState(User $user, Profile $profile): array
    {
        $existing = collect($profile->achievements ?? [])->keyBy('key');
        $stats = $this->lifetimeAiStats($user);

        return collect($this->achievementTemplates())->map(function (array $template) use ($existing, $profile, $stats): array {
            $current = $existing->get($template['key'], []);
            $progress = min($template['target'], (int) ($stats[$template['metric']] ?? 0));
            $unlocked = (($current['unlocked'] ?? false) === true) || $progress >= $template['target'];
            $unlockedAt = $current['unlocked_at'] ?? null;
            $rewardedAt = $current['rewarded_at'] ?? null;

            if ($unlocked && $unlockedAt === null) {
                $unlockedAt = now()->toIso8601String();
            }

            if ($unlocked && $rewardedAt === null) {
                $this->grantProfileRewards($profile, $template['reward']['coins'], $template['reward']['experience']);
                $rewardedAt = now()->toIso8601String();
            }

            return [
                'key' => $template['key'],
                'title' => $template['title'],
                'description' => $template['description'],
                'target' => $template['target'],
                'progress' => $progress,
                'unlocked' => $unlocked,
                'reward' => $template['reward'],
                'unlocked_at' => $unlockedAt,
                'rewarded_at' => $rewardedAt,
            ];
        })->values()->all();
    }

    private function todayAiStats(User $user): array
    {
        $today = Carbon::today();
        $baseQuery = $this->userAiGamesQuery($user)
            ->where('status', GameStatus::Finished->value)
            ->whereDate('ended_at', $today);

        return [
            'games_played' => (clone $baseQuery)->count(),
            'wins' => (clone $baseQuery)->where('winner_user_id', $user->id)->count(),
            'completed_games' => (clone $baseQuery)->count(),
        ];
    }

    private function lifetimeAiStats(User $user): array
    {
        $baseQuery = $this->userAiGamesQuery($user)
            ->where('status', GameStatus::Finished->value);

        return [
            'wins' => (clone $baseQuery)->where('winner_user_id', $user->id)->count(),
            'games_played' => (clone $baseQuery)->count(),
            'hard_wins' => (clone $baseQuery)
                ->where('winner_user_id', $user->id)
                ->where('ai_skill_level', '>=', 10)
                ->count(),
        ];
    }

    private function userAiGamesQuery(User $user)
    {
        return Game::query()
            ->where('mode', GameMode::Ai->value)
            ->where(function ($query) use ($user): void {
                $query
                    ->where('white_player_id', $user->id)
                    ->orWhere('black_player_id', $user->id)
                    ->orWhere('created_by_user_id', $user->id);
            });
    }

    private function dailyMissionTemplates(): array
    {
        return [
            [
                'key' => 'daily_play_1',
                'title' => 'Warm-Up Game',
                'description' => 'Finish 1 AI match today.',
                'metric' => 'games_played',
                'target' => 1,
                'reward' => ['coins' => 30, 'experience' => 40],
            ],
            [
                'key' => 'daily_win_1',
                'title' => 'Daily Victory',
                'description' => 'Win 1 AI match today.',
                'metric' => 'wins',
                'target' => 1,
                'reward' => ['coins' => 55, 'experience' => 70],
            ],
            [
                'key' => 'daily_finish_2',
                'title' => 'Keep Playing',
                'description' => 'Finish 2 AI matches today.',
                'metric' => 'completed_games',
                'target' => 2,
                'reward' => ['coins' => 45, 'experience' => 60],
            ],
        ];
    }

    private function achievementTemplates(): array
    {
        return [
            [
                'key' => 'achievement_first_win',
                'title' => 'First Victory',
                'description' => 'Win your first AI game.',
                'metric' => 'wins',
                'target' => 1,
                'reward' => ['coins' => 80, 'experience' => 100],
            ],
            [
                'key' => 'achievement_five_wins',
                'title' => 'Hot Streak',
                'description' => 'Reach 5 AI wins.',
                'metric' => 'wins',
                'target' => 5,
                'reward' => ['coins' => 140, 'experience' => 180],
            ],
            [
                'key' => 'achievement_ten_games',
                'title' => 'Regular Player',
                'description' => 'Finish 10 AI games.',
                'metric' => 'games_played',
                'target' => 10,
                'reward' => ['coins' => 160, 'experience' => 220],
            ],
            [
                'key' => 'achievement_hard_win',
                'title' => 'Giant Slayer',
                'description' => 'Beat AI skill 10 or higher.',
                'metric' => 'hard_wins',
                'target' => 1,
                'reward' => ['coins' => 180, 'experience' => 240],
            ],
        ];
    }

    private function grantProfileRewards(Profile $profile, int $coins, int $experience): void
    {
        $totalExperience = $profile->experience + $experience;

        $profile->forceFill([
            'soft_currency' => $profile->soft_currency + $coins,
            'experience' => $totalExperience,
            'level' => $this->levelForExperience($totalExperience),
        ])->save();
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
}
