# Pokemon Battle Application Architecture

## Overview
A multiplayer Pokemon battling application using WebSockets for real-time battles, built on top of the pkmn/ps packages.

## System Architecture

### Server Components

#### 1. Battle Manager (`src/battle/BattleManager.ts`)
- Manages all active battles using `@pkmn/sim`
- Creates and destroys battle instances
- Routes messages between players
- Handles battle streams and protocol messages

```typescript
interface BattleRoom {
  id: string;
  battle: Battle;
  streams: BattleStreams;
  players: Map<string, PlayerInfo>;
  spectators: Set<string>;
  format: string;
  createdAt: Date;
}
```

#### 2. WebSocket Server (`src/websocket/WebSocketServer.ts`)
- Manages WebSocket connections
- Routes messages to appropriate handlers
- Handles connection/disconnection events
- Implements reconnection logic

Message Types:
- `create-battle`: Create a new battle room
- `join-battle`: Join an existing battle
- `battle-action`: Send battle commands (move, switch, etc.)
- `spectate`: Join as spectator
- `chat`: In-battle chat messages

#### 3. Room Manager (`src/rooms/RoomManager.ts`)
- Generates unique room IDs
- Creates shareable invite links
- Manages room lifecycle
- Handles player matchmaking

#### 4. Battle Service (`src/battle/BattleService.ts`)
- Validates teams using `TeamValidator`
- Supports multiple formats (singles, doubles, randoms)
- Handles battle initialization
- Processes battle actions

### Client Components

#### 1. Battle UI (`client/src/components/BattleUI.tsx`)
- Pokemon display with sprites from `@pkmn/img`
- HP bars and status indicators
- Move selection interface
- Switch Pokemon interface
- Battle log display

#### 2. Battle Client (`client/src/battle/BattleClient.ts`)
- Uses `@pkmn/client` for state management
- Parses protocol messages with `@pkmn/protocol`
- Sends player actions to server
- Handles battle animations

#### 3. Team Builder (`client/src/components/TeamBuilder.tsx`)
- Import/export teams using `@pkmn/sets`
- Team validation
- Pokemon/move/item selection
- Support for random teams

#### 4. Lobby System (`client/src/components/Lobby.tsx`)
- Create battles with format selection
- Join via invite link
- Active battles list
- Spectator mode

## Data Flow

### Battle Creation Flow
1. Player creates battle → Server generates room ID
2. Server initializes `BattleStreams` and `Battle` instance
3. Server returns invite link to player
4. Other player joins via link
5. Both players submit teams
6. Server validates teams and starts battle

### Battle Action Flow
1. Player selects action (move/switch)
2. Client sends action via WebSocket
3. Server writes to battle stream
4. Battle simulator processes action
5. Server broadcasts protocol messages to all clients
6. Clients update UI based on protocol messages

### Protocol Message Flow
```
Player Action → WebSocket → Server → BattleStream → Simulator
                                          ↓
Client UI ← WebSocket ← Server ← Protocol Messages
```

## Security Considerations

1. **Input Validation**
   - Validate all battle actions
   - Sanitize team data
   - Rate limiting on actions

2. **Authentication**
   - Generate secure room tokens
   - Validate player identity
   - Prevent action spoofing

3. **Data Protection**
   - Don't expose full battle state
   - Hide opponent's unrevealed Pokemon
   - Secure spectator mode

## Scalability

1. **Horizontal Scaling**
   - Use Redis for room state
   - Sticky sessions for WebSocket
   - Load balancer with WebSocket support

2. **Performance Optimization**
   - Battle instance pooling
   - Efficient protocol message parsing
   - Client-side prediction

## Technology Stack

### Server
- Bun runtime + TypeScript
- Express.js (HTTP endpoints)
- ws (WebSocket library)
- @pkmn/sim (Battle simulation)
- @pkmn/randoms (Random teams)
- @pkmn/protocol (Protocol parsing)

### Client
- React + TypeScript
- Vite (Build tool with Bun)
- @pkmn/client (Battle state)
- @pkmn/protocol (Protocol parsing)
- @pkmn/img (Pokemon sprites)
- @pkmn/sets (Team management)

## API Endpoints

### HTTP Endpoints
- `POST /api/battles` - Create new battle
- `GET /api/battles/:id` - Get battle info
- `GET /api/formats` - List available formats
- `POST /api/teams/validate` - Validate team

### WebSocket Events
- `create-battle` - Create new battle room
- `join-battle` - Join existing battle
- `submit-team` - Submit team for battle
- `battle-action` - Send battle action
- `forfeit` - Forfeit current battle
- `chat` - Send chat message

## Development Phases

### Phase 1: Core Server
- Battle simulation setup
- WebSocket server
- Basic room management
- Protocol message handling

### Phase 2: Client Foundation
- Battle UI components
- WebSocket client
- Basic battle interactions
- Team submission

### Phase 3: Enhanced Features
- Team builder
- Multiple formats
- Spectator mode
- Battle replays

### Phase 4: Polish
- Animations
- Sound effects
- Mobile responsive
- Performance optimization