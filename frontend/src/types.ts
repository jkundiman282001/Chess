export type Profile = {
  bio: string | null
  country_code: string | null
  avatar_path: string | null
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
  players: {
    white: { id: number; username: string; name: string } | null
    black: { id: number; username: string; name: string } | null
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
