import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import './GameRoom.css'
import { resignAiGame, submitAiMove } from '../api'
import type { GameSummary, User } from '../types'

type GameRoomProps = {
  currentUser: User
  token: string
  game: GameSummary
  onBack: () => void
  onGameChange: (game: GameSummary) => void
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

const PIECE_MAP: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
}

type PreviewState = {
  fen: string
  moveLog: string[]
  lastMove: {
    from: string
    to: string
  } | null
}

function GameRoom({ currentUser, token, game, onBack, onGameChange }: GameRoomProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalTargets, setLegalTargets] = useState<Square[]>([])
  const [submittingMove, setSubmittingMove] = useState(false)
  const [resigning, setResigning] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState | null>(null)
  const [thinkingModalVisible, setThinkingModalVisible] = useState(false)
  const revealTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
    }
  }, [])

  const engine = useMemo(
    () => new Chess(previewState?.fen ?? game.current_fen),
    [game.current_fen, previewState?.fen],
  )
  const lastMove = useMemo(
    () => previewState?.lastMove ?? getLastMove(game),
    [game, previewState],
  )

  const playerColor =
    game.players.white?.id === currentUser.id
      ? 'w'
      : game.players.black?.id === currentUser.id
        ? 'b'
        : null

  const isAiGame = game.mode === 'ai'
  const aiTurn = isAiGame && playerColor !== null && engine.turn() !== playerColor && !engine.isGameOver()
  const canMove = isAiGame && !submittingMove && !resigning && !aiTurn && playerColor === engine.turn() && !engine.isGameOver()
  const files = playerColor === 'b' ? [...FILES].reverse() : FILES
  const ranks = playerColor === 'b' ? [...RANKS].reverse() : RANKS
  const moveLog = previewState?.moveLog ?? (game.moves ?? []).map((move) => move.san)
  const resignationModalVisible =
    game.status === 'finished' && game.termination_reason === 'resignation'
  const statusMessage = useMemo(() => {
    if (game.status === 'finished') {
      return buildFinishedMessage(game, currentUser)
    }

    if (engine.isGameOver()) {
      return buildBoardEndMessage(engine)
    }

    if (thinkingModalVisible) {
      return 'AI is thinking...'
    }

    if (submittingMove) {
      return 'Submitting move...'
    }

    if (resigning) {
      return 'Resigning game...'
    }

    if (aiTurn) {
      return 'AI is thinking...'
    }

    return isAiGame
      ? 'Your move.'
      : 'Board preview only. Multiplayer submission is a future backend step.'
  }, [aiTurn, currentUser, engine, game, isAiGame, resigning, submittingMove, thinkingModalVisible])

  function handleSquareClick(square: Square) {
    if (!canMove) {
      return
    }

    if (selectedSquare && legalTargets.includes(square)) {
      void makePlayerMove(selectedSquare, square)
      return
    }

    const piece = engine.get(square)
    if (!piece || piece.color !== playerColor) {
      setSelectedSquare(null)
      setLegalTargets([])
      return
    }

    const moves = engine.moves({ square, verbose: true })
    setSelectedSquare(square)
    setLegalTargets(moves.map((move) => move.to))
  }

  async function makePlayerMove(from: Square, to: Square) {
    setSubmittingMove(true)
    setRoomError(null)

    try {
      const playerPreviewEngine = new Chess(game.current_fen)
      const previewMove = playerPreviewEngine.move({ from, to, promotion: 'q' })

      if (!previewMove) {
        throw new Error('Illegal move.')
      }

      const previewMoveLog = [...(game.moves ?? []).map((move) => move.san), previewMove.san]

      setPreviewState({
        fen: playerPreviewEngine.fen(),
        moveLog: previewMoveLog,
        lastMove: {
          from: previewMove.from,
          to: previewMove.to,
        },
      })

      const response = await submitAiMove(token, game.id, {
        from,
        to,
        promotion: 'q',
        state_version: game.state_version,
      })

      setSelectedSquare(null)
      setLegalTargets([])

      const aiResponded =
        (response.game.moves?.length ?? 0) > (game.moves?.length ?? 0) + 1

      if (aiResponded && !response.game.ended_at) {
        setThinkingModalVisible(true)
        revealTimerRef.current = window.setTimeout(() => {
          setThinkingModalVisible(false)
          setPreviewState(null)
          onGameChange(response.game)
          revealTimerRef.current = null
        }, 1200)
      } else {
        setPreviewState(null)
        onGameChange(response.game)
      }
    } catch (error) {
      setPreviewState(null)
      setRoomError(error instanceof Error ? error.message : 'Move submission failed.')
    } finally {
      setSubmittingMove(false)
    }
  }

  async function handleResign() {
    setResigning(true)
    setRoomError(null)

    try {
      const response = await resignAiGame(token, game.id)
      setSelectedSquare(null)
      setLegalTargets([])
      onGameChange(response.game)
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Resign failed.')
    } finally {
      setResigning(false)
    }
  }

  return (
    <div className="gr-root">
      <aside className="gr-sidebar">
        <button className="gr-back" onClick={onBack} type="button">
          ← Back to dashboard
        </button>
        <div className="gr-panel">
          <p className="gr-label">Game</p>
          <strong>{game.mode.toUpperCase()}</strong>
          <p>{game.time_control_name}</p>
        </div>
        <div className="gr-panel">
          <p className="gr-label">White</p>
          <strong>{game.players.white?.username ?? game.ai_opponent_name ?? 'Open'}</strong>
          <p className={engine.turn() === 'w' ? 'gr-active-turn' : 'gr-inactive-turn'}>to move</p>
        </div>
        <div className="gr-panel">
          <p className="gr-label">Black</p>
          <strong>{game.players.black?.username ?? game.ai_opponent_name ?? 'Open'}</strong>
          <p className={engine.turn() === 'b' ? 'gr-active-turn' : 'gr-inactive-turn'}>to move</p>
        </div>
        <div className="gr-panel">
          <p className="gr-label">Status</p>
          <strong>{engine.isGameOver() ? 'Finished' : 'In progress'}</strong>
          <p>{statusMessage}</p>
          {roomError ? <p className="gr-error">{roomError}</p> : null}
        </div>
        <div className="gr-panel">
          <p className="gr-label">Move Log</p>
          <div className="gr-move-log">
            {moveLog.length === 0 ? (
              <span>No moves yet.</span>
            ) : (
              moveLog.map((san, index) => <span key={`${san}-${index}`}>{index + 1}. {san}</span>)
            )}
          </div>
        </div>
      </aside>

      <main className="gr-main">
        {thinkingModalVisible ? (
          <div className="gr-thinking-modal" role="status" aria-live="polite">
            <div className="gr-thinking-card">
              <span className="gr-thinking-spinner" aria-hidden="true" />
              <p className="gr-label">AI Turn</p>
              <strong>Thinking...</strong>
            </div>
          </div>
        ) : null}

        {resignationModalVisible ? (
          <div className="gr-thinking-modal" role="dialog" aria-modal="true" aria-labelledby="resign-title">
            <div className="gr-thinking-card gr-result-card">
              <p className="gr-label">Game Result</p>
              <strong id="resign-title">
                {game.players.winner?.id === currentUser.id ? 'Opponent Resigned' : 'You Resigned'}
              </strong>
              <p className="gr-result-copy">{buildFinishedMessage(game, currentUser)}</p>
              <button
                className="gr-modal-button"
                onClick={onBack}
                type="button"
              >
                Quit
              </button>
            </div>
          </div>
        ) : null}

        <header className="gr-header">
          <div>
            <p className="gr-label">Play Room</p>
            <h1>{isAiGame ? 'Versus AI' : 'Board Viewer'}</h1>
          </div>
          <div className="gr-header-meta">
            <span>{playerColor === 'w' ? 'You are White' : playerColor === 'b' ? 'You are Black' : 'Observer'}</span>
            <code>{game.id}</code>
            {isAiGame && !engine.isGameOver() ? (
              <button className="gr-resign" disabled={submittingMove || resigning} onClick={() => void handleResign()} type="button">
                {resigning ? 'Resigning…' : 'Resign'}
              </button>
            ) : null}
          </div>
        </header>

        <section className="gr-board-shell">
          <div className="gr-files">
            {files.map((file) => (
              <span key={file}>{file}</span>
            ))}
          </div>
          <div className="gr-board">
            {ranks.map((rank) => (
              <div className="gr-rank" key={rank}>
                <span className="gr-rank-label">{rank}</span>
                {files.map((file) => {
                  const square = `${file}${rank}` as Square
                  const piece = engine.get(square)
                  const boardRow = 8 - Number(rank)
                  const boardCol = file.charCodeAt(0) - 'a'.charCodeAt(0)
                  const isLight = (boardRow + boardCol) % 2 === 0
                  const isSelected = selectedSquare === square
                  const isLegalTarget = legalTargets.includes(square)
                  const isLastMoveSquare = lastMove ? lastMove.from === square || lastMove.to === square : false

                  return (
                    <button
                      className={`gr-square ${isLight ? 'is-light' : 'is-dark'}${isSelected ? ' is-selected' : ''}${isLegalTarget ? ' is-target' : ''}${isLastMoveSquare ? ' is-last-move' : ''}`}
                      disabled={!canMove}
                      key={square}
                      onClick={() => handleSquareClick(square)}
                      type="button"
                    >
                      {piece ? (
                        <span className={`gr-piece ${piece.color === 'w' ? 'is-white' : 'is-black'}`}>
                          {PIECE_MAP[`${piece.color}${piece.type}`]}
                        </span>
                      ) : null}
                      {isLegalTarget ? <span className="gr-target-dot" /> : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function buildBoardEndMessage(engine: Chess) {
  if (engine.isCheckmate()) {
    return `Checkmate. ${engine.turn() === 'w' ? 'Black' : 'White'} wins.`
  }

  if (engine.isStalemate()) {
    return 'Draw by stalemate.'
  }

  if (engine.isDraw()) {
    return 'Game drawn.'
  }

  return 'Game over.'
}

function buildFinishedMessage(game: GameSummary, currentUser: User) {
  if (game.termination_reason === 'resignation') {
    const resigned =
      game.players.winner?.id !== null &&
      game.players.winner?.id !== undefined &&
      game.players.winner.id !== currentUser.id

    return resigned ? 'You resigned.' : 'Opponent resigned.'
  }

  if (game.termination_reason === 'checkmate') {
    if (game.players.winner?.id === currentUser.id) {
      return 'Checkmate. You won.'
    }

    return 'Checkmate. You lost.'
  }

  if (game.termination_reason === 'stalemate') {
    return 'Draw by stalemate.'
  }

  if (game.termination_reason === 'insufficient_material') {
    return 'Draw by insufficient material.'
  }

  if (game.termination_reason === 'threefold_repetition') {
    return 'Draw by threefold repetition.'
  }

  if (game.termination_reason === 'fifty_move_rule') {
    return 'Draw by fifty-move rule.'
  }

  if (game.result === 'draw') {
    return 'Game drawn.'
  }

  return 'Game finished.'
}

function getLastMove(game: GameSummary) {
  if (!game.moves || game.moves.length === 0) {
    return null
  }

  const latestMove = game.moves[game.moves.length - 1]

  return {
    from: latestMove.uci.slice(0, 2),
    to: latestMove.uci.slice(2, 4),
  }
}

export default GameRoom
