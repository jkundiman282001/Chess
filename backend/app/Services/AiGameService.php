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

class AiGameService
{
    private const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    private const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

    private const PIECE_VALUES = [
        Piece::PAWN => 100,
        Piece::KNIGHT => 320,
        Piece::BISHOP => 330,
        Piece::ROOK => 500,
        Piece::QUEEN => 900,
        Piece::KING => 20000,
    ];

    public function initialize(Game $game): Game
    {
        if ($game->mode !== GameMode::Ai || $game->white_player_id !== null) {
            return $game;
        }

        return DB::transaction(function () use ($game): Game {
            /** @var Game $lockedGame */
            $lockedGame = Game::query()
                ->whereKey($game->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedGame->state_version > 0 || $lockedGame->white_player_id !== null) {
                return $lockedGame->fresh(['whitePlayer:id,username,name', 'blackPlayer:id,username,name', 'winner:id,username,name', 'moves.user:id,username,name']);
            }

            $chess = new Chess($lockedGame->current_fen);
            $this->playAiTurn($lockedGame, $chess);

            return $lockedGame->fresh(['whitePlayer:id,username,name', 'blackPlayer:id,username,name', 'winner:id,username,name', 'moves.user:id,username,name']);
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

            if ($lockedGame->mode !== GameMode::Ai) {
                throw new RuntimeException('Only AI games can accept moves in the current build.');
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

            $chess = new Chess($lockedGame->current_fen);
            $currentTurn = $this->currentTurn($lockedGame);

            if ($currentTurn !== $playerColor) {
                throw new RuntimeException('It is not your turn.');
            }

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

            if ($lockedGame->status === GameStatus::Active) {
                $this->playAiTurn($lockedGame, $chess);
            }

            return $lockedGame->fresh(['whitePlayer:id,username,name', 'blackPlayer:id,username,name', 'winner:id,username,name', 'moves.user:id,username,name']);
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

            if ($lockedGame->mode !== GameMode::Ai) {
                throw new RuntimeException('Only AI games can be resigned in the current build.');
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

            return $lockedGame->fresh(['whitePlayer:id,username,name', 'blackPlayer:id,username,name', 'winner:id,username,name', 'moves.user:id,username,name']);
        });
    }

    private function playAiTurn(Game $game, Chess $chess): void
    {
        if ($game->status !== GameStatus::Active || $chess->gameOver()) {
            return;
        }

        $aiColor = $this->resolveAiColor($game);
        $currentTurn = $this->currentTurn($game);

        if ($aiColor === null || $currentTurn !== $aiColor) {
            return;
        }

        $move = $this->chooseBestMove($chess, $game);

        if ($move === null) {
            return;
        }

        $playedMove = $chess->move($move->san);

        if ($playedMove === null) {
            throw new RuntimeException('AI could not apply its move.');
        }

        $this->persistMove($game, $playedMove, $chess, null);
        $this->finalizeIfFinished($game, $chess, $playedMove);
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

    private function resolveAiColor(Game $game): ?string
    {
        if ($game->white_player_id === null && $game->black_player_id !== null) {
            return Piece::WHITE;
        }

        if ($game->black_player_id === null && $game->white_player_id !== null) {
            return Piece::BLACK;
        }

        return null;
    }

    private function currentTurn(Game $game): string
    {
        return explode(' ', $game->current_fen)[1] ?? Piece::WHITE;
    }

    private function chooseBestMove(Chess $chess, Game $game): ?Move
    {
        $skill = $game->ai_skill_level ?? 6;
        $aiColor = $this->resolveAiColor($game);

        if ($aiColor === null) {
            return null;
        }

        $moves = $chess->moves();

        if ($moves === []) {
            return null;
        }

        usort($moves, fn (Move $left, Move $right) => $this->tacticalScore($right) <=> $this->tacticalScore($left));

        $depth = $this->searchDepth($skill);
        $bestScore = -INF;
        $bestMoves = [];

        foreach ($moves as $move) {
            $playedMove = $chess->move($move->san);

            if ($playedMove === null) {
                continue;
            }

            $score = $this->minimax(
                chess: $chess,
                depth: $depth - 1,
                alpha: -INF,
                beta: INF,
                maximizingColor: $aiColor,
            );

            $chess->undo();

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMoves = [$move];

                continue;
            }

            if (abs($score - $bestScore) < 0.001) {
                $bestMoves[] = $move;
            }
        }

        if ($bestMoves === []) {
            return null;
        }

        $spread = $skill >= 16 ? 1 : max(1, 4 - intdiv($skill, 5));
        $choicePool = array_slice($bestMoves, 0, $spread);

        return $choicePool[array_rand($choicePool)];
    }

    private function minimax(Chess $chess, int $depth, float $alpha, float $beta, string $maximizingColor): float
    {
        if ($depth === 0 || $chess->gameOver()) {
            return $this->evaluatePosition($chess, $maximizingColor);
        }

        $turn = $this->turnFromChess($chess);
        $moves = $chess->moves();

        usort($moves, fn (Move $left, Move $right) => $this->tacticalScore($right) <=> $this->tacticalScore($left));

        if ($turn === $maximizingColor) {
            $value = -INF;

            foreach ($moves as $move) {
                $playedMove = $chess->move($move->san);

                if ($playedMove === null) {
                    continue;
                }

                $value = max($value, $this->minimax($chess, $depth - 1, $alpha, $beta, $maximizingColor));
                $chess->undo();
                $alpha = max($alpha, $value);

                if ($beta <= $alpha) {
                    break;
                }
            }

            return $value;
        }

        $value = INF;

        foreach ($moves as $move) {
            $playedMove = $chess->move($move->san);

            if ($playedMove === null) {
                continue;
            }

            $value = min($value, $this->minimax($chess, $depth - 1, $alpha, $beta, $maximizingColor));
            $chess->undo();
            $beta = min($beta, $value);

            if ($beta <= $alpha) {
                break;
            }
        }

        return $value;
    }

    private function evaluatePosition(Chess $chess, string $maximizingColor): float
    {
        if ($chess->inCheckmate()) {
            return $this->turnFromChess($chess) === $maximizingColor ? -100000 : 100000;
        }

        if ($chess->inDraw()) {
            return 0.0;
        }

        $score = 0.0;

        foreach (self::RANKS as $rankIndex => $rank) {
            foreach (self::FILES as $fileIndex => $file) {
                $piece = $chess->get($file.$rank);

                if ($piece === null) {
                    continue;
                }

                $pieceScore = self::PIECE_VALUES[$piece->getType()] + $this->pieceSquareScore($piece->getType(), $piece->getColor(), $fileIndex, $rankIndex);
                $score += $piece->getColor() === $maximizingColor ? $pieceScore : -$pieceScore;
            }
        }

        $mobility = count($chess->moves()) * 3;
        $score += $this->turnFromChess($chess) === $maximizingColor ? $mobility : -$mobility;

        if ($chess->inCheck()) {
            $score += $this->turnFromChess($chess) === $maximizingColor ? -25 : 25;
        }

        return $score;
    }

    private function pieceSquareScore(string $pieceType, string $color, int $fileIndex, int $rankIndex): int
    {
        $perspectiveRank = $color === Piece::WHITE ? 7 - $rankIndex : $rankIndex;
        $centerDistance = abs($fileIndex - 3.5) + abs($perspectiveRank - 3.5);

        return match ($pieceType) {
            Piece::PAWN => (6 - $perspectiveRank) * 10 + (int) round((3.5 - abs($fileIndex - 3.5)) * 4),
            Piece::KNIGHT => (int) round((4 - $centerDistance) * 12),
            Piece::BISHOP => (int) round((4 - $centerDistance) * 8),
            Piece::ROOK => (int) round((6 - $perspectiveRank) * 3),
            Piece::QUEEN => (int) round((4 - $centerDistance) * 5),
            Piece::KING => $perspectiveRank <= 1
                ? (int) round((4 - abs($fileIndex - 3.5)) * 6)
                : (int) round(($centerDistance - 2) * 6),
            default => 0,
        };
    }

    private function searchDepth(int $skill): int
    {
        return match (true) {
            $skill >= 18 => 3,
            $skill >= 9 => 2,
            default => 1,
        };
    }

    private function tacticalScore(Move $move): int
    {
        $score = 0;

        if ($move->captured !== null) {
            $score += 50 + (self::PIECE_VALUES[$move->captured] ?? 0);
        }

        if ($move->promotion !== null) {
            $score += 80;
        }

        if (($move->san ?? '') !== '' && str_contains($move->san, '+')) {
            $score += 25;
        }

        return $score;
    }

    private function turnFromChess(Chess $chess): string
    {
        return explode(' ', $chess->fen())[1] ?? Piece::WHITE;
    }
}
