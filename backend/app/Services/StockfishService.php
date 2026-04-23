<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use RuntimeException;

class StockfishService
{
    public function bestMove(string $fen, int $skill): ?string
    {
        $binary = $this->resolveBinary();

        if ($binary === null) {
            return null;
        }

        $process = proc_open(
            [$binary],
            [
                0 => ['pipe', 'w'],
                1 => ['pipe', 'r'],
                2 => ['pipe', 'r'],
            ],
            $pipes,
        );

        if (! is_resource($process)) {
            return null;
        }

        try {
            if (! isset($pipes[0], $pipes[1], $pipes[2])) {
                throw new RuntimeException('Stockfish process pipes were not created.');
            }

            stream_set_blocking($pipes[1], true);
            stream_set_blocking($pipes[2], true);

            $this->write($pipes[0], 'uci');
            $this->waitForToken($pipes[1], 'uciok');

            $this->write($pipes[0], 'setoption name Threads value '.config('ai.stockfish.threads', 1));
            $this->write($pipes[0], 'setoption name Hash value '.config('ai.stockfish.hash', 64));
            $this->write($pipes[0], 'setoption name Skill Level value '.max(0, min(20, $skill)));
            $this->write($pipes[0], 'setoption name MultiPV value '.$this->multiPv($skill));
            $this->write($pipes[0], 'isready');
            $this->waitForToken($pipes[1], 'readyok');

            $this->write($pipes[0], 'ucinewgame');
            $this->write($pipes[0], 'position fen '.$fen);
            $this->write($pipes[0], 'go movetime '.$this->moveTime($skill));

            $result = $this->readBestMove($pipes[1], $skill);

            $this->write($pipes[0], 'quit');

            return $result;
        } catch (RuntimeException $exception) {
            Log::warning('Stockfish move selection failed.', [
                'message' => $exception->getMessage(),
                'binary' => $binary,
                'stderr' => $this->safeReadPipe($pipes[2] ?? null),
            ]);

            return null;
        } finally {
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }

            proc_close($process);
        }
    }

    private function resolveBinary(): ?string
    {
        $configured = config('ai.stockfish.binary');

        if (is_string($configured) && $configured !== '' && is_executable($configured)) {
            return $configured;
        }

        foreach (config('ai.stockfish.fallback_binaries', []) as $candidate) {
            if (is_string($candidate) && $candidate !== '' && is_executable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function write($stdin, string $command): void
    {
        if (! is_resource($stdin)) {
            throw new RuntimeException('Stockfish stdin is unavailable.');
        }

        $written = @fwrite($stdin, $command.PHP_EOL);

        if ($written === false) {
            throw new RuntimeException("Failed writing command to Stockfish: {$command}");
        }

        if (! @fflush($stdin)) {
            throw new RuntimeException("Failed flushing command to Stockfish: {$command}");
        }
    }

    private function waitForToken($stdout, string $token): void
    {
        $deadline = microtime(true) + 3;

        while (microtime(true) < $deadline) {
            $line = fgets($stdout);

            if ($line === false) {
                usleep(10000);

                continue;
            }

            if (str_contains(trim($line), $token)) {
                return;
            }
        }

        throw new RuntimeException("Timed out waiting for {$token}.");
    }

    private function readBestMove($stdout, int $skill): ?string
    {
        $deadline = microtime(true) + $this->readTimeoutSeconds($skill);
        $candidates = [];

        while (microtime(true) < $deadline) {
            $line = fgets($stdout);

            if ($line === false) {
                usleep(10000);

                continue;
            }

            $trimmed = trim($line);

            if (preg_match('/^info .*\bmultipv (\d+)\b.*\bscore (cp|mate) (-?\d+)\b.*\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/', $trimmed, $matches) === 1) {
                $candidates[(int) $matches[1]] = [
                    'uci' => $matches[4],
                    'score' => $this->normalizeScore($matches[2], (int) $matches[3]),
                ];
            }

            if (preg_match('/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/', $trimmed, $matches) === 1) {
                return $this->pickCandidateMove($candidates, $matches[1], $skill);
            }
        }

        throw new RuntimeException('Timed out waiting for bestmove.');
    }

    private function pickCandidateMove(array $candidates, string $bestMove, int $skill): string
    {
        if ($candidates === []) {
            return $bestMove;
        }

        usort($candidates, fn (array $left, array $right) => $right['score'] <=> $left['score']);

        $poolSize = match (true) {
            $skill >= 18 => 1,
            $skill >= 12 => min(2, count($candidates)),
            default => min(3, count($candidates)),
        };

        $pool = array_slice($candidates, 0, $poolSize);

        if ($pool === []) {
            return $bestMove;
        }

        if (count($pool) === 1) {
            return $pool[0]['uci'];
        }

        $weights = match (count($pool)) {
            2 => $skill >= 12 ? [85, 15] : [70, 30],
            default => $skill >= 8 ? [70, 20, 10] : [55, 30, 15],
        };

        $roll = random_int(1, array_sum($weights));
        $running = 0;

        foreach ($pool as $index => $candidate) {
            $running += $weights[$index] ?? 0;

            if ($roll <= $running) {
                return $candidate['uci'];
            }
        }

        return $bestMove;
    }

    private function normalizeScore(string $type, int $value): int
    {
        if ($type === 'mate') {
            return $value > 0 ? 100000 - abs($value) : -100000 + abs($value);
        }

        return $value;
    }

    private function moveTime(int $skill): int
    {
        return match (true) {
            $skill >= 18 => 375,
            $skill >= 14 => 300,
            $skill >= 10 => 240,
            $skill >= 7 => 190,
            $skill >= 4 => 150,
            default => 120,
        };
    }

    private function multiPv(int $skill): int
    {
        return 1;
    }

    private function readTimeoutSeconds(int $skill): float
    {
        $baseTimeout = max(2, (int) config('ai.stockfish.timeout_seconds', 8));
        $budgetSeconds = ($this->moveTime($skill) / 1000) + 1.5;

        return min($baseTimeout, $budgetSeconds);
    }

    private function safeReadPipe(mixed $pipe): ?string
    {
        if (! is_resource($pipe)) {
            return null;
        }

        $contents = @stream_get_contents($pipe);

        if ($contents === false) {
            return null;
        }

        $trimmed = trim($contents);

        return $trimmed !== '' ? $trimmed : null;
    }
}
