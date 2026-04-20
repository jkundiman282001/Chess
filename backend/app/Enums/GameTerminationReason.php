<?php

namespace App\Enums;

enum GameTerminationReason: string
{
    case Checkmate = 'checkmate';
    case Resignation = 'resignation';
    case Timeout = 'timeout';
    case Stalemate = 'stalemate';
    case DrawAgreement = 'draw_agreement';
    case InsufficientMaterial = 'insufficient_material';
    case ThreefoldRepetition = 'threefold_repetition';
    case FiftyMoveRule = 'fifty_move_rule';
    case Aborted = 'aborted';
}
