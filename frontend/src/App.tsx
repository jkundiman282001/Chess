import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import DashboardPage, {
  type CreateGameForm,
  type DashboardView,
  type ProfileForm,
} from './components/DashboardPage'
import GameRoom from './components/GameRoom'
import {
  clearStoredToken,
  createAdminCosmetic,
  createGame,
  equipCosmetic,
  fetchGame,
  fetchAdminCosmetics,
  fetchAdminUsers,
  fetchCurrentUser,
  fetchGamesIncludingHidden,
  fetchOpenCasualGames,
  fetchProfile,
  fetchShop,
  getApiUrl,
  getStoredToken,
  unequipCosmetic,
  login,
  logout,
  hideGame,
  joinCasualGame,
  purchaseCosmetic,
  register,
  setStoredToken,
  unhideGame,
  updateAdminCosmetic,
  updateAdminUser,
  updateProfile,
} from './api'
import type { AdminCosmeticRecord, AdminUserRecord, BoardTheme, GameSummary, ShopState, User } from './types'

type AuthMode = 'login' | 'register'
type GuestView = 'landing' | 'auth'

const initialProfileForm: ProfileForm = {
  username: '',
  name: '',
  bio: '',
  country_code: '',
  avatar_path: '',
  board_light_color: '#f0d9b5',
  board_dark_color: '#b58863',
  board_pattern: 'solid',
  board_frame_style: 'tournament',
  board_coordinate_style: 'classic',
  board_effect: 'none',
  move_indicator_theme: {
    move_dot_color: '#ffffff',
    capture_ring_color: '#de4e4e',
    selected_outline_color: '#c9a84c',
    last_move_overlay_color: 'rgba(201,168,76,0.18)',
  },
  board_theme_presets: [],
}

const initialCreateGameForm: CreateGameForm = {
  mode: 'ai',
  color_preference: 'random',
  initial_time_seconds: 600,
  increment_seconds: 5,
  ai_skill_level: 6,
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [guestView, setGuestView] = useState<GuestView>('landing')
  const [view, setView] = useState<DashboardView>('overview')
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [games, setGames] = useState<GameSummary[]>([])
  const [openCasualGames, setOpenCasualGames] = useState<GameSummary[]>([])
  const [activeGame, setActiveGame] = useState<GameSummary | null>(null)
  const [shop, setShop] = useState<ShopState | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([])
  const [adminCosmetics, setAdminCosmetics] = useState<AdminCosmeticRecord[]>([])
  const [profileForm, setProfileForm] = useState<ProfileForm>(initialProfileForm)
  const [gameForm, setGameForm] = useState<CreateGameForm>(initialCreateGameForm)
  const [loginForm, setLoginForm] = useState({
    login: '',
    password: '',
  })
  const [registerForm, setRegisterForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false)
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false)
  const [registerConfirmPasswordVisible, setRegisterConfirmPasswordVisible] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(() => getStoredToken() !== null)
  const [authBusy, setAuthBusy] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [gamesBusy, setGamesBusy] = useState(false)
  const [shopBusy, setShopBusy] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminLoaded, setAdminLoaded] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !user?.is_admin || view !== 'admin' || adminLoaded) {
      return
    }

    const activeToken = token
    let cancelled = false

    async function loadAdminData() {
      setAdminBusy(true)
      setError(null)

      try {
        const [usersResponse, cosmeticsResponse] = await Promise.all([
          fetchAdminUsers(activeToken),
          fetchAdminCosmetics(activeToken),
        ])

        if (cancelled) {
          return
        }

        setAdminUsers(usersResponse.users)
        setAdminCosmetics(cosmeticsResponse.items)
        setAdminLoaded(true)
      } catch (requestError) {
        if (cancelled) {
          return
        }

        setError(requestError instanceof Error ? requestError.message : 'Could not refresh admin data.')
        // Set loaded to true even on error to prevent infinite retry loop
        setAdminLoaded(true)
      } finally {
        setAdminBusy(false)
      }
    }

    void loadAdminData()

    return () => {
      cancelled = true
    }
  }, [token, user?.is_admin, view, adminLoaded])
  
  useEffect(() => {
    if (!token) {
      return
    }

    const activeToken = token
    let cancelled = false

    async function bootstrap() {
      try {
        const currentUserResponse = await fetchCurrentUser(activeToken)
        const profileResponse = await fetchProfile(activeToken)
        const [gamesResponse, openCasualResponse, shopResponse] = await Promise.all([
          fetchGamesIncludingHidden(activeToken),
          fetchOpenCasualGames(activeToken),
          fetchShop(activeToken),
        ])

        if (cancelled) return

        setUser(currentUserResponse.user)

        setProfileForm({
          username: currentUserResponse.user.username ?? '',
          name: currentUserResponse.user.name ?? '',
          bio: profileResponse.profile.bio ?? '',
          country_code: profileResponse.profile.country_code ?? '',
          avatar_path: profileResponse.profile.avatar_path ?? '',
          board_light_color: profileResponse.profile.board_theme.light,
          board_dark_color: profileResponse.profile.board_theme.dark,
          board_pattern: profileResponse.profile.board_theme.pattern,
          board_frame_style: profileResponse.profile.board_theme.frame_style,
          board_coordinate_style: profileResponse.profile.board_theme.coordinate_style,
          board_effect: profileResponse.profile.board_theme.effect,
          move_indicator_theme: profileResponse.profile.board_theme.indicators,
          board_theme_presets: profileResponse.profile.board_theme_presets,
        })

        setGames(gamesResponse.data)
        setOpenCasualGames(openCasualResponse.data)
        syncShop(shopResponse)
      } catch (err) {
        if (cancelled) return

        clearStoredToken()
        setToken(null)
        setUser(null)
        setGames([])
        setOpenCasualGames([])
        setActiveGame(null)
        setShop(null)

        setError(
          err instanceof Error
            ? err.message
            : 'Session expired. Please login again.',
        )
      } finally {
        if (!cancelled) {
          setBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [token])

  async function refreshGames(activeToken: string) {
    const [gamesResponse, openCasualResponse] = await Promise.all([
      fetchGamesIncludingHidden(activeToken),
      fetchOpenCasualGames(activeToken),
    ])
    setGames(gamesResponse.data)
    setOpenCasualGames(openCasualResponse.data)
  }

  async function refreshShop(activeToken: string) {
    const shopResponse = await fetchShop(activeToken)
    syncShop(shopResponse)
  }

  async function refreshAdmin(activeToken: string) {
    const [usersResponse, cosmeticsResponse] = await Promise.all([
      fetchAdminUsers(activeToken),
      fetchAdminCosmetics(activeToken),
    ])

    setAdminUsers(usersResponse.users)
    setAdminCosmetics(cosmeticsResponse.items)
  }

  function syncGame(game: GameSummary) {
    setActiveGame(game)
    setGames((currentGames) =>
      currentGames.some((currentGame) => currentGame.id === game.id)
        ? currentGames.map((currentGame) => (currentGame.id === game.id ? game : currentGame))
        : [game, ...currentGames],
    )
    setOpenCasualGames((currentGames) => currentGames.filter((currentGame) => currentGame.id !== game.id))
  }

  function syncUser(nextUser: User) {
    setUser(nextUser)
    setProfileForm((current) => ({
      ...current,
      username: nextUser.username ?? '',
      name: nextUser.name ?? '',
      bio: nextUser.profile.bio ?? '',
      country_code: nextUser.profile.country_code ?? '',
      avatar_path: nextUser.profile.avatar_path ?? '',
      board_light_color: nextUser.profile.board_theme.light,
      board_dark_color: nextUser.profile.board_theme.dark,
      board_pattern: nextUser.profile.board_theme.pattern,
      board_frame_style: nextUser.profile.board_theme.frame_style,
      board_coordinate_style: nextUser.profile.board_theme.coordinate_style,
      board_effect: nextUser.profile.board_theme.effect,
      move_indicator_theme: nextUser.profile.board_theme.indicators,
      board_theme_presets: nextUser.profile.board_theme_presets,
    }))
  }

  function syncShop(nextShop: ShopState) {
    setShop(nextShop)
    setUser((currentUser) =>
      currentUser
        ? {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              soft_currency: nextShop.balance,
              equipped_board: nextShop.equipped.board
                ? {
                    slug: nextShop.equipped.board.slug,
                    name: nextShop.equipped.board.name,
                    preview: nextShop.equipped.board.preview,
                    assets: nextShop.equipped.board.assets,
                  }
                : null,
              equipped_piece_set: nextShop.equipped.piece_set
                ? {
                    slug: nextShop.equipped.piece_set.slug,
                    name: nextShop.equipped.piece_set.name,
                    preview: nextShop.equipped.piece_set.preview,
                    assets: nextShop.equipped.piece_set.assets,
                  }
                : null,
            },
          }
        : currentUser,
    )
  }

  function handleProfileFormChange(updater: (current: ProfileForm) => ProfileForm) {
    setProfileForm((current) => {
      const next = updater(current)

      setUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              profile: {
                ...currentUser.profile,
                board_theme: {
                  light: next.board_light_color,
                  dark: next.board_dark_color,
                  pattern: next.board_pattern,
                  frame_style: next.board_frame_style,
                  coordinate_style: next.board_coordinate_style,
                  effect: next.board_effect,
                  indicators: next.move_indicator_theme,
                },
              },
            }
          : currentUser,
      )

      return next
    })
  }

  function openAuth(nextMode: AuthMode) {
    setAuthMode(nextMode)
    setGuestView('auth')
    setError(null)
    setMessage(null)
  }

  function handleAuthenticated(authenticatedToken: string, authenticatedUser: User) {
    setStoredToken(authenticatedToken)
    setToken(authenticatedToken)
    setUser(authenticatedUser)
    setGuestView('landing')
    setProfileForm({
      username: authenticatedUser.username ?? '',
      name: authenticatedUser.name ?? '',
      bio: authenticatedUser.profile.bio ?? '',
      country_code: authenticatedUser.profile.country_code ?? '',
      avatar_path: authenticatedUser.profile.avatar_path ?? '',
      board_light_color: authenticatedUser.profile.board_theme.light,
      board_dark_color: authenticatedUser.profile.board_theme.dark,
      board_pattern: authenticatedUser.profile.board_theme.pattern,
      board_frame_style: authenticatedUser.profile.board_theme.frame_style,
      board_coordinate_style: authenticatedUser.profile.board_theme.coordinate_style,
      board_effect: authenticatedUser.profile.board_theme.effect,
      move_indicator_theme: authenticatedUser.profile.board_theme.indicators,
      board_theme_presets: authenticatedUser.profile.board_theme_presets,
    })
    setAdminLoaded(false)
    setAdminUsers([])
    setAdminCosmetics([])
    setMessage(`Signed in as ${authenticatedUser.username}.`)
    setError(null)
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await login({
        ...loginForm,
        device_name: 'frontend-web',
      })

      handleAuthenticated(response.token, response.user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Login failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await register(registerForm)
      handleAuthenticated(response.token, response.user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Registration failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    if (!token) {
      return
    }

    try {
      await logout(token)
    } catch {
      // Clear local auth state even if the token is already invalid server-side.
    } finally {
      clearStoredToken()
      setToken(null)
      setUser(null)
      setGames([])
      setOpenCasualGames([])
      setActiveGame(null)
      setShop(null)
      setAdminUsers([])
      setAdminCosmetics([])
      setAdminBusy(false)
      setAdminLoaded(false)
      setGuestView('landing')
      setMessage('Session cleared.')
      setError(null)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setProfileBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await updateProfile(token, profileForm)

      setUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              username: response.profile.username,
              name: response.profile.name,
                profile: {
                  bio: response.profile.bio,
                  country_code: response.profile.country_code,
                  avatar_path: response.profile.avatar_path,
                  board_theme: response.profile.board_theme,
                board_theme_presets: response.profile.board_theme_presets,
                daily_missions: response.profile.daily_missions,
                achievements: response.profile.achievements,
                equipped_board: response.profile.equipped_board,
                equipped_piece_set: response.profile.equipped_piece_set,
                default_piece_sets: currentUser.profile.default_piece_sets,
                ranked_rating: response.profile.ranked_rating,
                highest_ranked_rating: response.profile.highest_ranked_rating,
                experience: response.profile.experience,
                level: response.profile.level,
                soft_currency: response.profile.soft_currency,
              },
            }
          : currentUser,
      )
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Profile update failed.')
    } finally {
      setProfileBusy(false)
    }
  }

  function handleApplyBoardTheme(theme: BoardTheme) {
    setProfileForm((current) => ({
      ...current,
      board_light_color: theme.light,
      board_dark_color: theme.dark,
      board_pattern: theme.pattern,
      board_frame_style: theme.frame_style,
      board_coordinate_style: theme.coordinate_style,
      board_effect: theme.effect,
      move_indicator_theme: theme.indicators,
    }))

    setUser((currentUser) =>
      currentUser
        ? {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              board_theme: theme,
            },
          }
        : currentUser,
    )
  }

  async function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setGamesBusy(true)
    setError(null)
    setMessage(null)

    try {
      const payload =
        gameForm.mode === 'ai'
          ? gameForm
          : {
              mode: gameForm.mode,
              color_preference: gameForm.color_preference,
              initial_time_seconds: gameForm.initial_time_seconds,
              increment_seconds: gameForm.increment_seconds,
            }

      const response = await createGame(token, payload)
      await refreshGames(token)
      setView('games')

      if (response.game.mode === 'ai' || response.game.mode === 'casual') {
        const gameDetail = await fetchGame(token, response.game.id)
        syncGame(gameDetail.game)
      }

      setMessage(
        response.game.mode === 'casual'
          ? `Casual lobby ${response.game.id} created.`
          : `Game ${response.game.id} created.`,
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Game creation failed.')
    } finally {
      setGamesBusy(false)
    }
  }

  async function handleRefreshShop() {
    if (!token) {
      return
    }

    setShopBusy(true)
    setError(null)

    try {
      await refreshShop(token)
      setMessage('Store refreshed.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not refresh store.')
    } finally {
      setShopBusy(false)
    }
  }

  async function handlePurchaseCosmetic(slug: string) {
    if (!token) {
      return
    }

    setShopBusy(true)
    setError(null)

    try {
      const response = await purchaseCosmetic(token, slug)
      syncShop(response)
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Purchase failed.')
    } finally {
      setShopBusy(false)
    }
  }

  async function handleEquipCosmetic(slug: string) {
    if (!token) {
      return
    }

    setShopBusy(true)
    setError(null)

    try {
      const response = await equipCosmetic(token, slug)
      syncShop(response)
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Equip failed.')
    } finally {
      setShopBusy(false)
    }
  }

  async function handleUnequipCosmetic(slug: string) {
    if (!token) {
      return
    }

    setShopBusy(true)
    setError(null)

    try {
      const response = await unequipCosmetic(token, slug)
      syncShop(response)
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unequip failed.')
    } finally {
      setShopBusy(false)
    }
  }

  async function handleRefreshAdmin() {
    if (!token || !user?.is_admin) {
      return
    }

    setAdminBusy(true)
    setError(null)

    try {
      await refreshAdmin(token)
      setAdminLoaded(true)
      setMessage('Admin data refreshed.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not refresh admin data.')
    } finally {
      setAdminBusy(false)
    }
  }

  async function handleUpdateAdminUser(
    userId: number,
    payload: { is_admin: boolean; is_active: boolean; soft_currency: number },
  ) {
    if (!token) {
      return
    }

    setAdminBusy(true)
    setError(null)

    try {
      const response = await updateAdminUser(token, userId, payload)
      setAdminUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser.id === userId ? response.user : currentUser)),
      )
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update user.')
    } finally {
      setAdminBusy(false)
    }
  }

  async function handleCreateAdminCosmetic(payload: {
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
  }) {
    if (!token || adminBusy) {
      return
    }

    setAdminBusy(true)
    setError(null)

    try {
      const response = await createAdminCosmetic(token, payload)
      setAdminCosmetics((currentCosmetics) =>
        [...currentCosmetics, response.item].sort(
          (left, right) => left.sort_order - right.sort_order || left.id - right.id,
        ),
      )
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create cosmetic.')
    } finally {
      setAdminBusy(false)
    }
  }

  async function handleUpdateAdminCosmetic(
    cosmeticId: number,
    payload: {
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
    },
  ) {
    if (!token) {
      return
    }

    setAdminBusy(true)
    setError(null)

    try {
      const response = await updateAdminCosmetic(token, cosmeticId, payload)
      setAdminCosmetics((currentCosmetics) =>
        currentCosmetics
          .map((currentCosmetic) => (currentCosmetic.id === cosmeticId ? response.item : currentCosmetic))
          .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
      )
      setMessage(response.message)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update cosmetic.')
    } finally {
      setAdminBusy(false)
    }
  }

  if (bootstrapping) {
    return (
      <main className="app-shell loading-shell">
        <section className="loading-panel">
          <p className="eyebrow">Web Chess Platform</p>
          <h1>Restoring your session.</h1>
          <p className="lead">
            Reconnecting to <code>{getApiUrl()}</code> and loading your dashboard.
          </p>
        </section>
      </main>
    )
  }

  const isAuthenticated = Boolean(token && user)
  const currentUser = isAuthenticated ? user : null
  const renderPasswordIcon = (isVisible: boolean) =>
    isVisible ? (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M3 5.27 4.28 4 20 19.72 18.73 21l-2.3-2.3A11.9 11.9 0 0 1 12 19C7 19 2.73 16.11 1 12c.83-1.96 2.23-3.68 4.02-4.97L3 5.27Zm6.71 6.71 3.31 3.31A3.97 3.97 0 0 1 12 16a4 4 0 0 1-4-4c0-.37.05-.71.15-1.04l1.56 1.02ZM12 5c5 0 9.27 2.89 11 7a11.83 11.83 0 0 1-3.91 4.89l-2.86-2.86a4 4 0 0 0-5.12-5.12L8.96 6.76A12.5 12.5 0 0 1 12 5Zm0 3a4 4 0 0 1 4 4c0 .59-.13 1.14-.35 1.63l-5.28-5.28c.49-.22 1.04-.35 1.63-.35Z"
          fill="currentColor"
        />
      </svg>
    ) : (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M12 5c5 0 9.27 2.89 11 7-1.73 4.11-6 7-11 7S2.73 16.11 1 12c1.73-4.11 6-7 11-7Zm0 2C8.13 7 4.82 9.12 3.13 12 4.82 14.88 8.13 17 12 17s7.18-2.12 8.87-5C19.18 9.12 15.87 7 12 7Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Zm0 2A.5.5 0 1 0 12.5 12a.5.5 0 0 0-.5-.5Z"
          fill="currentColor"
        />
      </svg>
    )

  return (
    <main className={`app-shell ${isAuthenticated ? 'dashboard-shell' : 'marketing-shell'}`}>
      {message ? <section className="flash success">{message}</section> : null}
      {error ? <section className="flash error">{error}</section> : null}

      {!isAuthenticated ? (
        <>
          {guestView === 'landing' ? (
            <>
              <header className="marketing-nav marketing-frame">
                <div className="brand-lockup">
                  <span className="brand-mark">CM</span>
                  <div>
                    <strong>Checkmate</strong>
                    <p>Online chess</p>
                  </div>
                </div>

                <nav className="marketing-links" aria-label="Primary">
                  <a href="#play">Play</a>
                  <a href="#ranked">Ranked</a>
                  <a href="#auth">Account</a>
                </nav>

                <div className="nav-actions">
                  <button className="secondary-button" onClick={() => openAuth('login')} type="button">
                    Login
                  </button>
                  <button className="primary-button" onClick={() => openAuth('register')} type="button">
                    Play free
                  </button>
                </div>
              </header>

              <section className="landing-hero marketing-frame" id="play">
                <div className="hero-copy hero-slab">
                  <div className="hero-copy-inner">
                    <p className="eyebrow">Play Online</p>
                    <h1>Clean. Fast. Competitive.</h1>
                    <p className="lead">Ranked, AI, progression, cosmetics.</p>

                    <div className="hero-actions">
                      <button className="primary-button hero-cta" onClick={() => openAuth('register')} type="button">
                        Create account
                      </button>
                      <button className="secondary-button" onClick={() => openAuth('login')} type="button">
                        Login
                      </button>
                    </div>

                    <div className="hero-pills">
                      <span>Ranked</span>
                      <span>AI</span>
                      <span>Cosmetics</span>
                    </div>
                  </div>
                </div>

                <aside className="hero-preview hero-stage">
                  <div className="hero-orbit hero-orbit-a" aria-hidden="true" />
                  <div className="hero-orbit hero-orbit-b" aria-hidden="true" />

                  <article className="floating-panel queue-card">
                    <div className="preview-topline">
                      <span className="preview-badge">Ranked</span>
                      <span>00:12</span>
                    </div>
                    <strong>Ranked Blitz</strong>
                    <p>Gold II • 1248 ELO</p>
                  </article>

                  <article className="floating-panel board-shell">
                    <div className="board-shell-top">
                      <div>
                        <span className="stat-label">Live Match</span>
                        <strong>Board Focus</strong>
                      </div>
                      <span className="timer-chip">04:38</span>
                    </div>

                    <div className="board-preview" aria-hidden="true">
                      {Array.from({ length: 64 }).map((_, index) => (
                        <span
                          className={`board-cell ${(Math.floor(index / 8) + index) % 2 === 0 ? 'cell-light' : 'cell-dark'}`}
                          key={index}
                        />
                      ))}
                      <span className="piece white-king">♔</span>
                      <span className="piece white-queen">♕</span>
                      <span className="piece black-king">♚</span>
                      <span className="piece black-knight">♞</span>
                      <span className="move-indicator move-a" />
                      <span className="move-indicator move-b" />
                      <span className="last-move from" />
                      <span className="last-move to" />
                    </div>

                    <div className="preview-pills">
                      <span>Moves</span>
                      <span>Timer</span>
                      <span>Clarity</span>
                    </div>
                  </article>

                  <div className="stage-sidebar">
                    <article className="floating-panel rank-card" id="ranked">
                      <span className="stat-label">Rank</span>
                      <strong>Gold II</strong>
                      <p>72% to next tier</p>
                      <div className="progress-bar">
                        <span />
                      </div>
                    </article>

                    <article className="floating-panel skin-card">
                      <span className="stat-label">Loadout</span>
                      <strong>Obsidian Knights</strong>
                      <p>High contrast.</p>
                    </article>
                  </div>
                </aside>
              </section>

              <section className="feature-band landing-band marketing-frame">
                <article className="feature-slot">
                  <div className="feature-slot-box">
                    <span className="stat-label">Mode</span>
                    <strong>Ranked</strong>
                  </div>
                </article>
                <article className="feature-slot">
                  <div className="feature-slot-box">
                    <span className="stat-label">Mode</span>
                    <strong>Versus AI</strong>
                  </div>
                </article>
                <article className="feature-slot">
                  <div className="feature-slot-box">
                    <span className="stat-label">Style</span>
                    <strong>Cosmetics</strong>
                  </div>
                </article>
              </section>

              <section className="panel final-cta" id="auth">
                <div className="final-cta-copy">
                  <p className="eyebrow">Start</p>
                  <h2>Play when you’re ready.</h2>
                </div>
                <div className="hero-actions cta-actions">
                  <button className="primary-button hero-cta" onClick={() => openAuth('register')} type="button">
                    Create account
                  </button>
                  <button className="secondary-button" onClick={() => openAuth('login')} type="button">
                    Login
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="auth-page">
              <header className="auth-page-top marketing-frame">
                <button className="back-link" onClick={() => setGuestView('landing')} type="button">
                  Back to landing
                </button>
              </header>

              <div className="auth-layout auth-stage">
                <article className="auth-brand-panel marketing-frame">
                  <div className="auth-brand-copy">
                    <p className="eyebrow">Player Access</p>
                    <h1>Log in, queue up, and get back into competition.</h1>
                    <p className="lead">
                      The auth flow should feel like the front gate to a live competitive platform:
                      direct, confident, and built to get players back into the match loop fast.
                    </p>
                  </div>

                  <div className="auth-benefits">
                    <div className="auth-benefit-card">
                      <strong>Ranked ladder</strong>
                      <p>Readable MMR movement, promotion pressure, and clean deltas.</p>
                    </div>
                    <div className="auth-benefit-card">
                      <strong>Versus AI</strong>
                      <p>Warm up quickly before entering live queue.</p>
                    </div>
                    <div className="auth-benefit-card">
                      <strong>Cosmetic loadouts</strong>
                      <p>Competitive identity with readability constraints intact.</p>
                    </div>
                  </div>

                  <div className="auth-mood-grid">
                    <article className="auth-mood-card">
                      <span className="stat-label">Match HUD</span>
                      <strong>Selected piece • move hints • timers</strong>
                    </article>
                    <article className="auth-mood-card">
                      <span className="stat-label">Player Loop</span>
                      <strong>Queue • climb • unlock • repeat</strong>
                    </article>
                  </div>
                </article>

                <article className="panel auth-panel auth-panel-lux">
                  <div className="auth-panel-glow" aria-hidden="true" />
                  <div className="auth-panel-head">
                    <div>
                      <p className="eyebrow">Account</p>
                      <h2>{authMode === 'login' ? 'Login to your account' : 'Create your account'}</h2>
                      <p className="auth-subcopy">
                        {authMode === 'login'
                          ? 'Load your profile, rating, and current progression.'
                          : 'Create a player account and enter the competitive stack.'}
                      </p>
                    </div>
                    <div className="auth-switch">
                      <button
                        className={authMode === 'login' ? 'is-active' : ''}
                        onClick={() => setAuthMode('login')}
                        type="button"
                      >
                        Login
                      </button>
                      <button
                        className={authMode === 'register' ? 'is-active' : ''}
                        onClick={() => setAuthMode('register')}
                        type="button"
                      >
                        Register
                      </button>
                    </div>
                  </div>

                  {authMode === 'login' ? (
                    <form className="form-grid auth-form" onSubmit={handleLoginSubmit}>
                      <label className="form-span-2">
                        <span>Email or username</span>
                        <input
                          value={loginForm.login}
                          onChange={(event) =>
                            setLoginForm((current) => ({ ...current, login: event.target.value }))
                          }
                          placeholder="player@example.com"
                          required
                        />
                      </label>
                      <label className="form-span-2">
                        <span>Password</span>
                        <div className="password-input-wrap">
                          <input
                            type={loginPasswordVisible ? 'text' : 'password'}
                            value={loginForm.password}
                            onChange={(event) =>
                              setLoginForm((current) => ({ ...current, password: event.target.value }))
                            }
                            placeholder="Enter your password"
                            required
                          />
                          <button
                            aria-label={loginPasswordVisible ? 'Hide password' : 'Show password'}
                            className="password-toggle"
                            onClick={() => setLoginPasswordVisible((current) => !current)}
                            type="button"
                          >
                            {renderPasswordIcon(loginPasswordVisible)}
                          </button>
                        </div>
                      </label>
                      <div className="form-support form-span-2">
                        <span>Use your existing account to continue where you left off.</span>
                        <button className="text-button" onClick={() => setAuthMode('register')} type="button">
                          Need an account?
                        </button>
                      </div>
                      <button className="primary-button" disabled={authBusy} type="submit">
                        {authBusy ? 'Signing in...' : 'Login'}
                      </button>
                    </form>
                  ) : (
                    <form className="form-grid auth-form" onSubmit={handleRegisterSubmit}>
                      <label>
                        <span>Username</span>
                        <input
                          value={registerForm.username}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              username: event.target.value,
                            }))
                          }
                          placeholder="boardmaster"
                          required
                        />
                      </label>
                      <label>
                        <span>Display name</span>
                        <input
                          value={registerForm.name}
                          onChange={(event) =>
                            setRegisterForm((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder="Board Master"
                        />
                      </label>
                      <label className="form-span-2">
                        <span>Email</span>
                        <input
                          type="email"
                          value={registerForm.email}
                          onChange={(event) =>
                            setRegisterForm((current) => ({ ...current, email: event.target.value }))
                          }
                          placeholder="player@example.com"
                          required
                        />
                      </label>
                      <label>
                        <span>Password</span>
                        <div className="password-input-wrap">
                          <input
                            type={registerPasswordVisible ? 'text' : 'password'}
                            value={registerForm.password}
                            onChange={(event) =>
                              setRegisterForm((current) => ({
                                ...current,
                                password: event.target.value,
                              }))
                            }
                            placeholder="At least 8 characters"
                            required
                          />
                          <button
                            aria-label={registerPasswordVisible ? 'Hide password' : 'Show password'}
                            className="password-toggle"
                            onClick={() => setRegisterPasswordVisible((current) => !current)}
                            type="button"
                          >
                            {renderPasswordIcon(registerPasswordVisible)}
                          </button>
                        </div>
                      </label>
                      <label>
                        <span>Confirm password</span>
                        <div className="password-input-wrap">
                          <input
                            type={registerConfirmPasswordVisible ? 'text' : 'password'}
                            value={registerForm.password_confirmation}
                            onChange={(event) =>
                              setRegisterForm((current) => ({
                                ...current,
                                password_confirmation: event.target.value,
                              }))
                            }
                            placeholder="Repeat your password"
                            required
                          />
                          <button
                            aria-label={registerConfirmPasswordVisible ? 'Hide password' : 'Show password'}
                            className="password-toggle"
                            onClick={() => setRegisterConfirmPasswordVisible((current) => !current)}
                            type="button"
                          >
                            {renderPasswordIcon(registerConfirmPasswordVisible)}
                          </button>
                        </div>
                      </label>
                      <div className="form-support form-span-2">
                        <span>Account creation drops you directly into the connected frontend.</span>
                        <button className="text-button" onClick={() => setAuthMode('login')} type="button">
                          Already registered?
                        </button>
                      </div>
                      <button className="primary-button" disabled={authBusy} type="submit">
                        {authBusy ? 'Creating account...' : 'Create account'}
                      </button>
                    </form>
                  )}
                </article>
              </div>
            </section>
          )}
        </>
      ) : (
        activeGame && currentUser ? (
          <GameRoom
            key={activeGame.id}
            currentUser={currentUser}
            token={token ?? ''}
            game={activeGame}
            onBack={() => setActiveGame(null)}
            onGameChange={syncGame}
            onUserChange={syncUser}
          />
        ) : currentUser ? (
          <DashboardPage
            currentUser={currentUser}
            view={view}
            onViewChange={setView}
            onLogout={handleLogout}
            gameForm={gameForm}
            onGameFormChange={setGameForm}
            onCreateGame={handleCreateGame}
            gamesBusy={gamesBusy}
            profileForm={profileForm}
            onProfileFormChange={handleProfileFormChange}
            onProfileSubmit={handleProfileSubmit}
            onApplyBoardTheme={handleApplyBoardTheme}
            profileBusy={profileBusy}
            games={games}
            openCasualGames={openCasualGames}
            shop={shop}
            shopBusy={shopBusy}
            adminUsers={adminUsers}
            adminCosmetics={adminCosmetics}
            adminBusy={adminBusy}
            onOpenGame={(gameId) => {
              if (!token) {
                return
              }

              setGamesBusy(true)
              setError(null)
              void fetchGame(token, gameId)
                .then((response) => {
                  syncGame(response.game)
                })
                .catch((requestError: unknown) =>
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : 'Could not open the selected game.',
                  ),
                )
                .finally(() => setGamesBusy(false))
            }}
            onRefreshGames={() => {
              if (!token) {
                return
              }

              setGamesBusy(true)
              void refreshGames(token)
                .then(() => setMessage('Games refreshed.'))
                .catch((requestError: unknown) =>
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : 'Could not refresh games.',
                  ),
                )
                .finally(() => setGamesBusy(false))
            }}
            onJoinCasualGame={(gameId) => {
              if (!token) {
                return
              }

              setGamesBusy(true)
              setError(null)
              void joinCasualGame(token, gameId)
                .then((response) => {
                  syncGame(response.game)
                  setMessage('Casual match joined.')
                })
                .catch((requestError: unknown) =>
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : 'Could not join casual match.',
                  ),
                )
                .finally(() => setGamesBusy(false))
            }}
            onHideGame={(gameId) => {
              if (!token) {
                return
              }

              setGamesBusy(true)
              setError(null)
              void hideGame(token, gameId)
                .then((response) => {
                  setGames((currentGames) =>
                    currentGames.map((game) => (game.id === gameId ? { ...game, hidden: true } : game)),
                  )
                  setMessage(response.message)
                })
                .catch((requestError: unknown) =>
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : 'Could not hide match.',
                  ),
                )
                .finally(() => setGamesBusy(false))
            }}
            onUnhideGame={(gameId) => {
              if (!token) {
                return
              }

              setGamesBusy(true)
              setError(null)
              void unhideGame(token, gameId)
                .then((response) => {
                  setGames((currentGames) =>
                    currentGames.map((game) => (game.id === gameId ? { ...game, hidden: false } : game)),
                  )
                  setMessage(response.message)
                })
                .catch((requestError: unknown) =>
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : 'Could not unhide match.',
                  ),
                )
                .finally(() => setGamesBusy(false))
            }}
            onRefreshShop={() => {
              void handleRefreshShop()
            }}
            onPurchaseCosmetic={(slug) => {
              void handlePurchaseCosmetic(slug)
            }}
            onEquipCosmetic={(slug) => {
              void handleEquipCosmetic(slug)
            }}
            onUnequipCosmetic={(slug) => {
              void handleUnequipCosmetic(slug)
            }}
            onRefreshAdmin={() => {
              void handleRefreshAdmin()
            }}
            onUpdateAdminUser={(userId, payload) => {
              void handleUpdateAdminUser(userId, payload)
            }}
            onCreateAdminCosmetic={(payload) => {
              void handleCreateAdminCosmetic(payload)
            }}
            onUpdateAdminCosmetic={(cosmeticId, payload) => {
              void handleUpdateAdminCosmetic(cosmeticId, payload)
            }}
          />
        ) : null
      )}
    </main>
  )
}

export default App
