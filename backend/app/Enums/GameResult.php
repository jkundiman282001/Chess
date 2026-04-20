<?php

namespace App\Enums;

enum GameResult: string
{
    case InProgress = 'in_progress';
    case WhiteWin = 'white_win';
    case BlackWin = 'black_win';
    case Draw = 'draw';
    case Aborted = 'aborted';
}
