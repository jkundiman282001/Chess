# Chess Project AI Handoff

This document is a compact knowledge base for another AI or developer continuing this project. It describes the current architecture, implemented features, important files, setup steps, and known constraints.

## Project Summary

This is a web-based chess game built as a monorepo:

- `backend/`: Laravel API
- `frontend/`: React + TypeScript SPA
- Database: MySQL or MariaDB
- Auth: Laravel Sanctum token auth
- Chess validation:
  - frontend uses `chess.js` for UI move generation and board behavior
  - backend uses `p-chess/chess` for server-side AI game validation
- AI:
  - backend can use local Stockfish through a UCI wrapper
  - if Stockfish fails or is missing, backend falls back to a bounded custom AI search

The product is currently AI-first. Multiplayer, ranked PvP, friend lists, and live WebSocket gameplay are planned but not implemented yet.

## Current Feature Set

Implemented:

- User registration, login, logout, and session restore
- User profile editing
- AI chess games with persisted moves and server-side validation
- Resign flow
- AI thinking modal on the frontend
- Stockfish integration with fallback AI
- Match history with hide/unhide
- Store with cosmetic bundles
- Admin panel for account management and cosmetic management
- Cosmetic bundle uploads for chess piece images
- Equipped player cosmetics in the game room
- AI cosmetic selection that avoids the same equipped bundle as the player
- Default uploaded piece bundles:
  - `classic`: Classic Black
  - `classic2`: Classic White
- Board color customization
- Saved board theme presets
- Safe board theme options:
  - patterns
  - frames
  - coordinate styles
  - move indicator colors
  - fire board effect
- Post-game AI rewards: coins and XP
- XP level progression bar
- Daily missions
- Achievements
- Organized store catalog with filters, search, sorting, featured bundle, and bundle detail modal
- Admin-uploaded store card preview banner images with color fallback

Not implemented yet:

- Friend list
- Friend requests
- Casual multiplayer
- WebSocket game sync
- Ranked matchmaking
- Ranked ratings updates
- Public leaderboards
- Economy transaction ledger
- Admin audit log
- Match replay/review mode

## Local Setup

Backend:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default frontend API env:

```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

If Laravel starts on `8001` because `8000` is in use, update `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8001/api/v1
```

Seeded admin account:

```text
email: test@example.com
password: password
```

## Stockfish Setup

Stockfish is optional because the backend has a fallback AI. For stronger AI, install Stockfish and configure the binary path.

Example Ubuntu setup:

```bash
sudo apt-get update
sudo apt-get install -y stockfish
```

Backend `.env`:

```env
STOCKFISH_BINARY=/usr/games/stockfish
STOCKFISH_THREADS=1
STOCKFISH_HASH=64
STOCKFISH_TIMEOUT_SECONDS=8
```

Then clear config:

```bash
cd backend
php artisan config:clear
```

Stockfish config lives in:

- `backend/config/ai.php`
- `backend/app/Services/StockfishService.php`

AI fallback logic lives in:

- `backend/app/Services/AiGameService.php`

## Backend Architecture

Important backend directories:

- `backend/routes/api.php`: all API routes
- `backend/app/Http/Controllers/Api/V1`: API controllers
- `backend/app/Http/Requests`: request validation
- `backend/app/Models`: Eloquent models
- `backend/app/Services`: main business logic
- `backend/app/Enums`: game status/mode/result enums
- `backend/database/migrations`: schema history
- `backend/database/seeders`: seed data

Important services:

- `AiGameService`: AI game lifecycle, move validation, AI turn generation, resign finalization
- `StockfishService`: local UCI Stockfish process wrapper
- `ShopService`: catalog formatting, starter cosmetics, purchase/equip/unequip
- `GameRewardService`: post-game AI rewards and level updates
- `ProgressionService`: daily missions and achievements

Keep business rules in services where possible. Controllers should validate requests, call services, and return formatted responses.

## API Surface

Public:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Authenticated:

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/profile`
- `PATCH /api/v1/profile`
- `GET /api/v1/shop`
- `POST /api/v1/shop/purchase`
- `POST /api/v1/shop/equip`
- `POST /api/v1/shop/unequip`
- `GET /api/v1/games`
- `POST /api/v1/games`
- `GET /api/v1/games/{public_id}`
- `POST /api/v1/games/{public_id}/moves`
- `POST /api/v1/games/{public_id}/resign`
- `POST /api/v1/games/{public_id}/hide`
- `POST /api/v1/games/{public_id}/unhide`

Admin only:

- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{user}`
- `GET /api/v1/admin/cosmetics`
- `POST /api/v1/admin/cosmetics`
- `PATCH /api/v1/admin/cosmetics/{cosmetic}`

Admin access is guarded by:

- `backend/app/Http/Middleware/EnsureAdmin.php`

## Core Data Model

### Users

`users` has standard Laravel account fields plus:

- `username`
- `is_admin`
- `is_active`

Model:

- `backend/app/Models/User.php`

### Profiles

`profiles` stores gameplay, economy, and customization state:

- `bio`
- `country_code`
- `avatar_path`
- `ranked_rating`
- `highest_ranked_rating`
- `experience`
- `level`
- `soft_currency`
- `equipped_board_cosmetic_id`
- `equipped_piece_cosmetic_id`
- `board_light_color`
- `board_dark_color`
- `board_pattern`
- `board_frame_style`
- `board_coordinate_style`
- `board_effect`
- `move_indicator_theme`
- `board_theme_presets`
- `daily_missions`
- `achievements`

Model:

- `backend/app/Models/Profile.php`

Frontend profile type:

- `frontend/src/types.ts`

### Games

`games` stores server-owned game state:

- `public_id`
- player IDs
- `mode`: `casual`, `ranked`, `ai`
- `status`: `waiting`, `active`, `finished`, `aborted`
- `result`
- `termination_reason`
- FEN state
- AI metadata
- reward fields
- timestamps

Model:

- `backend/app/Models/Game.php`

Moves are stored in:

- `backend/app/Models/GameMove.php`

### Cosmetics

`cosmetic_items` supports:

- `slug`
- `name`
- `category`: `board`, `piece_set`, `bundle`
- `rarity`: `common`, `rare`, `epic`, `legendary`
- `description`
- `price_soft_currency`
- `sort_order`
- `is_active`
- `preview`
- `assets`

Important current behavior:

- Store is effectively bundle-focused.
- Piece uploads are stored in `assets` as data URLs.
- Valid piece asset keys are:
  - `pawn`
  - `rook`
  - `knight`
  - `bishop`
  - `queen`
  - `king`
- Uploaded board-image cosmetics were intentionally removed from gameplay because they caused alignment issues.
- Store card preview banners prefer `preview.banner` as an uploaded image data URL.
- `preview.primary` and `preview.secondary` remain as fallback colors for cosmetics without a banner image.

Models:

- `backend/app/Models/CosmeticItem.php`
- `backend/app/Models/UserCosmetic.php`

## Frontend Architecture

Important frontend files:

- `frontend/src/App.tsx`: app-level state, auth bootstrap, API orchestration, handlers
- `frontend/src/api.ts`: API client and typed request helpers
- `frontend/src/types.ts`: shared frontend response types
- `frontend/src/components/DashboardPage.tsx`: dashboard, profile, store, admin UI
- `frontend/src/components/DashboardPage.css`: dashboard/store/admin/profile styling
- `frontend/src/components/GameRoom.tsx`: AI game board and gameplay UI
- `frontend/src/components/GameRoom.css`: game room board styling, move indicators, effects

Frontend state is centralized mostly in `App.tsx`. The dashboard receives state and handlers as props.

## Game Room Rules

The AI game room:

- renders board state from persisted FEN
- lets the player click a piece and then click a legal destination
- shows normal move indicators and red capture indicators
- submits moves to the backend
- shows AI thinking state before revealing AI response
- supports resign
- shows reward chips after finished games
- applies board theme colors/patterns/frames/effects from `currentUser.profile.board_theme`
- applies the player's equipped bundle only to the player's side
- lets the AI use a random available piece bundle that is not the player's currently equipped bundle

The game room should not become the source of truth for game results, rewards, or legality. Backend remains authoritative.

## Board Customization

Current board theme response shape:

```json
{
  "light": "#f0d9b5",
  "dark": "#b58863",
  "pattern": "solid",
  "frame_style": "tournament",
  "coordinate_style": "classic",
  "effect": "none",
  "indicators": {
    "move_dot_color": "#ffffff",
    "capture_ring_color": "#de4e4e",
    "selected_outline_color": "#c9a84c",
    "last_move_overlay_color": "rgba(201,168,76,0.18)"
  }
}
```

Allowed values:

- `board_pattern`: `solid`, `wood`, `marble`, `obsidian`, `parchment`, `neon`
- `board_frame_style`: `none`, `tournament`, `gold`, `iron`, `royal`
- `board_coordinate_style`: `classic`, `mono`, `minimal`, `hidden`
- `board_effect`: `none`, `fire`

The profile form updates the live board theme in app state immediately. `Save profile` persists it to Laravel.

## Rewards, XP, Missions, Achievements

AI rewards are granted once when an AI game finishes.

Reward logic:

- `backend/app/Services/GameRewardService.php`

Progression logic:

- `backend/app/Services/ProgressionService.php`

Current reward rules:

- win: coins and XP scale with AI skill and move count
- draw: smaller reward
- normal loss: small reward
- resignation loss: `0` coins and `5` XP

Level curve:

- level 1 to 2 requires 100 XP
- each next level requires `level * 100 XP`

Daily missions:

- finish 1 AI match today
- win 1 AI match today
- finish 2 AI matches today

Achievements:

- first AI win
- 5 AI wins
- 10 AI games finished
- beat AI skill 10+

## Admin Panel

Admin features:

- list users
- edit coin balance
- toggle admin
- toggle active/inactive
- list cosmetics
- create cosmetics
- edit cosmetics
- upload piece assets into bundles
- upload store card preview banner images
- collapse/expand catalog rows

Admin UI lives mostly in:

- `frontend/src/components/DashboardPage.tsx`

Admin backend controller:

- `backend/app/Http/Controllers/Api/V1/AdminController.php`

Important admin security principle:

- Admin economic actions currently mutate user currency directly. Add an audit log before expanding admin powers further.

## Known Constraints And Pitfalls

Run migrations after backend schema work. Many user-facing errors that look like CORS or frontend hangs are actually missing columns/tables.

Common missing migration symptoms:

- `Table 'chess.cosmetic_items' doesn't exist`
- `Table 'chess.user_hidden_games' doesn't exist`
- `Unknown column 'daily_missions' in 'SET'`
- `Unknown column 'board_effect'`

Piece images are currently stored as base64 data URLs in the database. This is acceptable for MVP, but not ideal long term. Production should move image uploads to file storage and store URLs/paths.

Uploaded full-board images were tried and removed from gameplay because they caused piece alignment issues. Prefer CSS-based board themes, patterns, frames, and effects.

Stockfish can fail depending on binary path and permissions. The backend should fall back instead of crashing. If AI hangs, inspect:

- `backend/storage/logs/laravel.log`
- `backend/app/Services/StockfishService.php`
- `backend/app/Services/AiGameService.php`

The app is not yet WebSocket-enabled. Avoid building ranked mode until casual multiplayer, reconnect handling, clocks, and server-authoritative move sync are stable.

## Verification Commands

Backend formatting:

```bash
cd backend
vendor/bin/pint --test
```

Backend syntax for a file:

```bash
php -l app/Services/AiGameService.php
```

Frontend build:

```bash
cd frontend
npm run build
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Route list:

```bash
cd backend
php artisan route:list
```

## Recommended Next Features

Best next work, in order:

1. Post-game result screen with reward, mission, and achievement feedback
2. Match replay/review mode using stored move FENs
3. Economy transaction ledger
4. Admin audit log
5. Friend list and friend requests
6. Casual multiplayer game flow
7. WebSocket broadcasting and reconnect handling
8. Ranked mode after casual multiplayer is reliable

## Multiplayer Guidance

When building casual multiplayer:

- Do not reuse AI request/response assumptions.
- Keep server authoritative for legal moves and game results.
- Add separate invite/friend systems instead of overloading AI game creation.
- Implement casual first, then ranked.
- Add WebSocket broadcasting only after the server-side move endpoint is correct.

Likely backend additions:

- `friendships` or `friend_requests` table
- `game_invitations` table
- `FriendController`
- `GameInvitationController`
- broadcast events for invites, moves, resign, game end

Likely frontend additions:

- friends tab
- incoming/outgoing requests
- challenge friend flow
- casual game room state shared between both players

## Senior Engineering Rules For This Project

- Server validates online chess moves and results.
- Client never decides rewards, purchases, rating, or final result.
- Cosmetics remain visual-only.
- AI mode stays separate from ranked multiplayer.
- Ranked mode should not be added until casual multiplayer is stable.
- Economy mutations should eventually be logged in a transaction ledger.
- Admin mutations should eventually be logged in an audit table.
- Do not reintroduce arbitrary uploaded board images into the game board; use CSS-safe customization instead.
