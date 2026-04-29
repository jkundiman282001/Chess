export type MoveIndicatorTheme = {
  move_dot_color: string
  capture_ring_color: string
  selected_outline_color: string
  last_move_overlay_color: string
}

export type BoardTheme = {
  light: string
  dark: string
  pattern: 'solid' | 'wood' | 'marble' | 'obsidian' | 'parchment' | 'neon'
  frame_style: 'none' | 'tournament' | 'gold' | 'iron' | 'royal'
  coordinate_style: 'classic' | 'mono' | 'minimal' | 'hidden'
  effect: 'none' | 'fire'
  indicators: MoveIndicatorTheme
}

export type BoardThemePreset = {
  name: string
  light: string
  dark: string
  pattern: BoardTheme['pattern']
  frame_style: BoardTheme['frame_style']
  coordinate_style: BoardTheme['coordinate_style']
  effect: BoardTheme['effect']
  indicators: MoveIndicatorTheme
}

export type Profile = {
  bio: string | null
  country_code: string | null
  avatar_path: string | null
  board_theme: BoardTheme
  board_theme_presets: BoardThemePreset[]
  daily_missions: Array<{
    key: string
    title: string
    description: string
    date: string
    target: number
    progress: number
    completed: boolean
    reward: {
      coins: number
      experience: number
    }
    rewarded_at: string | null
  }>
  achievements: Array<{
    key: string
    title: string
    description: string
    target: number
    progress: number
    unlocked: boolean
    reward: {
      coins: number
      experience: number
    }
    unlocked_at: string | null
    rewarded_at: string | null
  }>
  equipped_board: {
    slug: string
    name: string
    preview: Record<string, string> | null
    assets: Record<string, string> | null
  } | null
  equipped_piece_set: {
    slug: string
    name: string
    preview: Record<string, string> | null
    assets: Record<string, string> | null
  } | null
  default_piece_sets: {
    black: {
      slug: string
      name: string
      category: 'bundle'
      rarity: string
      description: string | null
      preview: Record<string, string> | null
      assets: Record<string, string> | null
    } | null
    white: {
      slug: string
      name: string
      category: 'bundle'
      rarity: string
      description: string | null
      preview: Record<string, string> | null
      assets: Record<string, string> | null
    } | null
  }
  ranked_rating: number
  highest_ranked_rating: number
  experience: number
  level: number
  soft_currency: number
}

export type User = {
  id: number
  username: string
  name: string
  email: string
  is_admin: boolean
  is_active: boolean
  email_verified_at: string | null
  profile: Profile
}

export type AuthResponse = {
  token: string
  user: User
}

export type GameSummary = {
  id: string
  created_by_user_id: number
  mode: 'casual' | 'ranked' | 'ai'
  status: 'waiting' | 'active' | 'finished' | 'aborted'
  result: 'in_progress' | 'white_win' | 'black_win' | 'draw' | 'aborted'
  termination_reason: string | null
  rated: boolean
  time_control_name: string
  initial_time_seconds: number
  increment_seconds: number
  starting_fen: string
  current_fen: string
  state_version: number
  ai_opponent_name: string | null
  ai_skill_level: number | null
  reward_summary: {
    coins: number
    experience: number
    granted_at: string | null
  } | null
  hidden: boolean
  players: {
    white: {
      id: number
      username: string
      name: string
      equipped_piece_set: {
        slug: string
        name: string
        preview: Record<string, string> | null
        assets: Record<string, string> | null
      } | null
    } | null
    black: {
      id: number
      username: string
      name: string
      equipped_piece_set: {
        slug: string
        name: string
        preview: Record<string, string> | null
        assets: Record<string, string> | null
      } | null
    } | null
    winner: { id: number; username: string; name: string } | null
  }
  started_at: string | null
  last_move_at: string | null
  ended_at: string | null
  moves: Array<{
    ply: number
    move_number: number
    san: string
    uci: string
    fen_after: string
    move_time_ms: number | null
    created_at: string | null
    player: { id: number; username: string; name: string } | null
  }> | null
}

export type GameListResponse = {
  data: GameSummary[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export type CosmeticItem = {
  slug: string
  name: string
  category: 'board' | 'piece_set' | 'bundle'
  rarity: string
  description: string | null
  price_soft_currency: number
  preview: Record<string, string> | null
  assets: Record<string, string> | null
  owned: boolean
  equipped: boolean
}

export type ShopState = {
  balance: number
  equipped: {
    board: {
      slug: string
      name: string
      category: 'board' | 'bundle'
      rarity: string
      description: string | null
      preview: Record<string, string> | null
      assets: Record<string, string> | null
    } | null
    piece_set: {
      slug: string
      name: string
      category: 'piece_set' | 'bundle'
      rarity: string
      description: string | null
      preview: Record<string, string> | null
      assets: Record<string, string> | null
    } | null
  }
  items: CosmeticItem[]
}

export type AdminUserRecord = {
  id: number
  username: string
  name: string
  email: string
  is_admin: boolean
  is_active: boolean
  soft_currency: number
  created_at: string | null
}

export type AdminCosmeticRecord = {
  id: number
  slug: string
  name: string
  category: 'board' | 'piece_set' | 'bundle'
  rarity: string
  description: string | null
  price_soft_currency: number
  sort_order: number
  is_active: boolean
  preview: Record<string, string> | null
  assets: Record<string, string> | null
}
