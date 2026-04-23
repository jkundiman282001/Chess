<?php

return [
    'stockfish' => [
        'binary' => env('STOCKFISH_BINARY'),
        'fallback_binaries' => [
            '/usr/games/stockfish',
            '/usr/local/bin/stockfish',
            '/opt/homebrew/bin/stockfish',
        ],
        'threads' => (int) env('STOCKFISH_THREADS', 1),
        'hash' => (int) env('STOCKFISH_HASH', 64),
        'timeout_seconds' => (int) env('STOCKFISH_TIMEOUT_SECONDS', 8),
    ],
];
