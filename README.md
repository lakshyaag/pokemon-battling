# Pokemon Battle Simulator

A real-time Pokemon battle simulator built with WebSockets and the @pkmn/ps package ecosystem.

## Features

✅ **Milestone 1 Complete:**
- Random team generation (6 Pokemon per team)
- WebSocket-based multiplayer matchmaking
- Real-time player connection and queue system
- Modern React client interface
- Pokemon team display with sprites and move sets

🚧 **Coming Next:**
- Full battle simulation with turn-based combat
- Battle animations and effects
- Spectator mode
- Multiple battle formats
- Tournament system

## Tech Stack

- **Backend:** Node.js, Express, WebSocket (ws)
- **Frontend:** React, TypeScript, Vite
- **Pokemon Engine:** @pkmn/sim, @pkmn/randoms, @pkmn/protocol
- **Package Manager:** Bun (as requested)

## Quick Start

### Prerequisites

- Node.js 18+ 
- Bun package manager

### Installation

```bash
# Install all dependencies
bun run install:all

# Or install individually:
bun install
cd server && bun install
cd ../client && bun install
```

### Development

```bash
# Start both server and client in development mode
bun run dev

# Or start individually:
bun run server:dev  # Server on port 8080
bun run client:dev  # Client on port 3000
```

### Production

```bash
# Build the client
bun run build

# Start production server (serves both API and static files)
bun start
```

## User Journey (Milestone 1)

1. **Visit the app** - Open http://localhost:3000
2. **Generate Team** - Click "Generate Random Team" to create 6 random Pokemon
3. **Enter Name** - Type your player name
4. **Find Battle** - Click "Find Battle" to join matchmaking queue
5. **Get Matched** - Server automatically matches you with another player
6. **Battle Starts** - Both players are notified when battle begins

## Project Structure

```
pokemon-battling/
├── server/                 # Node.js WebSocket server
│   ├── src/
│   │   ├── services/       # Team generation & game management
│   │   ├── websocket/      # WebSocket handlers
│   │   └── index.ts        # Server entry point
│   └── package.json
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks (WebSocket)
│   │   └── App.tsx         # Main app component
│   └── package.json
├── shared/                 # Shared TypeScript types
│   └── types.ts
└── package.json           # Root package.json
```

## API Endpoints

### WebSocket (ws://localhost:8080/ws)

**Client → Server Messages:**
- `create_random_team` - Generate a new random team
- `join_queue` - Join matchmaking with player name and team
- `leave_queue` - Leave matchmaking queue
- `make_move` - Make a battle move (coming soon)

**Server → Client Messages:**
- `connection_established` - Connection successful with player ID
- `team_generated` - Random team created successfully
- `queue_joined` - Successfully joined matchmaking queue
- `game_found` - Matched with opponent, battle starting
- `error` - Error message

### HTTP REST API

- `GET /api/health` - Server health check + stats
- `GET /api/stats` - Current server statistics

## Pokemon Team Generation

Uses the official @pkmn/randoms package which provides:
- Authentic Pokemon Showdown random battle sets
- Proper stat calculations (EVs, IVs, natures)
- Legal movesets and items
- Balanced team compositions
- Support for multiple generations

## Development Notes

### Key Technologies Used

- **@pkmn/sim** - Core Pokemon battle simulator
- **@pkmn/randoms** - Official random team generator
- **@pkmn/protocol** - WebSocket protocol handling
- **@pkmn/dex** - Pokemon data and validation
- **@pkmn/sets** - Team import/export functionality

### Next Development Steps

1. **Battle System Implementation**
   - Integrate @pkmn/sim battle engine
   - Turn-based move selection
   - Battle state synchronization

2. **Enhanced UI**
   - Battle field visualization
   - Pokemon health/status display
   - Move selection interface

3. **Advanced Features**
   - Multiple battle formats (Singles, Doubles)
   - Replay system
   - ELO rating system

## Contributing

This is a demonstration project showcasing the @pkmn/ps ecosystem. Feel free to:
- Report issues
- Suggest features
- Submit pull requests
- Use as a learning resource

## License

MIT License - See LICENSE file for details

## Acknowledgments

- [Smogon Pokemon Showdown](https://pokemonshowdown.com/) - Original battle simulator
- [@pkmn organization](https://github.com/pkmn) - Modular packages
- Pokemon Company - Original game and assets
