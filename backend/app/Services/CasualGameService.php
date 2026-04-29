<?php

namespace App\Services;

use App\Enums\GameMode;
use App\Enums\GameResult;
use App\Enums\GameStatus;
use App\Enums\GameTerminationReason;
use App\Models\Game;
use App\Models\GameMove;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use PChess\Chess\Chess;
use PChess\Chess\Move;
use PChess\Chess\Piece;
use RuntimeException;

class CasualGameService
{
    public function join(Game $game, User $user): Game
    {
        return DB::transaction(function () use ($game, $user): Game {
            /** @var Game $lockedGame */
            $lockedGame = Game::query()
                ->whereKey($game->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedGame->mode !== GameMode::Casual) {
                throw new RuntimeException('Only casual games can be joined from the casual lobby.');
            }

            if ($lockedGame->status !== GameStatus::Waiting) {
                throw new RuntimeException('This casual game is no longer waiting for an opponent.');
            }

            if ($this->resolvePlayerColor($lockedGame, $user) !== null) {
                throw new RuntimeException('You are already a player in this game.');
            }

            if ($lockedGame->white_player_id === null) {
                $lockedGame->white_player_id = $user->id;
            } elseif ($lockedGame->black_player_id === null) {
                $lockedGame->black_player_id = $user->id;
            } else {
                throw new RuntimeException('This casual game is already full.');
            }

            $lockedGame->forceFill([
                'status' => GameStatus::Active,
                'started_at' => now(),
            ])->save();

            return $lockedGame->fresh([
                'whitePlayer:id,username,name',
                'whitePlayer.profile.equippedPieceCosmetic',
                'blackPlayer:id,username,name',
                'blackPlayer.profile.equippedPieceCosmetic',
                'winner:id,username,name',
                'moves.user:id,username,name',
            ]);
        });
    }

    public function submitPlayerMove(
        Game $game,
        User $user,
        string $from,
        string $to,
        ?string $promotion,
        int $stateVersion,
    ): Game {
        return DB::transaction(function () use ($game, $user, $from, $to, $promotion, $stateVersion): Game {
            /** @var Game $lockedGame */
            $lockedGame = Game::query()
                ->whereKey($game->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedGame->mode !== GameMode::Casual) {
                throw new RuntimeException('Only casual games can use casual move submission.');
            }

            if ($lockedGame->status !== GameStatus::Active) {
                throw new RuntimeException('This game is not active.');
            }

            if ($lockedGame->state_version !== $stateVersion) {
                throw new RuntimeException('This game has advanced. Refresh and try again.');
            }

            $playerColor = $this->resolvePlayerColor($lockedGame, $user);

            if ($playerColor === null) {
                throw new RuntimeException('You are not a player in this game.');
            }

            if ($this->currentTurn($lockedGame) !== $playerColor) {
                throw new RuntimeException('It is not your turn.');
            }

            $chess = new Chess($lockedGame->current_fen);
            $move = $chess->move([
                'from' => $from,
                'to' => $to,
                'promotion' => $promotion,
            ]);

            if ($move === null) {
                throw new RuntimeException('Illegal move.');
            }

            $this->persistMove($lockedGame, $move, $chess, $user->id);
            $this->finalizeIfFinished($lockedGame, $chess, $move);

            return $lockedGame->fresh([
                'whitePlayer:id,username,name',
                'whitePlayer.profile.equippedPieceCosmetic',
                'blackPlayer:id,username,name',
                'blackPlayer.profile.equippedPieceCosmetic',
                'winner:id,username,name',
                'moves.user:id,username,name',
            ]);
        });
    }

    public function resign(Game $game, User $user): Game
    {
        return DB::transaction(function () use ($game, $user): Game {
            /** @var Game $lockedGame */
            $lockedGame = Game::query()
                ->whereKey($game->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedGame->mode !== GameMode::Casual) {
                throw new RuntimeException('Only casual games can use casual resignation.');
            }

            if ($lockedGame->status !== GameStatus::Active) {
                throw new RuntimeException('This game is not active.');
            }

            $playerColor = $this->resolvePlayerColor($lockedGame, $user);

            if ($playerColor === null) {
                throw new RuntimeException('You are not a player in this game.');
            }

            $winnerUserId = $playerColor === Piece::WHITE ? $lockedGame->black_player_id : $lockedGame->white_player_id;
            $result = $playerColor === Piece::WHITE ? GameResult::BlackWin : GameResult::WhiteWin;

            $lockedGame->forceFill([
                'status' => GameStatus::Finished,
                'result' => $result,
                'termination_reason' => GameTerminationReason::Resignation,
                'winner_user_id' => $winnerUserId,
                'ended_at' => now(),
            ])->save();

            return $lockedGame->fresh([
                'whitePlayer:id,username,name',
                'whitePlayer.profile.equippedPieceCosmetic',
                'blackPlayer:id,username,name',
                'blackPlayer.profile.equippedPieceCosmetic',
                'winner:id,username,name',
                'moves.user:id,username,name',
            ]);
        });
    }

    private function persistMove(Game $game, Move $move, Chess $chess, ?int $byUserId): void
    {
        $ply = $game->state_version + 1;

        GameMove::query()->create([
            'game_id' => $game->id,
            'by_user_id' => $byUserId,
            'ply' => $ply,
            'move_number' => intdiv($ply + 1, 2),
            'san' => $move->san ?? "{$move->from}{$move->to}",
            'uci' => $move->from.$move->to.($move->promotion ?? ''),
            'fen_after' => $chess->fen(),
        ]);

        $game->forceFill([
            'current_fen' => $chess->fen(),
            'state_version' => $ply,
            'last_move_at' => now(),
        ])->save();
    }

    private function finalizeIfFinished(Game $game, Chess $chess, Move $move): void
    {
        if (! $chess->gameOver()) {
            return;
        }

        $winnerUserId = null;
        $result = GameResult::Draw;
        $reason = GameTerminationReason::DrawAgreement;

        if ($chess->inCheckmate()) {
            $winnerColor = $move->turn;
            $winnerUserId = $winnerColor === Piece::WHITE ? $game->white_player_id : $game->black_player_id;
            $result = $winnerColor === Piece::WHITE ? GameResult::WhiteWin : GameResult::BlackWin;
            $reason = GameTerminationReason::Checkmate;
        } elseif ($chess->inStalemate()) {
            $reason = GameTerminationReason::Stalemate;
        } elseif ($chess->insufficientMaterial()) {
            $reason = GameTerminationReason::InsufficientMaterial;
        } elseif ($chess->inThreefoldRepetition()) {
            $reason = GameTerminationReason::ThreefoldRepetition;
        } elseif ($chess->halfMovesExceeded()) {
            $reason = GameTerminationReason::FiftyMoveRule;
        }

        $game->forceFill([
            'status' => GameStatus::Finished,
            'result' => $result,
            'termination_reason' => $reason,
            'winner_user_id' => $winnerUserId,
            'ended_at' => now(),
        ])->save();
    }

    private function resolvePlayerColor(Game $game, User $user): ?string
    {
        if ($game->white_player_id === $user->id) {
            return Piece::WHITE;
        }

        if ($game->black_player_id === $user->id) {
            return Piece::BLACK;
        }

        return null;
    }

    private function currentTurn(Game $game): string
    {
        return explode(' ', $game->current_fen)[1] ?? Piece::WHITE;
    }
}
