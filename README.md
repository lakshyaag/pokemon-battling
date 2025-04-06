# Pokemon Battling

A real-time Pokemon battle simulator built with Next.js and WebSocket technology. This project implements the Pokemon Showdown battle mechanics using the official `@pkmn/ps` libraries, allowing players to engage in turn-based Pokemon battles with accurate game mechanics, stats, and move calculations.

## Features

- **Real-time Battles**: Utilizes WebSocket connections for instant battle updates and player interactions
- **Pokemon Showdown Integration**: Leverages [`@pkmn/ps`](https://github.com/pkmn/ps) libraries for accurate battle mechanics:
- **Battle State Management**: Client-side battle state synchronization with server
- **Reconnection Handling**: Graceful handling of disconnections with battle state preservation

## Technical Architecture

### Frontend (Next.js)
- Real-time battle visualization and player interactions
- State management using Zustand
- Type-safe socket events with TypeScript
- Client-side battle state synchronization

### Backend (Node.js)
- WebSocket server handling battle rooms and player connections using [socket.io](https://socket.io/)
- Battle engine implementation using Pokemon Showdown libraries
- Player decision processing and state management
- Battle protocol event handling and distribution

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Start the development server:

```bash
bun dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to start battling!

## Battle Mechanics

The battle system implements the core Pokemon battle mechanics including:
- Turn-based combat with move selection
- Pokemon switching
- Accurate damage calculations
- Status effects and weather conditions
- Type effectiveness and abilities
- Random team generation for quick battles

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
