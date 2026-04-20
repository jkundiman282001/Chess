<?php

namespace App\Enums;

enum GameStatus: string
{
    case Waiting = 'waiting';
    case Active = 'active';
    case Finished = 'finished';
    case Aborted = 'aborted';
}
