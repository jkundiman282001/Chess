# Chess Project Workspace

Monorepo layout for the web-based chess platform:

- `backend/`: Laravel API
- `frontend/`: React + TypeScript SPA

For a full project handoff written for future AI assistants or developers, read:

- [`AI_HANDOFF.md`](AI_HANDOFF.md)

For a record of project changes and the documentation rule for future modifications, read:

- [`CHANGELOG.md`](CHANGELOG.md)

## Backend

Laravel is configured to use MySQL/MariaDB by default.

1. Copy backend environment defaults if needed:
   - `cp backend/.env.example backend/.env`
2. Update database credentials in `backend/.env`
3. Start the API:
   - `cd backend`
   - `php artisan serve`

Health endpoint:

- `GET http://localhost:8000/api/v1/health`

Current API foundation:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/profile`
- `PATCH /api/v1/profile`
- `GET /api/v1/games`
- `POST /api/v1/games`
- `GET /api/v1/games/{public_id}`

## Frontend

1. Copy frontend environment defaults if needed:
   - `cp frontend/.env.example frontend/.env`
2. Install dependencies:
   - `cd frontend`
   - `npm install`
3. Start the app:
   - `npm run dev`

Default frontend API target:

- `VITE_API_URL=http://localhost:8000/api/v1`

## Recommended next step

Build the backend as an API-first application before adding game features:

- Sanctum authentication
- user/profile schema
- game and move domain models
- websocket transport for multiplayer
