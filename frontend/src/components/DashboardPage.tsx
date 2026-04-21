import type { FormEvent } from 'react'
import './DashboardPage.css'
import type { GameSummary, User } from '../types'

export type DashboardView = 'overview' | 'profile' | 'games'

export type ProfileForm = {
  username: string
  name: string
  bio: string
  country_code: string
  avatar_path: string
}

export type CreateGameForm = {
  mode: 'casual' | 'ranked' | 'ai'
  color_preference: 'white' | 'black' | 'random'
  initial_time_seconds: number
  increment_seconds: number
  ai_skill_level: number
}

type DashboardPageProps = {
  currentUser: User
  view: DashboardView
  onViewChange: (view: DashboardView) => void
  onLogout: () => void
  gameForm: CreateGameForm
  onGameFormChange: (updater: (current: CreateGameForm) => CreateGameForm) => void
  onCreateGame: (event: FormEvent<HTMLFormElement>) => void
  gamesBusy: boolean
  profileForm: ProfileForm
  onProfileFormChange: (updater: (current: ProfileForm) => ProfileForm) => void
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => void
  profileBusy: boolean
  games: GameSummary[]
  onRefreshGames: () => void
  onOpenGame: (gameId: string) => void
}

const NAV_ITEMS: { id: DashboardView; label: string; glyph: string }[] = [
  { id: 'overview', label: 'Overview',  glyph: '⊞' },
  { id: 'profile',  label: 'Profile',   glyph: '◈' },
  { id: 'games',    label: 'Games',     glyph: '⊟' },
]

const MODE_LABELS: Record<CreateGameForm['mode'], string> = {
  casual: 'Casual',
  ranked: 'Ranked',
  ai: 'Versus AI',
}

function DashboardPage({
  currentUser,
  view,
  onViewChange,
  onLogout,
  gameForm,
  onGameFormChange,
  onCreateGame,
  gamesBusy,
  profileForm,
  onProfileFormChange,
  onProfileSubmit,
  profileBusy,
  games,
  onRefreshGames,
  onOpenGame,
}: DashboardPageProps) {
  return (
    <div className="dp-root">

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="dp-sidebar">
        {/* Identity block */}
        <div className="dp-identity">
          <div className="dp-avatar" aria-hidden="true">
            {(currentUser.username?.[0] ?? '?').toUpperCase()}
          </div>
          <div className="dp-identity-text">
            <strong className="dp-username">{currentUser.username}</strong>
            <span className="dp-rank-pill">
              <span className="dp-rank-dot" />
              {currentUser.profile.ranked_rating ?? '—'} ELO
            </span>
          </div>
        </div>

        {/* Sidebar stats strip */}
        <div className="dp-sidebar-stats">
          <div className="dp-ss-item">
            <span className="dp-ss-label">Level</span>
            <strong className="dp-ss-value">{currentUser.profile.level ?? '—'}</strong>
          </div>
          <div className="dp-ss-divider" />
          <div className="dp-ss-item">
            <span className="dp-ss-label">Coins</span>
            <strong className="dp-ss-value">{currentUser.profile.soft_currency ?? '—'}</strong>
          </div>
        </div>

        {/* Nav */}
        <nav className="dp-nav" aria-label="Dashboard">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`dp-nav-item${view === item.id ? ' is-active' : ''}`}
              onClick={() => onViewChange(item.id)}
              type="button"
            >
              <span className="dp-nav-glyph" aria-hidden="true">{item.glyph}</span>
              <span className="dp-nav-label">{item.label}</span>
              {view === item.id && <span className="dp-nav-indicator" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        {/* Bottom area */}
        <div className="dp-sidebar-footer">
          <button className="dp-logout-btn" onClick={onLogout} type="button">
            <span aria-hidden="true">→</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────── */}
      <main className="dp-main">

        {/* Page header bar */}
        <header className="dp-topbar">
          <div className="dp-topbar-title">
            <span className="dp-topbar-section">
              {NAV_ITEMS.find((n) => n.id === view)?.label}
            </span>
          </div>
          <div className="dp-topbar-meta">
            <span className="dp-live-dot" aria-hidden="true" />
            <span className="dp-topbar-status">Live session</span>
          </div>
        </header>

        {/* ── Overview ─────────────────────────── */}
        {view === 'overview' && (
          <div className="dp-overview">

            {/* Stat ribbon */}
            <div className="dp-stat-ribbon">
              {[
                { label: 'Username',      value: currentUser.username },
                { label: 'Ranked Rating', value: currentUser.profile.ranked_rating ?? '—' },
                { label: 'Level',         value: currentUser.profile.level ?? '—' },
                { label: 'Coins',         value: currentUser.profile.soft_currency ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="dp-stat-cell">
                  <span className="dp-stat-label">{label}</span>
                  <strong className="dp-stat-value">{value}</strong>
                </div>
              ))}
            </div>

            {/* Lower row */}
            <div className="dp-overview-lower">

              {/* Create game card */}
              <div className="dp-card dp-card--game">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">New Game</h2>
                  <span className="dp-card-badge">
                    {MODE_LABELS[gameForm.mode]}
                  </span>
                </div>

                <form className="dp-game-form" onSubmit={onCreateGame}>
                  <div className="dp-game-form-grid">
                    <label className="dp-field">
                      <span className="dp-field-label">Mode</span>
                      <select
                        className="dp-select"
                        value={gameForm.mode}
                        onChange={(e) =>
                          onGameFormChange((c) => ({ ...c, mode: e.target.value as CreateGameForm['mode'] }))
                        }
                      >
                        <option disabled value="casual">Casual (future)</option>
                        <option disabled value="ranked">Ranked (future)</option>
                        <option value="ai">Versus AI</option>
                      </select>
                    </label>

                    <label className="dp-field">
                      <span className="dp-field-label">Color</span>
                      <select
                        className="dp-select"
                        value={gameForm.color_preference}
                        onChange={(e) =>
                          onGameFormChange((c) => ({ ...c, color_preference: e.target.value as CreateGameForm['color_preference'] }))
                        }
                      >
                        <option value="random">Random</option>
                        <option value="white">White</option>
                        <option value="black">Black</option>
                      </select>
                    </label>

                    <label className="dp-field">
                      <span className="dp-field-label">Time (sec)</span>
                      <input
                        className="dp-input"
                        type="number"
                        min={60}
                        max={10800}
                        value={gameForm.initial_time_seconds}
                        onChange={(e) =>
                          onGameFormChange((c) => ({ ...c, initial_time_seconds: Number(e.target.value) }))
                        }
                      />
                    </label>

                    <label className="dp-field">
                      <span className="dp-field-label">Increment (sec)</span>
                      <input
                        className="dp-input"
                        type="number"
                        min={0}
                        max={60}
                        value={gameForm.increment_seconds}
                        onChange={(e) =>
                          onGameFormChange((c) => ({ ...c, increment_seconds: Number(e.target.value) }))
                        }
                      />
                    </label>

                    {gameForm.mode === 'ai' && (
                      <label className="dp-field dp-field--full">
                        <span className="dp-field-label">AI Skill Level</span>
                        <div className="dp-skill-row">
                          <input
                            className="dp-range"
                            type="range"
                            min={1}
                            max={20}
                            value={gameForm.ai_skill_level}
                            onChange={(e) =>
                              onGameFormChange((c) => ({ ...c, ai_skill_level: Number(e.target.value) }))
                            }
                          />
                          <span className="dp-skill-value">{gameForm.ai_skill_level}</span>
                        </div>
                      </label>
                    )}
                  </div>

                  <p className="dp-form-note">
                    AI mode is the currently playable path. Online multiplayer stays disabled until
                    server-side move validation exists.
                  </p>

                  <button className="dp-btn-primary dp-game-submit" disabled={gamesBusy} type="submit">
                    {gamesBusy ? 'Creating…' : 'Create game'}
                  </button>
                </form>
              </div>

              {/* Recent games preview */}
              <div className="dp-card dp-card--recent">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">Recent</h2>
                  <button className="dp-text-btn" onClick={() => onViewChange('games')} type="button">
                    View all →
                  </button>
                </div>

                {games.length === 0 ? (
                  <div className="dp-empty">
                    <span className="dp-empty-glyph" aria-hidden="true">♟</span>
                    <p>No games yet</p>
                  </div>
                ) : (
                  <div className="dp-mini-game-list">
                    {games.slice(0, 4).map((game) => (
                      <div key={game.id} className="dp-mini-game">
                        <div className="dp-mini-game-left">
                          <span className="dp-mini-mode">{game.mode}</span>
                          <span className="dp-mini-vs">
                            {game.players.white?.username ?? '—'} <em>vs</em>{' '}
                            {game.players.black?.username ?? (game.mode === 'ai' ? game.ai_opponent_name : '—')}
                          </span>
                        </div>
                        <div className="dp-mini-game-right">
                          <span className={`dp-mini-status dp-mini-status--${game.status}`}>
                            {game.status}
                          </span>
                          {game.mode === 'ai' ? (
                            <button className="dp-inline-action" onClick={() => onOpenGame(game.id)} type="button">
                              Play
                            </button>
                          ) : (
                            <span className="dp-inline-muted">Future</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Profile ──────────────────────────── */}
        {view === 'profile' && (
          <div className="dp-profile">
            <div className="dp-profile-layout">

              {/* Left — identity summary */}
              <div className="dp-profile-summary">
                <div className="dp-profile-avatar">
                  {(currentUser.username?.[0] ?? '?').toUpperCase()}
                </div>
                <p className="dp-profile-handle">@{currentUser.username}</p>
                <p className="dp-profile-name">{currentUser.name || '—'}</p>
                <div className="dp-profile-badges">
                  <span className="dp-badge">Lvl {currentUser.profile.level ?? '—'}</span>
                  <span className="dp-badge dp-badge--gold">{currentUser.profile.ranked_rating ?? '—'} ELO</span>
                </div>
                {currentUser.profile.bio ? (
                  <p className="dp-profile-bio">"{currentUser.profile.bio}"</p>
                ) : null}
              </div>

              {/* Right — edit form */}
              <div className="dp-card dp-card--form">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">Edit Profile</h2>
                </div>

                <form className="dp-profile-form" onSubmit={onProfileSubmit}>
                  <div className="dp-profile-form-grid">
                    <label className="dp-field">
                      <span className="dp-field-label">Username</span>
                      <input
                        className="dp-input"
                        value={profileForm.username}
                        onChange={(e) => onProfileFormChange((c) => ({ ...c, username: e.target.value }))}
                        required
                      />
                    </label>

                    <label className="dp-field">
                      <span className="dp-field-label">Display name</span>
                      <input
                        className="dp-input"
                        value={profileForm.name}
                        onChange={(e) => onProfileFormChange((c) => ({ ...c, name: e.target.value }))}
                        required
                      />
                    </label>

                    <label className="dp-field dp-field--full">
                      <span className="dp-field-label">Bio</span>
                      <textarea
                        className="dp-textarea"
                        rows={4}
                        value={profileForm.bio}
                        onChange={(e) => onProfileFormChange((c) => ({ ...c, bio: e.target.value }))}
                      />
                    </label>

                    <label className="dp-field">
                      <span className="dp-field-label">Country code</span>
                      <input
                        className="dp-input"
                        value={profileForm.country_code}
                        onChange={(e) =>
                          onProfileFormChange((c) => ({ ...c, country_code: e.target.value.toUpperCase() }))
                        }
                        maxLength={2}
                        placeholder="PH"
                      />
                    </label>

                    <label className="dp-field">
                      <span className="dp-field-label">Avatar path</span>
                      <input
                        className="dp-input"
                        value={profileForm.avatar_path}
                        onChange={(e) => onProfileFormChange((c) => ({ ...c, avatar_path: e.target.value }))}
                        placeholder="/assets/avatars/default.png"
                      />
                    </label>
                  </div>

                  <div className="dp-form-actions">
                    <button className="dp-btn-primary" disabled={profileBusy} type="submit">
                      {profileBusy ? 'Saving…' : 'Save profile'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* ── Games ────────────────────────────── */}
        {view === 'games' && (
          <div className="dp-games">
            <div className="dp-games-header">
              <div>
                <h2 className="dp-section-title">Match History</h2>
                <p className="dp-section-sub">{games.length} game{games.length !== 1 ? 's' : ''} recorded</p>
              </div>
              <button className="dp-btn-secondary" onClick={onRefreshGames} type="button">
                ↺ Refresh
              </button>
            </div>

            {games.length === 0 ? (
              <div className="dp-empty dp-empty--lg">
                <span className="dp-empty-glyph" aria-hidden="true">♟</span>
                <p>No games yet. Create one from the Overview tab.</p>
              </div>
            ) : (
              <div className="dp-game-table">
                <div className="dp-game-table-head">
                  <span>Mode</span>
                  <span>Players</span>
                  <span>Time control</span>
                  <span>Rated</span>
                  <span>Status</span>
                  <span>ID</span>
                  <span>Action</span>
                </div>
                {games.map((game) => (
                  <div key={game.id} className="dp-game-row">
                    <span className="dp-game-mode">{game.mode}</span>
                    <span className="dp-game-players">
                      {game.players.white?.username ?? 'Open'}{' '}
                      <em>vs</em>{' '}
                      {game.players.black?.username ?? (game.mode === 'ai' ? game.ai_opponent_name : 'Open')}
                    </span>
                    <span className="dp-game-tc">{game.time_control_name}</span>
                    <span>{game.rated ? 'Rated' : 'Casual'}</span>
                    <span className={`dp-status-chip dp-status-chip--${game.status}`}>
                      {game.status}
                    </span>
                    <span className="dp-game-id">{game.id}</span>
                    {game.mode === 'ai' ? (
                      <button className="dp-inline-action" onClick={() => onOpenGame(game.id)} type="button">
                        Play
                      </button>
                    ) : (
                      <span className="dp-inline-muted">Future</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default DashboardPage
