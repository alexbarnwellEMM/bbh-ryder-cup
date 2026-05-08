# BBH Ryder Cup

Live tournament tracker for the BBH Ryder Cup at Sweetens Cove. Single Railway service serving a React SPA + Express API with SQLite storage and Server-Sent Events for live updates.

## Stack
- Backend: Node 20, Express, better-sqlite3
- Frontend: Vite + React 18 + TailwindCSS + React Router
- Real-time: Server-Sent Events
- Hosting: Railway (Nixpacks build, persistent volume for SQLite)

## Local development

Two ways to run locally.

### One-process (production-style)
```
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..
PORT=3001 \
DB_PATH=$(pwd)/data/bbh.db \
TOURNAMENT_CODE=BBH2026 \
SCOREKEEPER_PIN=1234 \
SESSION_SECRET=dev-secret \
node server/index.js
```
Open http://localhost:3001

### Two-process (with Vite HMR)
Terminal 1 — API:
```
cd server && npm install
PORT=3001 DB_PATH=../data/bbh.db TOURNAMENT_CODE=BBH2026 SCOREKEEPER_PIN=1234 SESSION_SECRET=dev-secret npm run dev
```
Terminal 2 — Vite:
```
cd client && npm install && npm run dev
```
Open http://localhost:5173 — Vite proxies `/api` to :3001.

## Seeding
The DB seeds itself on first server start (idempotent — only runs if empty).
- Tournament: BBH Ryder Cup
- Teams: Team Al (Alex/Tyler/Tripp/Austin/Drew), Team Unc (Jake/George/Cam/John/Matt)
- 4 sessions / 12 matches: 1 best-ball + 1 scramble · 1 best-ball + 1 alt-shot + 1 singles · 2 alt-shot · 5 singles

To re-seed, delete `data/bbh.db` and restart.

## Roles
- **Public** — `/scoreboard`, `/join`, `/api/state`, `/api/sse`
- **Scorekeeper** — gated by `SCOREKEEPER_PIN`. PIN unlocks `/setup`, `/score`, `/tiebreaker`. Cookie expires after 12 hours.

## Pages
- `/join` — landing, optional code entry
- `/scoreboard` — live match cards, session-grouped, in-progress pulse
- `/setup` — assign players + starting holes per match
- `/score` — hole-by-hole entry, big +/- steppers, undo
- `/tiebreaker` — only when 6–6 after all 12 matches; pick 3 holes, stroke total
- `/final` — winner banner + full results + CSV export

## API
| Method | Path | Auth |
|---|---|---|
| GET | `/api/state` | public |
| GET | `/api/sse` | public |
| GET | `/api/export` | public |
| POST | `/api/auth/scorekeeper` | — (sets cookie on valid PIN) |
| POST | `/api/auth/join` | — (validates code) |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | — |
| POST | `/api/match/:id/setup` | PIN |
| POST | `/api/match/:id/start` | PIN |
| POST | `/api/match/:id/hole` | PIN |
| DELETE | `/api/match/:id/hole/:idx` | PIN |
| POST | `/api/tiebreaker/start` | PIN |
| POST | `/api/tiebreaker/score` | PIN |

## Deploy to Railway

1. Push this repo to GitHub.
2. Create a Railway project, deploy from the GitHub repo. Nixpacks will pick up `railway.json` and run `npm install` (which triggers `postinstall` to build the client and install server deps).
3. Add a **Volume** mounted at `/data`.
4. Set environment variables:
   - `DB_PATH=/data/bbh.db`
   - `TOURNAMENT_CODE=BBH2026` (or your choice)
   - `SCOREKEEPER_PIN=1234` (use something less guessable)
   - `SESSION_SECRET=<random string>`
   - `PORT` is set automatically by Railway.
5. Deploy. The server starts via `node server/index.js`.

## Files
```
bbh-ryder-cup/
├── client/                  Vite + React app
│   ├── src/
│   │   ├── pages/           Join, Scoreboard, Setup, Scorekeeper, Tiebreaker, Final, PinGate
│   │   ├── components/      MatchCard, TeamScore, HoleEntry
│   │   ├── hooks/useSSE.js  SSE client w/ exponential backoff
│   │   ├── lib/api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                  Express API
│   ├── index.js             entry — seeds, mounts API, serves client/dist
│   ├── db.js                better-sqlite3 init + WAL
│   ├── schema.sql
│   ├── seed.js              idempotent seed
│   ├── lib/
│   │   ├── auth.js          PIN cookie middleware
│   │   ├── broadcast.js     SSE client registry
│   │   ├── course.js        Sweetens Cove + holeOrderFromStart
│   │   ├── matchPlay.js     match play computation (status, closure, points)
│   │   └── state.js         getFullState + recomputeMatch + recomputeTiebreaker
│   └── routes/
│       ├── tournament.js    /state, /auth/*, /export
│       ├── matches.js       /match/:id/{setup,start,hole}, DELETE /hole/:idx
│       ├── tiebreaker.js    /tiebreaker/{start,score}
│       └── sse.js           /sse
├── railway.json
└── package.json
```
