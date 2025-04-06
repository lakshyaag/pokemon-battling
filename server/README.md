# Pokemon Battle Server

A WebSocket server for handling Pokemon battles using the @pkmn/sim engine.

## Project Structure

- `src/` - Source code
  - `server.ts` - Main server setup and HTTP routes
  - `index.ts` - Entry point
  - `handlers/` - Logic handlers
    - `battle-manager.ts` - Battle state management
    - `client-manager.ts` - Client state management
  - `db/` - Database operations
    - `battle-db.ts` - Battle database operations
  - `socket/` - Socket.IO handlers
    - `handlers.ts` - Socket event handlers
  - `types/` - Type definitions
- `services/` - Battle engine logic (unchanged)
- `lib/` - Shared libraries

## Setup

1. Install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```
