<?php

namespace App\Enums;

enum GameMode: string
{
    case Casual = 'casual';
    case Ranked = 'ranked';
    case Ai = 'ai';
}
