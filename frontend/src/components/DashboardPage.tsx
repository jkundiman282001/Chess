import { useState } from 'react'
import type { CSSProperties, ChangeEvent, FormEvent } from 'react'
import './DashboardPage.css'
import type { AdminCosmeticRecord, AdminUserRecord, BoardTheme, BoardThemePreset, GameSummary, MoveIndicatorTheme, ShopState, User } from '../types'

export type DashboardView = 'overview' | 'profile' | 'games' | 'store' | 'admin'

export type ProfileForm = {
  username: string
  name: string
  bio: string
  country_code: string
  avatar_path: string
  board_light_color: string
  board_dark_color: string
  board_pattern: BoardTheme['pattern']
  board_frame_style: BoardTheme['frame_style']
  board_coordinate_style: BoardTheme['coordinate_style']
  board_effect: BoardTheme['effect']
  move_indicator_theme: MoveIndicatorTheme
  board_theme_presets: BoardThemePreset[]
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
  onApplyBoardTheme: (theme: BoardTheme) => void
  profileBusy: boolean
  games: GameSummary[]
  onRefreshGames: () => void
  onOpenGame: (gameId: string) => void
  onHideGame: (gameId: string) => void
  onUnhideGame: (gameId: string) => void
  shop: ShopState | null
  shopBusy: boolean
  onRefreshShop: () => void
  onPurchaseCosmetic: (slug: string) => void
  onEquipCosmetic: (slug: string) => void
  onUnequipCosmetic: (slug: string) => void
  adminUsers: AdminUserRecord[]
  adminCosmetics: AdminCosmeticRecord[]
  adminBusy: boolean
  onRefreshAdmin: () => void
  onUpdateAdminUser: (userId: number, payload: { is_admin: boolean; is_active: boolean; soft_currency: number }) => void
  onCreateAdminCosmetic: (payload: {
    slug: string
    name: string
    category: 'board' | 'piece_set' | 'bundle'
    rarity: string
    description: string
    price_soft_currency: number
    sort_order: number
    is_active: boolean
    preview: {
      primary: string
      secondary: string
      banner?: string
    }
    assets: Record<string, string>
  }) => void
  onUpdateAdminCosmetic: (cosmeticId: number, payload: {
    slug: string
    name: string
    category: 'board' | 'piece_set' | 'bundle'
    rarity: string
    description: string
    price_soft_currency: number
    sort_order: number
    is_active: boolean
    preview: {
      primary: string
      secondary: string
      banner?: string
    }
    assets: Record<string, string>
  }) => void
}

const NAV_ITEMS: { id: DashboardView; label: string; glyph: string; adminOnly?: boolean }[] = [
  { id: 'overview', label: 'Overview',  glyph: '⊞' },
  { id: 'profile',  label: 'Profile',   glyph: '◈' },
  { id: 'games',    label: 'Games',     glyph: '⊟' },
  { id: 'store',    label: 'Store',     glyph: '◉' },
  { id: 'admin',    label: 'Admin',     glyph: '⌘', adminOnly: true },
]

const MODE_LABELS: Record<CreateGameForm['mode'], string> = {
  casual: 'Casual',
  ranked: 'Ranked',
  ai: 'Versus AI',
}

type AdminUserDraft = {
  is_admin: boolean
  is_active: boolean
  soft_currency: number
}

type CosmeticEditor = {
  slug: string
  name: string
  category: 'board' | 'piece_set' | 'bundle'
  rarity: string
  description: string
  price_soft_currency: number
  sort_order: number
  is_active: boolean
  preview: {
    primary: string
    secondary: string
    banner?: string
  }
  assets: Record<string, string>
}

const PIECE_CODES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'] as const
const RARITY_OPTIONS = ['common', 'rare', 'epic', 'legendary'] as const
const STARTER_BUNDLE_SLUGS = new Set(['classic', 'classic2'])
const DEFAULT_INDICATORS: MoveIndicatorTheme = {
  move_dot_color: '#ffffff',
  capture_ring_color: '#de4e4e',
  selected_outline_color: '#c9a84c',
  last_move_overlay_color: 'rgba(201,168,76,0.18)',
}
const BOARD_THEME_PRESETS = [
  { label: 'Classic', light: '#f0d9b5', dark: '#b58863', pattern: 'solid', frame_style: 'tournament', coordinate_style: 'classic', effect: 'none', indicators: DEFAULT_INDICATORS },
  { label: 'Slate', light: '#dbe4ee', dark: '#6b7a8f', pattern: 'marble', frame_style: 'iron', coordinate_style: 'mono', effect: 'none', indicators: { ...DEFAULT_INDICATORS, move_dot_color: '#d9e9ff' } },
  { label: 'Forest', light: '#e4efd8', dark: '#688f58', pattern: 'wood', frame_style: 'gold', coordinate_style: 'classic', effect: 'none', indicators: { ...DEFAULT_INDICATORS, selected_outline_color: '#80b766' } },
  { label: 'Inferno', light: '#f2c89c', dark: '#6b2e1f', pattern: 'obsidian', frame_style: 'royal', coordinate_style: 'minimal', effect: 'fire', indicators: { ...DEFAULT_INDICATORS, move_dot_color: '#ffd089', capture_ring_color: '#ff6333', selected_outline_color: '#ff9b4a', last_move_overlay_color: 'rgba(255,111,41,0.18)' } },
] as const
const BOARD_PATTERN_OPTIONS: Array<{ value: BoardTheme['pattern']; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'wood', label: 'Wood' },
  { value: 'marble', label: 'Marble' },
  { value: 'obsidian', label: 'Obsidian' },
  { value: 'parchment', label: 'Parchment' },
  { value: 'neon', label: 'Neon' },
]
const BOARD_FRAME_OPTIONS: Array<{ value: BoardTheme['frame_style']; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'gold', label: 'Gold' },
  { value: 'iron', label: 'Iron' },
  { value: 'royal', label: 'Royal' },
]
const BOARD_COORDINATE_OPTIONS: Array<{ value: BoardTheme['coordinate_style']; label: string }> = [
  { value: 'classic', label: 'Classic' },
  { value: 'mono', label: 'Mono' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'hidden', label: 'Hidden' },
]
const BOARD_EFFECT_OPTIONS: Array<{ value: BoardTheme['effect']; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'fire', label: 'Fire' },
]

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
  onApplyBoardTheme,
  profileBusy,
  games,
  onRefreshGames,
  onOpenGame,
  onHideGame,
  onUnhideGame,
  shop,
  shopBusy,
  onRefreshShop,
  onPurchaseCosmetic,
  onEquipCosmetic,
  onUnequipCosmetic,
  adminUsers,
  adminCosmetics,
  adminBusy,
  onRefreshAdmin,
  onUpdateAdminUser,
  onCreateAdminCosmetic,
  onUpdateAdminCosmetic,
}: DashboardPageProps) {
  const experienceProgress = getExperienceProgress(
    currentUser.profile.experience ?? 0,
    currentUser.profile.level ?? 1,
  )
  const visibleGames = games.filter((game) => !game.hidden)
  const hiddenGames = games.filter((game) => game.hidden)
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || currentUser.is_admin)
  const sortedShopItems = shop ? [...shop.items].sort(compareStoreItems) : []
  const starterBundles = sortedShopItems.filter((item) => STARTER_BUNDLE_SLUGS.has(item.slug))
  const equippedBundles = sortedShopItems.filter((item) => item.equipped && !STARTER_BUNDLE_SLUGS.has(item.slug))
  const ownedBundles = sortedShopItems.filter((item) => item.owned && !item.equipped && !STARTER_BUNDLE_SLUGS.has(item.slug))
  const availableBundles = sortedShopItems.filter((item) => !item.owned && !STARTER_BUNDLE_SLUGS.has(item.slug))
  const [storeFilter, setStoreFilter] = useState<'all' | 'starter' | 'equipped' | 'owned' | 'available'>('all')
  const [storeSort, setStoreSort] = useState<'rarity' | 'price_asc' | 'price_desc' | 'name'>('rarity')
  const [storeQuery, setStoreQuery] = useState('')
  const [selectedBundle, setSelectedBundle] = useState<ShopState['items'][number] | null>(null)
  const [selectedBundlePiece, setSelectedBundlePiece] = useState<{ code: string; src: string } | null>(null)
  const [userDrafts, setUserDrafts] = useState<Record<number, Partial<AdminUserDraft>>>({})
  const [cosmeticDrafts, setCosmeticDrafts] = useState<Record<number, Partial<CosmeticEditor>>>({})
  const [newCosmetic, setNewCosmetic] = useState<CosmeticEditor>({
    slug: '',
    name: '',
    category: 'bundle' as 'board' | 'piece_set' | 'bundle',
    rarity: 'common',
    description: '',
    price_soft_currency: 0,
    sort_order: 0,
    is_active: true,
    preview: {
      primary: '#b58863',
      secondary: '#f0d9b5',
      banner: '',
    },
    assets: {},
  })
  const normalizedStoreQuery = storeQuery.trim().toLowerCase()
  const featuredBundle = pickFeaturedBundle(sortedShopItems)
  const filterStoreItems = (items: ShopState['items']) =>
    [...items]
      .filter((item) => {
      if (normalizedStoreQuery === '') {
        return true
      }

      return [item.name, item.slug, item.rarity, item.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedStoreQuery)
    })
      .sort((left, right) => compareStoreItemsByMode(left, right, storeSort))
  const visibleStarterBundles = storeFilter === 'all' || storeFilter === 'starter' ? filterStoreItems(starterBundles) : []
  const visibleEquippedBundles = storeFilter === 'all' || storeFilter === 'equipped' ? filterStoreItems(equippedBundles) : []
  const visibleOwnedBundles = storeFilter === 'all' || storeFilter === 'owned' ? filterStoreItems(ownedBundles) : []
  const visibleAvailableBundles = storeFilter === 'all' || storeFilter === 'available' ? filterStoreItems(availableBundles) : []
  const profileBoardTheme: BoardTheme = {
    light: profileForm.board_light_color,
    dark: profileForm.board_dark_color,
    pattern: profileForm.board_pattern,
    frame_style: profileForm.board_frame_style,
    coordinate_style: profileForm.board_coordinate_style,
    effect: profileForm.board_effect,
    indicators: profileForm.move_indicator_theme,
  }

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
        <div className="dp-xp-panel">
          <div className="dp-xp-head">
            <span className="dp-ss-label">XP Progress</span>
            <strong className="dp-xp-meta">
              {experienceProgress.current}/{experienceProgress.required}
            </strong>
          </div>
          <div aria-hidden="true" className="dp-xp-bar">
            <span style={{ width: `${experienceProgress.percent}%` }} />
          </div>
          <p className="dp-xp-copy">
            {experienceProgress.remaining} XP to level {experienceProgress.nextLevel}
          </p>
        </div>

        {/* Nav */}
        <nav className="dp-nav" aria-label="Dashboard">
          {navItems.map((item) => (
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
              {navItems.find((n) => n.id === view)?.label}
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

                {visibleGames.length === 0 ? (
                  <div className="dp-empty">
                    <span className="dp-empty-glyph" aria-hidden="true">♟</span>
                    <p>No games yet</p>
                  </div>
                ) : (
                  <div className="dp-mini-game-list">
                    {visibleGames.slice(0, 4).map((game) => (
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

            <div className="dp-overview-extra">
              <section className="dp-progress-card">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">Daily Missions</h2>
                  <span className="dp-card-badge">{currentUser.profile.daily_missions.length}</span>
                </div>
                <div className="dp-progress-list">
                  {currentUser.profile.daily_missions.length === 0 ? (
                    <div className="dp-empty">
                      <span className="dp-empty-glyph" aria-hidden="true">☰</span>
                      <p>No daily missions yet.</p>
                    </div>
                  ) : (
                    currentUser.profile.daily_missions.map((mission) => {
                      const percent = mission.target === 0 ? 0 : Math.min(100, (mission.progress / mission.target) * 100)

                      return (
                        <article className="dp-progress-item" key={mission.key}>
                          <div className="dp-progress-head">
                            <div>
                              <strong>{mission.title}</strong>
                              <p>{mission.description}</p>
                            </div>
                            <span className={`dp-progress-state${mission.completed ? ' is-complete' : ''}`}>
                              {mission.completed ? 'Completed' : `${mission.progress}/${mission.target}`}
                            </span>
                          </div>
                          <div aria-hidden="true" className="dp-progress-bar">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                          <div className="dp-progress-reward">
                            <span>+{mission.reward.coins} coins</span>
                            <span>+{mission.reward.experience} XP</span>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>

              <section className="dp-progress-card">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">Achievements</h2>
                  <span className="dp-card-badge">
                    {currentUser.profile.achievements.filter((achievement) => achievement.unlocked).length}/
                    {currentUser.profile.achievements.length}
                  </span>
                </div>
                <div className="dp-progress-list">
                  {currentUser.profile.achievements.length === 0 ? (
                    <div className="dp-empty">
                      <span className="dp-empty-glyph" aria-hidden="true">♚</span>
                      <p>No achievements yet.</p>
                    </div>
                  ) : (
                    currentUser.profile.achievements.map((achievement) => {
                      const percent = achievement.target === 0 ? 0 : Math.min(100, (achievement.progress / achievement.target) * 100)

                      return (
                        <article className={`dp-progress-item${achievement.unlocked ? ' is-unlocked' : ''}`} key={achievement.key}>
                          <div className="dp-progress-head">
                            <div>
                              <strong>{achievement.title}</strong>
                              <p>{achievement.description}</p>
                            </div>
                            <span className={`dp-progress-state${achievement.unlocked ? ' is-complete' : ''}`}>
                              {achievement.unlocked ? 'Unlocked' : `${achievement.progress}/${achievement.target}`}
                            </span>
                          </div>
                          <div aria-hidden="true" className="dp-progress-bar">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                          <div className="dp-progress-reward">
                            <span>+{achievement.reward.coins} coins</span>
                            <span>+{achievement.reward.experience} XP</span>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
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
                <div className="dp-profile-xp">
                  <div className="dp-profile-xp-head">
                    <span className="dp-field-label">Progress To Level {experienceProgress.nextLevel}</span>
                    <strong>{experienceProgress.current}/{experienceProgress.required} XP</strong>
                  </div>
                  <div aria-hidden="true" className="dp-xp-bar dp-xp-bar--profile">
                    <span style={{ width: `${experienceProgress.percent}%` }} />
                  </div>
                  <p className="dp-profile-xp-copy">{experienceProgress.remaining} XP remaining</p>
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

                    <div className="dp-field dp-field--full">
                      <span className="dp-field-label">Board Theme</span>
                      <div className="dp-board-theme-panel">
                        <div
                          aria-hidden="true"
                          className={`dp-board-theme-preview is-frame-${profileForm.board_frame_style} is-coordinates-${profileForm.board_coordinate_style} is-effect-${profileForm.board_effect}`}
                          style={{
                            '--dp-move-dot-color': profileForm.move_indicator_theme.move_dot_color,
                            '--dp-capture-ring-color': profileForm.move_indicator_theme.capture_ring_color,
                            '--dp-selected-outline-color': profileForm.move_indicator_theme.selected_outline_color,
                            '--dp-last-move-overlay-color': profileForm.move_indicator_theme.last_move_overlay_color,
                          } as CSSProperties}
                        >
                          {profileForm.board_coordinate_style !== 'hidden' ? (
                            <div className="dp-board-theme-preview-files">
                              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((file) => (
                                <span key={file}>{file}</span>
                              ))}
                            </div>
                          ) : null}
                          {Array.from({ length: 64 }, (_, index) => {
                            const row = Math.floor(index / 8)
                            const col = index % 8
                            const isLight = (row + col) % 2 === 0

                            return (
                              <span
                                className={`dp-board-theme-square ${isLight ? 'is-light' : 'is-dark'}${index === 27 ? ' is-last-move' : ''}${index === 36 ? ' is-selected' : ''}${index === 45 ? ' is-target' : ''}${index === 46 ? ' is-capture-target' : ''}`}
                                key={index}
                                style={getBoardSquareStyle(profileBoardTheme, isLight)}
                              />
                            )
                          })}
                        </div>
                        <div className="dp-board-theme-controls">
                          <div className="dp-board-theme-color-grid">
                            <label className="dp-field">
                              <span className="dp-field-label">Light Squares</span>
                              <input
                                className="dp-color-input"
                                type="color"
                                value={profileForm.board_light_color}
                                onChange={(e) => onProfileFormChange((c) => ({ ...c, board_light_color: e.target.value }))}
                              />
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Dark Squares</span>
                              <input
                                className="dp-color-input"
                                type="color"
                                value={profileForm.board_dark_color}
                                onChange={(e) => onProfileFormChange((c) => ({ ...c, board_dark_color: e.target.value }))}
                              />
                            </label>
                          </div>
                          <div className="dp-board-theme-select-grid">
                            <label className="dp-field">
                              <span className="dp-field-label">Pattern</span>
                              <select
                                className="dp-select"
                                value={profileForm.board_pattern}
                                onChange={(e) => onProfileFormChange((c) => ({ ...c, board_pattern: e.target.value as BoardTheme['pattern'] }))}
                              >
                                {BOARD_PATTERN_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Frame</span>
                              <select
                                className="dp-select"
                                value={profileForm.board_frame_style}
                                onChange={(e) => onProfileFormChange((c) => ({ ...c, board_frame_style: e.target.value as BoardTheme['frame_style'] }))}
                              >
                                {BOARD_FRAME_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Coordinates</span>
                              <select
                                className="dp-select"
                                value={profileForm.board_coordinate_style}
                                onChange={(e) => onProfileFormChange((c) => ({ ...c, board_coordinate_style: e.target.value as BoardTheme['coordinate_style'] }))}
                              >
                                {BOARD_COORDINATE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Effect</span>
                              <select
                                className="dp-select"
                                value={profileForm.board_effect}
                                onChange={(e) => onProfileFormChange((c) => ({ ...c, board_effect: e.target.value as BoardTheme['effect'] }))}
                              >
                                {BOARD_EFFECT_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="dp-board-theme-indicators">
                            <label className="dp-field">
                              <span className="dp-field-label">Move Dot</span>
                              <input
                                className="dp-color-input"
                                type="color"
                                value={profileForm.move_indicator_theme.move_dot_color}
                                onChange={(e) => onProfileFormChange((c) => ({
                                  ...c,
                                  move_indicator_theme: { ...c.move_indicator_theme, move_dot_color: e.target.value },
                                }))}
                              />
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Capture Ring</span>
                              <input
                                className="dp-color-input"
                                type="color"
                                value={profileForm.move_indicator_theme.capture_ring_color}
                                onChange={(e) => onProfileFormChange((c) => ({
                                  ...c,
                                  move_indicator_theme: { ...c.move_indicator_theme, capture_ring_color: e.target.value },
                                }))}
                              />
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Selected Outline</span>
                              <input
                                className="dp-color-input"
                                type="color"
                                value={profileForm.move_indicator_theme.selected_outline_color}
                                onChange={(e) => onProfileFormChange((c) => ({
                                  ...c,
                                  move_indicator_theme: { ...c.move_indicator_theme, selected_outline_color: e.target.value },
                                }))}
                              />
                            </label>
                            <label className="dp-field">
                              <span className="dp-field-label">Last Move Overlay</span>
                              <input
                                className="dp-color-input"
                                type="color"
                                value={rgbaToHex(profileForm.move_indicator_theme.last_move_overlay_color)}
                                onChange={(e) => onProfileFormChange((c) => ({
                                  ...c,
                                  move_indicator_theme: {
                                    ...c.move_indicator_theme,
                                    last_move_overlay_color: hexToRgba(e.target.value, 0.18),
                                  },
                                }))}
                              />
                            </label>
                          </div>
                          <div className="dp-board-theme-presets">
                            {BOARD_THEME_PRESETS.map((preset) => (
                              <button
                                className="dp-theme-preset"
                                key={preset.label}
                                onClick={() =>
                                  onProfileFormChange((c) => ({
                                    ...c,
                                    board_light_color: preset.light,
                                    board_dark_color: preset.dark,
                                    board_pattern: preset.pattern,
                                    board_frame_style: preset.frame_style,
                                    board_coordinate_style: preset.coordinate_style,
                                    board_effect: preset.effect,
                                    move_indicator_theme: preset.indicators,
                                  }))
                                }
                                type="button"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <div className="dp-board-theme-saved">
                            <div className="dp-board-theme-saved-head">
                              <span className="dp-field-label">Saved Presets</span>
                              <button
                                className="dp-btn-secondary"
                                onClick={() =>
                                  onProfileFormChange((current) => {
                                    const nextIndex = current.board_theme_presets.length + 1
                                    const nextPreset = {
                                      name: `Preset ${nextIndex}`,
                                      light: current.board_light_color,
                                      dark: current.board_dark_color,
                                      pattern: current.board_pattern,
                                      frame_style: current.board_frame_style,
                                      coordinate_style: current.board_coordinate_style,
                                      effect: current.board_effect,
                                      indicators: current.move_indicator_theme,
                                    }

                                    return {
                                      ...current,
                                      board_theme_presets: [...current.board_theme_presets, nextPreset].slice(0, 8),
                                    }
                                  })
                                }
                                type="button"
                              >
                                Save Current Preset
                              </button>
                            </div>
                            <div className="dp-saved-theme-list">
                              {profileForm.board_theme_presets.length === 0 ? (
                                <span className="dp-inline-muted">No saved presets yet.</span>
                              ) : (
                                profileForm.board_theme_presets.map((preset, index) => (
                                  <div className="dp-saved-theme-item" key={`${preset.name}-${index}`}>
                                    <div className="dp-saved-theme-preview" aria-hidden="true">
                                      <span style={getBoardSquareStyle({
                                        light: preset.light,
                                        dark: preset.dark,
                                        pattern: preset.pattern,
                                        frame_style: preset.frame_style,
                                        coordinate_style: preset.coordinate_style,
                                        effect: preset.effect,
                                        indicators: preset.indicators,
                                      }, true)} />
                                      <span style={getBoardSquareStyle({
                                        light: preset.light,
                                        dark: preset.dark,
                                        pattern: preset.pattern,
                                        frame_style: preset.frame_style,
                                        coordinate_style: preset.coordinate_style,
                                        effect: preset.effect,
                                        indicators: preset.indicators,
                                      }, false)} />
                                    </div>
                                    <div className="dp-saved-theme-copy">
                                      <strong>{preset.name}</strong>
                                      <span>{preset.pattern} • {preset.frame_style} • {preset.coordinate_style} • {preset.effect}</span>
                                    </div>
                                    <div className="dp-saved-theme-actions">
                                      <button
                                        className="dp-btn-secondary"
                                        onClick={() => onApplyBoardTheme({
                                          light: preset.light,
                                          dark: preset.dark,
                                          pattern: preset.pattern,
                                          frame_style: preset.frame_style,
                                          coordinate_style: preset.coordinate_style,
                                          effect: preset.effect,
                                          indicators: preset.indicators,
                                        })}
                                        type="button"
                                      >
                                        Apply
                                      </button>
                                      <button
                                        className="dp-btn-secondary"
                                        onClick={() =>
                                          onProfileFormChange((current) => ({
                                            ...current,
                                            board_theme_presets: current.board_theme_presets.filter((_, presetIndex) => presetIndex !== index),
                                          }))
                                        }
                                        type="button"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                <p className="dp-section-sub">{visibleGames.length} visible game{visibleGames.length !== 1 ? 's' : ''} recorded</p>
              </div>
              <button className="dp-btn-secondary" onClick={onRefreshGames} type="button">
                ↺ Refresh
              </button>
            </div>

            {visibleGames.length === 0 ? (
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
                {visibleGames.map((game) => (
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
                    <div className="dp-inline-group">
                      {game.mode === 'ai' ? (
                        <button className="dp-inline-action" onClick={() => onOpenGame(game.id)} type="button">
                          Play
                        </button>
                      ) : (
                        <span className="dp-inline-muted">Future</span>
                      )}
                      <button className="dp-inline-action" onClick={() => onHideGame(game.id)} type="button">
                        Hide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hiddenGames.length > 0 ? (
              <div className="dp-hidden-section">
                <div className="dp-games-header">
                  <div>
                    <h2 className="dp-section-title">Hidden Matches</h2>
                    <p className="dp-section-sub">{hiddenGames.length} hidden</p>
                  </div>
                </div>
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
                  {hiddenGames.map((game) => (
                    <div key={game.id} className="dp-game-row">
                      <span className="dp-game-mode">{game.mode}</span>
                      <span className="dp-game-players">
                        {game.players.white?.username ?? 'Open'} <em>vs</em>{' '}
                        {game.players.black?.username ?? (game.mode === 'ai' ? game.ai_opponent_name : 'Open')}
                      </span>
                      <span className="dp-game-tc">{game.time_control_name}</span>
                      <span>{game.rated ? 'Rated' : 'Casual'}</span>
                      <span className={`dp-status-chip dp-status-chip--${game.status}`}>{game.status}</span>
                      <span className="dp-game-id">{game.id}</span>
                      <button className="dp-inline-action" onClick={() => onUnhideGame(game.id)} type="button">
                        Unhide
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {view === 'store' && (
          <div className="dp-store">
            {selectedBundle ? (
              <div className="dp-bundle-modal" role="dialog" aria-modal="true">
                <div className="dp-bundle-card">
                  <div className="dp-shop-preview" style={getStorePreviewStyle(selectedBundle.preview)}>
                    <span>Bundle</span>
                  </div>
                  <div className="dp-shop-copy">
                    <div className="dp-shop-head">
                      <h3>{selectedBundle.name}</h3>
                      <span className={`dp-shop-rarity dp-shop-rarity--${selectedBundle.rarity}`}>{selectedBundle.rarity}</span>
                    </div>
                    <p>{selectedBundle.description ?? 'Visual-only cosmetic bundle.'}</p>
                    <div className="dp-bundle-pieces">
                      {PIECE_CODES.map((pieceCode) => (
                        <div className="dp-bundle-piece" key={pieceCode}>
                          <span className="dp-field-label">{pieceCode.toUpperCase()}</span>
                          {selectedBundle.assets?.[pieceCode] ? (
                            <button
                              className="dp-bundle-piece-button"
                              onClick={() =>
                                setSelectedBundlePiece({
                                  code: pieceCode,
                                  src: selectedBundle.assets?.[pieceCode] ?? '',
                                })
                              }
                              type="button"
                            >
                              <img alt="" className="dp-piece-upload-preview" src={selectedBundle.assets[pieceCode]} />
                              <span className="dp-bundle-piece-hint">View</span>
                            </button>
                          ) : (
                            <span className="dp-inline-muted">None</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dp-shop-actions">
                    <button className="dp-btn-secondary" onClick={() => setSelectedBundle(null)} type="button">
                      Close
                    </button>
                  </div>
                </div>
                {selectedBundlePiece ? (
                  <div className="dp-piece-lightbox" role="dialog" aria-modal="true">
                    <div className="dp-piece-lightbox-card">
                      <p className="dp-field-label">Bundle Piece</p>
                      <strong>{selectedBundlePiece.code}</strong>
                      <img alt="" className="dp-piece-lightbox-image" src={selectedBundlePiece.src} />
                      <button className="dp-btn-secondary" onClick={() => setSelectedBundlePiece(null)} type="button">
                        Close Preview
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="dp-games-header">
              <div>
                <h2 className="dp-section-title">Cosmetic Store</h2>
                <p className="dp-section-sub">Boards and piece sets are visual-only cosmetics.</p>
              </div>
              <button className="dp-btn-secondary" onClick={onRefreshShop} type="button">
                ↺ Refresh
              </button>
            </div>

            {!shop ? (
              <div className="dp-empty dp-empty--lg">
                <span className="dp-empty-glyph" aria-hidden="true">♜</span>
                <p>No store data available yet.</p>
              </div>
            ) : (
              <>
                <div className="dp-store-top">
                  <div className="dp-store-balance">
                    <span className="dp-stat-label">Coin Balance</span>
                    <strong className="dp-stat-value">{shop.balance}</strong>
                  </div>

                  <div className="dp-store-equipped">
                    <div className="dp-equipped-card">
                      <span className="dp-field-label">Equipped Board</span>
                      <strong>{shop.equipped.board?.name ?? 'None'}</strong>
                    </div>
                    <div className="dp-equipped-card">
                      <span className="dp-field-label">Equipped Pieces</span>
                      <strong>{shop.equipped.piece_set?.name ?? 'None'}</strong>
                    </div>
                    <div className="dp-equipped-card">
                      <span className="dp-field-label">Owned Bundles</span>
                      <strong>{starterBundles.length + equippedBundles.length + ownedBundles.length}</strong>
                    </div>
                    <div className="dp-equipped-card">
                      <span className="dp-field-label">Available To Buy</span>
                      <strong>{availableBundles.length}</strong>
                    </div>
                  </div>
                </div>

                {featuredBundle ? (
                  <div className="dp-store-featured">
                    <div
                      className="dp-store-featured-visual"
                      style={getStorePreviewStyle(featuredBundle.preview)}
                    >
                      <span>Featured Bundle</span>
                    </div>
                    <div className="dp-store-featured-copy">
                      <div className="dp-shop-head">
                        <h3>{featuredBundle.name}</h3>
                        <span className={`dp-shop-rarity dp-shop-rarity--${featuredBundle.rarity}`}>{featuredBundle.rarity}</span>
                      </div>
                      <p>{featuredBundle.description ?? 'Highlighted cosmetic bundle for your collection.'}</p>
                      <div className="dp-shop-meta">
                        <span>{featuredBundle.owned ? 'Already owned' : 'Featured release'}</span>
                        <strong>{featuredBundle.price_soft_currency} coins</strong>
                      </div>
                    </div>
                    <div className="dp-store-featured-actions">
                      <button className="dp-btn-secondary" onClick={() => setSelectedBundle(featuredBundle)} type="button">
                        View Bundle
                      </button>
                      {featuredBundle.equipped ? (
                        STARTER_BUNDLE_SLUGS.has(featuredBundle.slug) ? (
                          <span className="dp-shop-owned">Starter Set</span>
                        ) : (
                          <button className="dp-btn-secondary" disabled={shopBusy} onClick={() => onUnequipCosmetic(featuredBundle.slug)} type="button">
                            Unequip
                          </button>
                        )
                      ) : featuredBundle.owned ? (
                        <button className="dp-btn-primary" disabled={shopBusy} onClick={() => onEquipCosmetic(featuredBundle.slug)} type="button">
                          Equip
                        </button>
                      ) : (
                        <button
                          className="dp-btn-primary"
                          disabled={shopBusy || shop.balance < featuredBundle.price_soft_currency}
                          onClick={() => onPurchaseCosmetic(featuredBundle.slug)}
                          type="button"
                        >
                          Buy Bundle
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="dp-store-toolbar">
                  <div className="dp-store-filters" role="tablist" aria-label="Store filters">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'starter', label: 'Starter' },
                      { id: 'equipped', label: 'Equipped' },
                      { id: 'owned', label: 'Owned' },
                      { id: 'available', label: 'Available' },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        className={`dp-store-filter${storeFilter === filter.id ? ' is-active' : ''}`}
                        onClick={() => setStoreFilter(filter.id as typeof storeFilter)}
                        type="button"
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <label className="dp-store-search">
                    <span className="dp-field-label">Search Bundles</span>
                    <input
                      className="dp-input"
                      onChange={(event) => setStoreQuery(event.target.value)}
                      placeholder="Search by name, slug, rarity..."
                      value={storeQuery}
                    />
                  </label>
                  <label className="dp-store-search">
                    <span className="dp-field-label">Sort By</span>
                    <select
                      className="dp-select"
                      onChange={(event) => setStoreSort(event.target.value as typeof storeSort)}
                      value={storeSort}
                    >
                      <option value="rarity">Rarity</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="name">Name</option>
                    </select>
                  </label>
                </div>

                <div className="dp-store-catalog">
                  <StoreSection
                    emptyCopy="No starter bundles configured."
                    items={visibleStarterBundles}
                    onEquipCosmetic={onEquipCosmetic}
                    onPurchaseCosmetic={onPurchaseCosmetic}
                    onUnequipCosmetic={onUnequipCosmetic}
                    onViewBundle={setSelectedBundle}
                    shopBalance={shop.balance}
                    shopBusy={shopBusy}
                    title="Starter Bundles"
                  />
                  <StoreSection
                    emptyCopy="No equipped bundles yet."
                    items={visibleEquippedBundles}
                    onEquipCosmetic={onEquipCosmetic}
                    onPurchaseCosmetic={onPurchaseCosmetic}
                    onUnequipCosmetic={onUnequipCosmetic}
                    onViewBundle={setSelectedBundle}
                    shopBalance={shop.balance}
                    shopBusy={shopBusy}
                    title="Equipped"
                  />
                  <StoreSection
                    emptyCopy="No extra owned bundles yet."
                    items={visibleOwnedBundles}
                    onEquipCosmetic={onEquipCosmetic}
                    onPurchaseCosmetic={onPurchaseCosmetic}
                    onUnequipCosmetic={onUnequipCosmetic}
                    onViewBundle={setSelectedBundle}
                    shopBalance={shop.balance}
                    shopBusy={shopBusy}
                    title="Owned"
                  />
                  <StoreSection
                    emptyCopy="No bundles available for purchase."
                    items={visibleAvailableBundles}
                    onEquipCosmetic={onEquipCosmetic}
                    onPurchaseCosmetic={onPurchaseCosmetic}
                    onUnequipCosmetic={onUnequipCosmetic}
                    onViewBundle={setSelectedBundle}
                    shopBalance={shop.balance}
                    shopBusy={shopBusy}
                    title="Available To Buy"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {view === 'admin' && currentUser.is_admin && (
          <div className="dp-store">
            <div className="dp-games-header">
              <div>
                <h2 className="dp-section-title">Admin</h2>
                <p className="dp-section-sub">Manage accounts and cosmetics.</p>
              </div>
              <button className="dp-btn-secondary" disabled={adminBusy} onClick={onRefreshAdmin} type="button">
                ↺ Refresh
              </button>
            </div>

            <div className="dp-admin-grid">
              <section className="dp-admin-panel">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">Accounts</h2>
                </div>
                <div className="dp-admin-list">
                  {adminUsers.map((adminUser) => {
                    const draft: AdminUserDraft = {
                      is_admin: adminUser.is_admin,
                      is_active: adminUser.is_active,
                      soft_currency: adminUser.soft_currency,
                      ...userDrafts[adminUser.id],
                    }

                    return (
                      <article className="dp-admin-item" key={adminUser.id}>
                        <div className="dp-admin-head">
                          <div>
                            <strong>{adminUser.username}</strong>
                            <p>{adminUser.email}</p>
                          </div>
                          <span className="dp-inline-muted">#{adminUser.id}</span>
                        </div>
                        <div className="dp-admin-fields">
                          <label className="dp-field">
                            <span className="dp-field-label">Coins</span>
                            <input
                              className="dp-input"
                              type="number"
                              min={0}
                              value={draft.soft_currency}
                              onChange={(event) =>
                                setUserDrafts((current) => ({
                                  ...current,
                                  [adminUser.id]: {
                                    ...current[adminUser.id],
                                    soft_currency: Number(event.target.value),
                                  },
                                }))
                              }
                            />
                          </label>
                          <label className="dp-check">
                            <input
                              checked={draft.is_admin}
                              onChange={(event) =>
                                setUserDrafts((current) => ({
                                  ...current,
                                  [adminUser.id]: {
                                    ...current[adminUser.id],
                                    is_admin: event.target.checked,
                                  },
                                }))
                              }
                              type="checkbox"
                            />
                            <span>Admin</span>
                          </label>
                          <label className="dp-check">
                            <input
                              checked={draft.is_active}
                              onChange={(event) =>
                                setUserDrafts((current) => ({
                                  ...current,
                                  [adminUser.id]: {
                                    ...current[adminUser.id],
                                    is_active: event.target.checked,
                                  },
                                }))
                              }
                              type="checkbox"
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <div className="dp-admin-actions">
                          <button className="dp-btn-secondary" disabled={adminBusy} onClick={() => onUpdateAdminUser(adminUser.id, draft)} type="button">
                            Save User
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="dp-admin-panel">
                <div className="dp-card-header">
                  <h2 className="dp-card-title">Create Cosmetic</h2>
                </div>
                <div className="dp-admin-item">
                  <div className="dp-admin-fields dp-admin-fields--wide">
                    {renderCosmeticFields(newCosmetic, (patch) =>
                      setNewCosmetic((current) => ({
                        ...current,
                        ...patch,
                      }))
                    )}
                  </div>
                  <div className="dp-admin-actions">
                    <button className="dp-btn-primary" disabled={adminBusy} onClick={() => onCreateAdminCosmetic(newCosmetic)} type="button">
                      Create Cosmetic
                    </button>
                  </div>
                </div>

                <div className="dp-card-header">
                  <h2 className="dp-card-title">Store Catalog</h2>
                </div>
                <div className="dp-admin-list">
                  {[...adminCosmetics].sort(compareAdminCosmetics).map((item) => {
                    const draft: CosmeticEditor = {
                    slug: item.slug,
                    name: item.name,
                    category: item.category,
                      rarity: item.rarity,
                      description: item.description ?? '',
                      price_soft_currency: item.price_soft_currency,
                      sort_order: item.sort_order,
                      is_active: item.is_active,
                      preview: {
                        primary: item.preview?.primary ?? '#b58863',
                        secondary: item.preview?.secondary ?? '#f0d9b5',
                        banner: item.preview?.banner ?? '',
                      },
                      assets: item.assets ?? {},
                      ...cosmeticDrafts[item.id],
                    }

                    return (
                      <details className="dp-admin-dropdown" key={item.id}>
                        <summary className="dp-admin-dropdown-summary">
                          <div className="dp-admin-head">
                            <div>
                              <strong>{item.name}</strong>
                              <p>{item.slug}</p>
                            </div>
                            <div className="dp-admin-summary-meta">
                              <span className={`dp-shop-rarity dp-shop-rarity--${item.rarity}`}>{item.rarity}</span>
                              <span className="dp-inline-muted">{item.category}</span>
                            </div>
                          </div>
                        </summary>
                        <article className="dp-admin-item">
                          <div className="dp-admin-fields dp-admin-fields--wide">
                            {renderCosmeticFields(draft, (patch) =>
                              setCosmeticDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  ...current[item.id],
                                  ...patch,
                                },
                              }))
                            )}
                          </div>
                          <div className="dp-admin-actions">
                            <button className="dp-btn-secondary" disabled={adminBusy} onClick={() => onUpdateAdminCosmetic(item.id, draft)} type="button">
                              Save Cosmetic
                            </button>
                          </div>
                        </article>
                      </details>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function renderCosmeticFields(
  value: CosmeticEditor,
  onPatch: (patch: Partial<CosmeticEditor>) => void,
) {
  const handlePieceAssetChange = async (
    event: ChangeEvent<HTMLInputElement>,
    pieceCode: (typeof PIECE_CODES)[number],
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null

      if (!result) {
        return
      }

      onPatch({
        assets: {
          ...value.assets,
          [pieceCode]: result,
        },
      })
    }
    reader.readAsDataURL(file)
  }

  const handleBannerChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null

      if (!result) {
        return
      }

      onPatch({
        preview: {
          ...value.preview,
          banner: result,
        },
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <label className="dp-field">
        <span className="dp-field-label">Slug</span>
        <input className="dp-input" value={value.slug} onChange={(event) => onPatch({ slug: event.target.value })} />
      </label>
      <label className="dp-field">
        <span className="dp-field-label">Name</span>
        <input className="dp-input" value={value.name} onChange={(event) => onPatch({ name: event.target.value })} />
      </label>
      <label className="dp-field">
        <span className="dp-field-label">Category</span>
        <select className="dp-select" value={value.category} onChange={(event) => onPatch({ category: event.target.value as 'board' | 'piece_set' | 'bundle' })}>
          <option value="bundle">Bundle</option>
          <option value="board">Board</option>
          <option value="piece_set">Piece Set</option>
        </select>
      </label>
      <label className="dp-field">
        <span className="dp-field-label">Rarity</span>
        <select className="dp-select" value={value.rarity} onChange={(event) => onPatch({ rarity: event.target.value })}>
          {RARITY_OPTIONS.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="dp-field dp-field--full">
        <span className="dp-field-label">Description</span>
        <textarea className="dp-textarea" rows={3} value={value.description} onChange={(event) => onPatch({ description: event.target.value })} />
      </label>
      <label className="dp-field">
        <span className="dp-field-label">Price</span>
        <input className="dp-input" type="number" min={0} value={value.price_soft_currency} onChange={(event) => onPatch({ price_soft_currency: Number(event.target.value) })} />
      </label>
      <label className="dp-field">
        <span className="dp-field-label">Sort Order</span>
        <input className="dp-input" type="number" min={0} value={value.sort_order} onChange={(event) => onPatch({ sort_order: Number(event.target.value) })} />
      </label>
      <div className="dp-field dp-field--full">
        <span className="dp-field-label">Store Card Banner</span>
        <div className="dp-admin-preview-grid">
          <div
            className="dp-shop-preview dp-admin-shop-preview"
            style={getStorePreviewStyle(value.preview)}
          >
            <span>{value.category === 'bundle' ? 'Bundle' : value.category === 'board' ? 'Board' : 'Pieces'}</span>
          </div>
          <div className="dp-banner-upload-controls">
            <label className="dp-field">
              <span className="dp-field-label">Banner Image</span>
              <input
                accept="image/*"
                className="dp-input"
                onChange={(event) => void handleBannerChange(event)}
                type="file"
              />
            </label>
            {value.preview.banner ? (
              <button
                className="dp-btn-secondary"
                onClick={() =>
                  onPatch({
                    preview: {
                      ...value.preview,
                      banner: '',
                    },
                  })
                }
                type="button"
              >
                Remove Banner
              </button>
            ) : (
              <span className="dp-inline-muted">Recommended: wide image, around 1200x420, under 2 MB.</span>
            )}
          </div>
        </div>
      </div>


      <label className="dp-check">
        <input checked={value.is_active} onChange={(event) => onPatch({ is_active: event.target.checked })} type="checkbox" />
        <span>Active in Store</span>
      </label>
      {value.category === 'piece_set' || value.category === 'bundle' ? (
        <div className="dp-piece-upload-grid">
          {PIECE_CODES.map((pieceCode) => (
            <label className="dp-field" key={pieceCode}>
              <span className="dp-field-label">{pieceCode.toUpperCase()}</span>
              <input
                accept="image/*"
                className="dp-input"
                onChange={(event) => void handlePieceAssetChange(event, pieceCode)}
                type="file"
              />
              {value.assets[pieceCode] ? (
                <img alt="" className="dp-piece-upload-preview" src={value.assets[pieceCode]} />
              ) : null}
            </label>
          ))}
        </div>
      ) : null}
    </>
  )
}

export default DashboardPage

type StoreSectionProps = {
  title: string
  items: ShopState['items']
  emptyCopy: string
  shopBusy: boolean
  shopBalance: number
  onViewBundle: (item: ShopState['items'][number]) => void
  onPurchaseCosmetic: (slug: string) => void
  onEquipCosmetic: (slug: string) => void
  onUnequipCosmetic: (slug: string) => void
}

function StoreSection({
  title,
  items,
  emptyCopy,
  shopBusy,
  shopBalance,
  onViewBundle,
  onPurchaseCosmetic,
  onEquipCosmetic,
  onUnequipCosmetic,
}: StoreSectionProps) {
  return (
    <section className="dp-store-section">
      <div className="dp-store-section-head">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="dp-store-section-empty">{emptyCopy}</div>
      ) : (
        <div className="dp-shop-grid">
          {items.map((item) => (
            <article className="dp-shop-card" key={item.slug}>
              <div
                className="dp-shop-preview"
                style={getStorePreviewStyle(item.preview)}
              >
                <span>{item.category === 'board' ? 'Board' : 'Pieces'}</span>
              </div>
              <div className="dp-shop-copy">
                <div className="dp-shop-head">
                  <h3>{item.name}</h3>
                  <span className={`dp-shop-rarity dp-shop-rarity--${item.rarity}`}>{item.rarity}</span>
                </div>
                <p>{item.description ?? 'Visual-only cosmetic.'}</p>
                <div className="dp-shop-meta">
                  <span>{item.category === 'bundle' ? 'Bundle' : item.category === 'board' ? 'Board Cosmetic' : 'Piece Set'}</span>
                  <strong>{item.price_soft_currency} coins</strong>
                </div>
              </div>
              <div className="dp-shop-actions">
                <button className="dp-btn-secondary" onClick={() => onViewBundle(item)} type="button">
                  View
                </button>
                {item.equipped ? (
                  STARTER_BUNDLE_SLUGS.has(item.slug) ? (
                    <span className="dp-shop-owned">Starter Set</span>
                  ) : (
                    <button className="dp-btn-secondary" disabled={shopBusy} onClick={() => onUnequipCosmetic(item.slug)} type="button">
                      Unequip
                    </button>
                  )
                ) : item.owned ? (
                  <button className="dp-btn-secondary" disabled={shopBusy} onClick={() => onEquipCosmetic(item.slug)} type="button">
                    Equip
                  </button>
                ) : (
                  <button
                    className="dp-btn-primary"
                    disabled={shopBusy || shopBalance < item.price_soft_currency}
                    onClick={() => onPurchaseCosmetic(item.slug)}
                    type="button"
                  >
                    Buy
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function compareStoreItems(left: ShopState['items'][number], right: ShopState['items'][number]) {
  return (
    rarityRank(right.rarity) - rarityRank(left.rarity) ||
    left.price_soft_currency - right.price_soft_currency ||
    left.name.localeCompare(right.name)
  )
}

function compareStoreItemsByMode(
  left: ShopState['items'][number],
  right: ShopState['items'][number],
  mode: 'rarity' | 'price_asc' | 'price_desc' | 'name',
) {
  if (mode === 'price_asc') {
    return left.price_soft_currency - right.price_soft_currency || left.name.localeCompare(right.name)
  }

  if (mode === 'price_desc') {
    return right.price_soft_currency - left.price_soft_currency || left.name.localeCompare(right.name)
  }

  if (mode === 'name') {
    return left.name.localeCompare(right.name)
  }

  return compareStoreItems(left, right)
}

function getStorePreviewStyle(preview: Record<string, string> | null | undefined): CSSProperties {
  const primary = preview?.primary ?? '#b58863'
  const secondary = preview?.secondary ?? '#f0d9b5'

  if (preview?.banner) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.56)), url(${preview.banner})`,
    }
  }

  return {
    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
  }
}

function pickFeaturedBundle(items: ShopState['items']) {
  const pool = items.filter((item) => !STARTER_BUNDLE_SLUGS.has(item.slug))

  if (pool.length === 0) {
    return items[0] ?? null
  }

  return [...pool].sort((left, right) => compareStoreItems(left, right))[0] ?? null
}

function rarityRank(rarity: string) {
  return (
    {
      common: 0,
      rare: 1,
      epic: 2,
      legendary: 3,
    }[rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'] ?? -1
  )
}

function compareAdminCosmetics(left: AdminCosmeticRecord, right: AdminCosmeticRecord) {
  return (
    left.category.localeCompare(right.category) ||
    rarityRank(right.rarity) - rarityRank(left.rarity) ||
    left.sort_order - right.sort_order ||
    left.name.localeCompare(right.name)
  )
}

function getBoardSquareStyle(theme: BoardTheme, isLight: boolean) {
  return {
    backgroundColor: isLight ? theme.light : theme.dark,
    backgroundImage: getBoardPattern(theme.pattern, isLight),
    backgroundBlendMode: 'overlay',
  }
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

function rgbaToHex(value: string) {
  const matches = value.match(/\d+(\.\d+)?/g)

  if (!matches || matches.length < 3) {
    return '#c9a84c'
  }

  return `#${matches
    .slice(0, 3)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')

  if (normalized.length !== 6) {
    return `rgba(201,168,76,${alpha})`
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${red},${green},${blue},${alpha})`
}

function getExperienceProgress(experience: number, level: number) {
  const safeLevel = Math.max(1, level)
  const required = safeLevel * 100
  const current = Math.max(
    0,
    Math.min(required, experience - totalExperienceBeforeLevel(safeLevel)),
  )

  return {
    current,
    required,
    remaining: Math.max(0, required - current),
    nextLevel: safeLevel + 1,
    percent: required === 0 ? 0 : Math.max(0, Math.min(100, (current / required) * 100)),
  }
}

function totalExperienceBeforeLevel(level: number) {
  const completedLevels = Math.max(0, level - 1)
  return (100 * completedLevels * level) / 2
}
