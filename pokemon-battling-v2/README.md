# Pokemon Battle Multiplayer Application

A real-time multiplayer Pokemon battling application built with TypeScript, React, and WebSockets, powered by the [pkmn/ps](https://github.com/pkmn/ps) packages.

## Features

- **Real-time Battles**: Challenge friends to Pokemon battles via shareable invite links
- **Multiple Formats**: Support for various battle formats (Singles, Doubles, Random Battles, etc.)
- **Team Builder**: Import and export teams using Pokemon Showdown format
- **Live Updates**: Real-time battle updates via WebSockets
- **Battle Animations**: Smooth animations and Pokemon sprites
- **Spectator Mode**: Watch ongoing battles (planned)

## Architecture

The application consists of:

- **Server**: Node.js/Express backend with WebSocket support
- **Client**: React frontend with TypeScript
- **Battle Engine**: Pokemon Showdown's battle simulator via @pkmn/sim

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Tech Stack

### Server
- Node.js + TypeScript
- Express.js
- WebSocket (ws)
- @pkmn/sim (Battle simulation)
- @pkmn/randoms (Random team generation)
- @pkmn/protocol (Protocol parsing)

### Client
- React + TypeScript
- Vite
- @pkmn/client (Battle state management)
- @pkmn/protocol (Protocol parsing)
- @pkmn/img (Pokemon sprites)
- @pkmn/sets (Team management)
- Zustand (State management)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pokemon-battling-v2
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

### Running the Application

1. Start the server (in one terminal):
```bash
cd server
npm run dev
```

2. Start the client (in another terminal):
```bash
cd client
npm run dev
```

3. Open http://localhost:3000 in your browser

## How to Play

1. **Create a Battle**
   - Click "Create Battle"
   - Choose a battle format
   - Share the invite link with your friend

2. **Join a Battle**
   - Click the invite link
   - Enter your name
   - Submit your team

3. **Battle**
   - Select moves or switch Pokemon
   - Watch the battle unfold in real-time
   - Chat with your opponent

## Development Guide

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed development instructions.

### Project Structure

```
pokemon-battling-v2/
├── server/                 # Backend server
│   ├── src/
│   │   ├── battle/        # Battle management
│   │   ├── websocket/     # WebSocket handlers
│   │   └── types/         # TypeScript types
│   └── package.json
├── client/                # Frontend client
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── battle/        # Battle logic
│   │   └── store/         # State management
│   └── package.json
├── ARCHITECTURE.md        # System design document
├── IMPLEMENTATION_GUIDE.md # Developer guide
└── README.md             # This file
```

### Available Scripts

#### Server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

#### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## API Reference

### WebSocket Events

**Client → Server:**
- `create-battle` - Create a new battle room
- `join-battle` - Join an existing battle
- `submit-team` - Submit team for battle
- `battle-action` - Send battle action (move/switch)
- `chat` - Send chat message

**Server → Client:**
- `battle-created` - Battle room created successfully
- `battle-joined` - Successfully joined battle
- `battle-update` - Battle state update (protocol messages)
- `battle-ready` - Both players ready
- `battle-started` - Battle has begun

### HTTP Endpoints

- `GET /api/formats` - List available battle formats
- `GET /api/battles/invite/:code` - Get battle info by invite code
- `POST /api/teams/validate` - Validate a team

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Pokemon Showdown](https://pokemonshowdown.com/) for the battle engine
- [pkmn/ps](https://github.com/pkmn/ps) for the modularized packages
- [Smogon](https://www.smogon.com/) for Pokemon competitive data

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

Pokemon and all related properties are trademarks and copyright of Nintendo, Game Freak, and The Pokemon Company. This project is not affiliated with or endorsed by any of these companies.