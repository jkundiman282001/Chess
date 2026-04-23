import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './GameRoom.css'
import { resignAiGame, submitAiMove } from '../api'
import type { BoardTheme, CosmeticItem, GameSummary, ShopState, User } from '../types'

type GameRoomProps = {
  currentUser: User
  shop: ShopState | null
  token: string
  game: GameSummary
  onBack: () => void
  onGameChange: (game: GameSummary) => void
  onUserChange: (user: User) => void
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

const PIECE_ASSET_KEY: Record<string, string> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
}

type PreviewState = {
  fen: string
  moveLog: string[]
  lastMove: {
    from: string
    to: string
  } | null
}

type LegalTargetState = {
  square: Square
  isCapture: boolean
}

function GameRoom({ currentUser, shop, token, game, onBack, onGameChange, onUserChange }: GameRoomProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalTargets, setLegalTargets] = useState<LegalTargetState[]>([])
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
  const boardTheme = currentUser.profile.board_theme
  const moveLog = previewState?.moveLog ?? (game.moves ?? []).map((move) => move.san)
  const equippedPieceSlug = currentUser.profile.equipped_piece_set?.slug ?? null
  const aiPieceBundle = useMemo(
    () => pickAiPieceBundle(shop?.items ?? [], equippedPieceSlug, game.id),
    [equippedPieceSlug, game.id, shop?.items],
  )
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

    if (selectedSquare && legalTargets.some((target) => target.square === square)) {
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
    setLegalTargets(
      moves.map((move) => ({
        square: move.to,
        isCapture: Boolean(move.captured),
      })),
    )
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
          onUserChange(response.user)
          revealTimerRef.current = null
        }, 1200)
      } else {
        setPreviewState(null)
        onGameChange(response.game)
        onUserChange(response.user)
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
      onUserChange(response.user)
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
          {game.reward_summary ? (
            <div className="gr-reward-summary">
              <span>+{game.reward_summary.coins} coins</span>
              <span>+{game.reward_summary.experience} XP</span>
            </div>
          ) : null}
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
              {game.reward_summary ? (
                <div className="gr-result-rewards">
                  <span>+{game.reward_summary.coins} coins</span>
                  <span>+{game.reward_summary.experience} XP</span>
                </div>
              ) : null}
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
          {boardTheme.coordinate_style !== 'hidden' ? (
            <div className={`gr-files is-${boardTheme.coordinate_style}`}>
              {files.map((file) => (
                <span key={file}>{file}</span>
              ))}
            </div>
          ) : null}
          <div
            className={`gr-board is-frame-${boardTheme.frame_style} is-coordinates-${boardTheme.coordinate_style} is-effect-${boardTheme.effect}`}
            style={getBoardFrameStyle(boardTheme)}
          >
            {boardTheme.effect === 'fire' ? (
              <div aria-hidden="true" className="gr-board-effect gr-board-effect--fire">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {ranks.map((rank) => (
              <div className="gr-rank" key={rank}>
                {boardTheme.coordinate_style !== 'hidden' ? (
                  <span className={`gr-rank-label is-${boardTheme.coordinate_style}`}>{rank}</span>
                ) : null}
                {files.map((file) => {
                  const square = `${file}${rank}` as Square
                  const piece = engine.get(square)
                  const boardRow = 8 - Number(rank)
                  const boardCol = file.charCodeAt(0) - 'a'.charCodeAt(0)
                  const isLight = (boardRow + boardCol) % 2 === 0
                  const isSelected = selectedSquare === square
                  const legalTarget = legalTargets.find((target) => target.square === square)
                  const isLegalTarget = Boolean(legalTarget)
                  const isCaptureTarget = legalTarget?.isCapture === true
                  const isLastMoveSquare = lastMove ? lastMove.from === square || lastMove.to === square : false

                  return (
                    <button
                      className={`gr-square ${isLight ? 'is-light' : 'is-dark'}${isSelected ? ' is-selected' : ''}${isLegalTarget ? ' is-target' : ''}${isCaptureTarget ? ' is-capture-target' : ''}${isLastMoveSquare ? ' is-last-move' : ''}`}
                      disabled={!canMove}
                      key={square}
                      onClick={() => handleSquareClick(square)}
                      style={getBoardSquareStyle(boardTheme, isLight)}
                      type="button"
                    >
                      {piece
                        ? renderPiece(
                            piece.color,
                            piece.type,
                            playerColor,
                          currentUser.profile.equipped_piece_set?.assets,
                          currentUser.profile.equipped_piece_set?.slug ?? null,
                          currentUser.profile.equipped_piece_set?.name ?? null,
                          aiPieceBundle?.assets ?? null,
                          currentUser.profile.default_piece_sets,
                        )
                      : null}
                      {isLegalTarget ? (
                        isCaptureTarget ? <span className="gr-capture-ring" /> : <span className="gr-target-dot" />
                      ) : null}
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

function renderPiece(
  color: string,
  type: string,
  playerColor: 'w' | 'b' | null,
  assets: Record<string, string> | null | undefined,
  bundleSlug: string | null,
  bundleName: string | null,
  aiAssets: Record<string, string> | null,
  defaultPieceSets: User['profile']['default_piece_sets'],
) {
  const unicodeKey = `${color}${type}`
  const assetKey = PIECE_ASSET_KEY[type] ?? ''
  const defaultAsset =
    color === 'w'
      ? defaultPieceSets.white?.assets?.[assetKey]
      : defaultPieceSets.black?.assets?.[assetKey]
  const assetSrc = assets?.[assetKey]

  if (playerColor !== null && color !== playerColor) {
    if (aiAssets?.[assetKey]) {
      return <img alt="" className="gr-piece-image" src={aiAssets[assetKey]} />
    }

    if (defaultAsset) {
      return <img alt="" className="gr-piece-image" src={defaultAsset} />
    }

    return (
      <span className={`gr-piece ${color === 'w' ? 'is-white' : 'is-black'}`}>
        {PIECE_MAP[unicodeKey]}
      </span>
    )
  }

  if (!bundleAppliesToColor(color, bundleSlug, bundleName)) {
    if (defaultAsset) {
      return <img alt="" className="gr-piece-image" src={defaultAsset} />
    }

    return (
      <span className={`gr-piece ${color === 'w' ? 'is-white' : 'is-black'}`}>
        {PIECE_MAP[unicodeKey]}
      </span>
    )
  }

  if (assetSrc) {
    return <img alt="" className="gr-piece-image" src={assetSrc} />
  }

  return (
    <span className={`gr-piece ${color === 'w' ? 'is-white' : 'is-black'}`}>
      {PIECE_MAP[unicodeKey]}
    </span>
  )
}

function getBoardSquareStyle(theme: BoardTheme, isLight: boolean) {
  return {
    backgroundColor: isLight ? theme.light : theme.dark,
    backgroundImage: getBoardPattern(theme.pattern, isLight),
    backgroundBlendMode: 'overlay',
    '--gr-move-dot-color': theme.indicators.move_dot_color,
    '--gr-capture-ring-color': theme.indicators.capture_ring_color,
    '--gr-selected-outline-color': theme.indicators.selected_outline_color,
    '--gr-last-move-overlay-color': theme.indicators.last_move_overlay_color,
  } as CSSProperties
}

function getBoardFrameStyle(theme: BoardTheme) {
  const styles: Record<BoardTheme['frame_style'], CSSProperties> = {
    none: {
      borderColor: 'rgba(255,255,255,0.08)',
      boxShadow: 'none',
    },
    tournament: {
      borderColor: 'rgba(201,168,76,0.35)',
      boxShadow: '0 20px 60px -35px rgba(0, 0, 0, 0.8)',
    },
    gold: {
      borderColor: '#c9a84c',
      boxShadow: '0 0 0 4px rgba(201,168,76,0.16), 0 20px 60px -35px rgba(0, 0, 0, 0.84)',
    },
    iron: {
      borderColor: '#5a616d',
      boxShadow: '0 0 0 4px rgba(90,97,109,0.18), 0 20px 60px -35px rgba(0, 0, 0, 0.84)',
    },
    royal: {
      borderColor: '#8971d8',
      boxShadow: '0 0 0 4px rgba(137,113,216,0.18), 0 20px 60px -35px rgba(0, 0, 0, 0.84)',
    },
  }

  return styles[theme.frame_style]
}

function getBoardPattern(pattern: BoardTheme['pattern'], isLight: boolean) {
  if (pattern === 'wood') {
    return `linear-gradient(135deg, ${isLight ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.14)'}, transparent 60%), repeating-linear-gradient(25deg, rgba(0,0,0,0.05) 0 4px, transparent 4px 12px)`
  }

  if (pattern === 'marble') {
    return `radial-gradient(circle at 22% 18%, ${isLight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'} 0, transparent 32%), repeating-linear-gradient(120deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 16px)`
  }

  if (pattern === 'obsidian') {
    return 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22)), radial-gradient(circle at 50% 10%, rgba(117,154,255,0.08), transparent 45%)'
  }

  if (pattern === 'parchment') {
    return `radial-gradient(circle at 30% 30%, ${isLight ? 'rgba(255,255,255,0.16)' : 'rgba(255,234,194,0.08)'} 0, transparent 45%), repeating-linear-gradient(0deg, rgba(90,62,30,0.05) 0 2px, transparent 2px 10px)`
  }

  if (pattern === 'neon') {
    return 'linear-gradient(135deg, rgba(0,255,255,0.10), transparent 55%), linear-gradient(315deg, rgba(255,0,128,0.10), transparent 55%)'
  }

  return 'none'
}

function bundleAppliesToColor(color: string, bundleSlug: string | null, bundleName: string | null) {
  const identity = `${bundleSlug ?? ''} ${bundleName ?? ''}`.toLowerCase()

  if (identity.includes('white')) {
    return color === 'w'
  }

  if (identity.includes('black')) {
    return color === 'b'
  }

  return true
}

function pickAiPieceBundle(items: CosmeticItem[], equippedSlug: string | null, gameId: string) {
  const candidates = items.filter((item) => {
    if (item.slug === equippedSlug) {
      return false
    }

    if (item.category !== 'bundle' && item.category !== 'piece_set') {
      return false
    }

    return PIECE_CODES.some((pieceCode) => Boolean(item.assets?.[pieceCode]))
  })

  if (candidates.length === 0) {
    return null
  }

  const seed = hashString(gameId)
  return candidates[seed % candidates.length]
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

const PIECE_CODES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'] as const

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
