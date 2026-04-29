import type { AdminCosmeticRecord, AdminUserRecord, AuthResponse, BoardThemePreset, GameListResponse, GameSummary, Profile, ShopState, User } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const TOKEN_STORAGE_KEY = 'chess-api-token'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  token?: string | null
  body?: unknown
}

export function getApiUrl() {
  return API_URL
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  // 🔥 HANDLE 401 HERE
  if (response.status === 401) {
    clearStoredToken()
    window.location.reload()
    throw new Error('Session expired.')
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; errors?: Record<string, string[]> }
    | T
    | null

  if (!response.ok) {
    const validationErrors =
      payload && typeof payload === 'object' && 'errors' in payload && payload.errors
        ? flattenValidationErrors(payload.errors)
        : null

    throw new Error(
      validationErrors ??
        (payload && typeof payload === 'object' && 'message' in payload && payload.message
          ? payload.message
          : 'Request failed.'),
    )
  }

  return payload as T
}

function flattenValidationErrors(errors: Record<string, string[]>) {
  return Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join(' | ')
}

export function register(payload: {
  username: string
  name: string
  email: string
  password: string
  password_confirmation: string
}) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export function login(payload: {
  login: string
  password: string
  device_name: string
}) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export function fetchCurrentUser(token: string) {
  return apiRequest<{ user: User }>('/auth/me', { token })
}

export function logout(token: string) {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    token,
  })
}

export function fetchProfile(token: string) {
  return apiRequest<{ profile: Profile & { username: string; name: string } }>('/profile', {
    token,
  })
}

export function updateProfile(
  token: string,
  payload: {
    username: string
    name: string
    bio: string
    country_code: string
    avatar_path: string
    board_light_color: string
    board_dark_color: string
    board_pattern: 'solid' | 'wood' | 'marble' | 'obsidian' | 'parchment' | 'neon'
    board_frame_style: 'none' | 'tournament' | 'gold' | 'iron' | 'royal'
    board_coordinate_style: 'classic' | 'mono' | 'minimal' | 'hidden'
    board_effect: 'none' | 'fire'
    move_indicator_theme: {
      move_dot_color: string
      capture_ring_color: string
      selected_outline_color: string
      last_move_overlay_color: string
    }
    board_theme_presets: BoardThemePreset[]
  },
) {
  return apiRequest<{ message: string; profile: Profile & { username: string; name: string } }>(
    '/profile',
    {
      method: 'PATCH',
      token,
      body: payload,
    },
  )
}

export function createGame(
  token: string,
  payload: {
    mode: 'casual' | 'ranked' | 'ai'
    color_preference: 'white' | 'black' | 'random'
    initial_time_seconds: number
    increment_seconds: number
    ai_skill_level?: number
  },
) {
  return apiRequest<{ game: GameSummary }>('/games', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function fetchGames(token: string) {
  return apiRequest<GameListResponse>('/games', { token })
}

export function fetchGamesIncludingHidden(token: string) {
  return apiRequest<GameListResponse>('/games?include_hidden=1', { token })
}

export function fetchGame(token: string, gameId: string) {
  return apiRequest<{ game: GameSummary }>(`/games/${gameId}`, { token })
}

export function submitAiMove(
  token: string,
  gameId: string,
  payload: {
    from: string
    to: string
    promotion?: 'q' | 'r' | 'b' | 'n'
    state_version: number
  },
) {
  return apiRequest<{ game: GameSummary; user: User }>(`/games/${gameId}/moves`, {
    method: 'POST',
    token,
    body: payload,
  })
}

export function resignAiGame(token: string, gameId: string) {
  return apiRequest<{ game: GameSummary; user: User }>(`/games/${gameId}/resign`, {
    method: 'POST',
    token,
  })
}

export function hideGame(token: string, gameId: string) {
  return apiRequest<{ message: string }>(`/games/${gameId}/hide`, {
    method: 'POST',
    token,
  })
}

export function unhideGame(token: string, gameId: string) {
  return apiRequest<{ message: string }>(`/games/${gameId}/unhide`, {
    method: 'POST',
    token,
  })
}

export function fetchShop(token: string) {
  return apiRequest<ShopState>('/shop', { token })
}

export function purchaseCosmetic(token: string, slug: string) {
  return apiRequest<{ message: string } & ShopState>('/shop/purchase', {
    method: 'POST',
    token,
    body: { slug },
  })
}

export function equipCosmetic(token: string, slug: string) {
  return apiRequest<{ message: string } & ShopState>('/shop/equip', {
    method: 'POST',
    token,
    body: { slug },
  })
}

export function unequipCosmetic(token: string, slug: string) {
  return apiRequest<{ message: string } & ShopState>('/shop/unequip', {
    method: 'POST',
    token,
    body: { slug },
  })
}

export function fetchAdminUsers(token: string) {
  return apiRequest<{ users: AdminUserRecord[] }>('/admin/users', { token })
}

export function updateAdminUser(
  token: string,
  userId: number,
  payload: {
    is_admin: boolean
    is_active: boolean
    soft_currency: number
  },
) {
  return apiRequest<{ message: string; user: AdminUserRecord }>(`/admin/users/${userId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function fetchAdminCosmetics(token: string) {
  return apiRequest<{ items: AdminCosmeticRecord[] }>('/admin/cosmetics', { token })
}

export function createAdminCosmetic(
  token: string,
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
  return apiRequest<{ message: string; item: AdminCosmeticRecord }>('/admin/cosmetics', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateAdminCosmetic(
  token: string,
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
  return apiRequest<{ message: string; item: AdminCosmeticRecord }>(
    `/admin/cosmetics/${cosmeticId}`,
    {
      method: 'PATCH',
      token,
      body: payload,
    },
  )
}
