## Pokémon Battling – Project Plan

This plan outlines how to build a local Pokémon battle engine and real-time multiplayer website using modular Pokémon Showdown libraries and Convex.

### References
- pkmn/ps (modular Pokémon Showdown packages): [pkmn/ps](https://github.com/pkmn/ps)
- Simulator package overview: [pkmn/ps – sim](https://github.com/pkmn/ps/tree/main/sim)
- Data APIs: [pkmn/ps – data](https://github.com/pkmn/ps/tree/main/data)
- Protocol parsing: [pkmn/ps – protocol](https://github.com/pkmn/ps/tree/main/protocol)
- Client battle state: [pkmn/ps – client](https://github.com/pkmn/ps/tree/main/client)
- View helpers for UI: [pkmn/ps – view](https://github.com/pkmn/ps/tree/main/view)
- Image helpers (sprites/icons): [pkmn/ps – img](https://github.com/pkmn/ps/tree/main/img)
- Random team generation: [pkmn/ps – randoms](https://github.com/pkmn/ps/tree/main/randoms)
- Official SIM protocol (server <-> client message format): [SIM-PROTOCOL.md](https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md)

### High-level Approach
- **Authoritative server simulation**: Run battles on the server using `@pkmn/sim` to prevent client-side tampering. The server produces canonical protocol lines (per SIM-PROTOCOL), which clients consume to render state.
- **Deterministic replay**: Persist the initial seed/teams and all player choices; reconstruct the battle by replaying choices whenever needed. This avoids keeping mutable process state across server invocations.
- **Realtime via Convex**: Use Convex database + reactive queries to push updates (protocol log lines and battle metadata) to clients. No custom WebSocket plumbing required.
- **UI from protocol**: On the client, consume protocol lines with `@pkmn/client` (and `@pkmn/view`) to derive renderable state and legal choices; display sprites via `@pkmn/img`.
- **Random teams**: Use `@pkmn/randoms` to generate format-appropriate teams (e.g., `gen9randombattle`).

### Tech Stack
- Frontend: React, TanStack Query, shadcn/ui (Tailwind), TypeScript, Vite.
- Backend: Convex (queries/mutations/actions), TypeScript.
- Packages (bun-managed): `@pkmn/sim`, `@pkmn/dex`, `@pkmn/data`, `@pkmn/protocol`, `@pkmn/client`, `@pkmn/view`, `@pkmn/img`, `@pkmn/randoms`, `convex`, `convex/react`.
- Package manager: bun (client and server).

### Key pkmn/ps Modules and Roles
- **`@pkmn/sim`**: Core battle engine. Authoritatively advances turns, resolves RNG with seeded PRNG, and emits protocol lines.
- **`@pkmn/randoms`**: Produces Random Battle teams for specified formats.
- **`@pkmn/dex` / `@pkmn/data`**: Species/moves/items/learnsets and higher-level wrappers.
- **`@pkmn/protocol`**: Types + helpers for `|`-delimited protocol lines defined in SIM-PROTOCOL.
- **`@pkmn/client`**: Turns protocol streams into client-side battle state (requests, choices, sides, field, etc.).
- **`@pkmn/view`**: View model helpers to translate client battle state into UI-friendly data and available actions.
- **`@pkmn/img`**: Generating sprite/icon URLs and asset handling.

### SIM-PROTOCOL Integration
- Server produces `|`-separated lines (e.g., `|turn|1`, `|move|`, `|switch|`, `|damage|`, `|win|…`) per [SIM-PROTOCOL.md](https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md).
- Clients feed lines to `@pkmn/client` to update battle state. UI reads the resulting request to present legal moves/switches and the board state.

### System Architecture
- **Convex DB**: Stores users, matchmaking queue, battles, and protocol logs.
- **Server functions** (Convex mutations/actions):
  - Create battles, generate random teams, seed PRNG.
  - Accept player choices; when both sides have chosen for a turn, replay the battle from the start (seed + teams + prior choices) using `@pkmn/sim`, compute the new output lines, and append the delta to persistent logs.
  - Matchmaking: pair waiting players and start battles.
- **Client**:
  - Subscribe to battle logs via reactive queries.
  - Maintain `@pkmn/client` battle instance (pure client state) advanced by received logs.
  - Render with shadcn/ui and Tailwind. Show move/switch menus reflecting legal choices.
  - Post choices via Convex mutations.

### Data Model (Convex Schema)
- `users`: `{ _id, name, createdAt }`
- `queue`: `{ _id, userId, format, joinedAt }`
- `battles`: {
  - `_id`, `format`, `seed` (e.g., `[number, number, number, number]`),
  - `players`: `{ p1UserId, p2UserId }`,
  - `teams`: `{ p1PackedTeam, p2PackedTeam }` (PackedTeam strings),
  - `status`: `'waiting' | 'active' | 'complete'`,
  - `winner`: `'p1' | 'p2' | null`,
  - `turn`: number,
  - `choices`: Array<{ turn: number, side: 'p1'|'p2', choice: string }>,
  - `log`: string[] (protocol lines concatenated over time),
  - `createdAt`, `updatedAt`
}

Notes:
- All randomness derives from `seed` and the ordered choices. Replaying yields identical logs.
- We may later shard logs into `battle_logs` for pagination; initially keep on `battles`.

### Core Server Operations
- `queue.join(format)`: Enqueue player; returns when matched (or returns battle ID to poll/react to).
- `queue.leave()`: Remove from queue.
- `battle.create({p1UserId, p2UserId, format})`: Seeds PRNG; generates both random teams with `@pkmn/randoms`; creates `battles` doc; runs initial sim setup to produce initial logs.
- `battle.submitChoice({battleId, side, choice})`: Stores choice; if both sides ready for the current turn, re-simulate and append new lines. Returns ack and current turn.
- `battle.forfeit({battleId})`: Mark winner; append protocol lines; finalize battle.
- `battle.get({battleId})`: Reactive query returning battle metadata + logs.

### Battle Replay Algorithm (Server)
1. Load battle doc: seed, teams, choices, current log length.
2. Instantiate simulator with `@pkmn/sim` using format + seed.
3. Set players and `PackedTeam`s.
4. Feed sequential choices per `choices` array, respecting turn/side order.
5. Collect all emitted protocol lines; diff from stored `log`; append new lines; update `turn` and possibly `winner`.
6. Save updated doc; Convex notifies clients via reactive query.

### Frontend UI
- **Layout**: Pokémon battle field, opponent (top-right), self (bottom-left). Panels for HP/status, moves/switches, and battle log.
- **State derivation**: `@pkmn/client` reads incoming protocol lines → `@pkmn/view` computes view state and available actions.
- **Actions**: Choose move or switch; submit via mutation; disable inputs until next request.
- **Random team**: Button to generate and show your team before queueing.

### Pages & Components
- `Home` (generate random team, queue controls).
- `Battle` (battlefield, action panel, log).
- Components: `BattleField`, `SidePanel`, `ActionBar` (moves/switches), `TeamPreview`, `QueueDialog`, `BattleLog`.

### Real-time Strategy
- Clients subscribe to `battle.get(battleId)` (reactive query). Whenever `log` or metadata changes, UI updates.
- Clients do not simulate; they only parse logs locally to render state.

### Security & Fair Play
- Validate that only the respective user can submit for `p1`/`p2`.
- Server is authoritative; client inputs are high-level choices only.
- Seed and full log allow auditing and replay.

### Error Handling & Edge Cases (MVP scope)
- Connectivity loss: client can resubscribe and reconstruct from logs.
- Timeouts: optional auto-move on server after grace period (future).
- Forfeits supported in MVP.
- Start with `gen9randombattle`. Expand formats later.

### Project Structure (Monorepo)
- `/convex/` – Convex schema and functions (`schema.ts`, `queue.ts`, `battles.ts`, `teams.ts`).
- `/src/` – React app (Vite), shadcn/ui components, pages.
- `/public/` – Static assets (optional image hosting; `@pkmn/img` can target remote by default).
- Root configs: `package.json` (bun), `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`.

### Milestones
1) Scaffold app
   - Init Vite React + TypeScript with bun.
   - Add Tailwind + shadcn/ui baseline.
   - Add Convex; create `schema.ts` and types; wire `convex/react` provider.
   - Install pkmn packages.

2) Matchmaking MVP
   - Implement `queue.join/leave` and pairing → create battle.
   - Use `@pkmn/randoms` for both teams; seed PRNG and emit initial logs.

3) Battle Loop
   - Implement `battle.submitChoice` and deterministic replay + log append.
   - Client Battle page consuming reactive `battle.get`.
   - Render field, sides, moves/switches via `@pkmn/client` + `@pkmn/view`.

4) UX Polish
   - Sprites/icons via `@pkmn/img`.
   - Loading/empty/error states; basic responsive layout.
   - Forfeit, rematch, copy/share replay (logs).

5) Hardening
   - Input validation, side authorization, simple rate limiting.
   - Basic unit tests for replay determinism and choice pipeline.

### Acceptance Criteria (MVP)
- Two browsers can each generate a random team, queue, get matched, and complete a `gen9randombattle` in real time.
- Server stores seed, packed teams, ordered choices, and protocol log; client rebuilds on refresh without drift.
- UI shows board, HP/status, and legal move/switch choices; actions are enforced server-side.

### Next Step
- Initialize the repository with bun + Vite + Convex, add schema and placeholder functions, wire providers, and commit the plan.


