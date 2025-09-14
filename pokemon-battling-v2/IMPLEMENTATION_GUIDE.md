# Pokemon Battle Application Implementation Guide

## Quick Start

### Prerequisites
- Bun runtime (latest version)
- TypeScript knowledge
- Basic understanding of WebSockets

### Setup Instructions

1. **Install Bun** (if not already installed)
```bash
curl -fsSL https://bun.sh/install | bash
```

2. **Install Server Dependencies**
```bash
cd server
bun install
```

3. **Install Client Dependencies**
```bash
cd client
bun install
```

4. **Start Development Servers**

Terminal 1 (Server):
```bash
cd server
bun run dev
```

Terminal 2 (Client):
```bash
cd client
bun run dev
```

Visit http://localhost:3000 to see the application.

## Key Implementation Details

### Server Implementation

#### 1. Battle Stream Management
The server uses `@pkmn/sim`'s BattleStreams to manage battle state:

```typescript
// Creating battle streams
const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

// Starting a battle
streams.omniscient.write(`>start ${JSON.stringify(spec)}`);
streams.omniscient.write(`>player p1 ${JSON.stringify(p1spec)}`);
streams.omniscient.write(`>player p2 ${JSON.stringify(p2spec)}`);

// Sending player actions
streams.p1.write('move 1'); // Player 1 uses move 1
streams.p2.write('switch 2'); // Player 2 switches to Pokemon 2
```

#### 2. Protocol Messages
The server broadcasts protocol messages from the omniscient stream:

```typescript
for await (const chunk of streams.omniscient) {
  // Broadcast to all clients in the room
  wsServer.broadcast(roomId, {
    type: 'battle-update',
    data: { chunk }
  });
}
```

#### 3. Team Validation
Use the TeamValidator from `@pkmn/sim`:

```typescript
import { TeamValidator } from '@pkmn/sim';

const validator = new TeamValidator(format);
const problems = validator.validateTeam(team);
if (problems) {
  // Handle validation errors
}
```

### Client Implementation

#### 1. Battle Client Setup
Use `@pkmn/client` to manage battle state:

```typescript
import { Battle } from '@pkmn/client';
import { Protocol } from '@pkmn/protocol';

const battle = new Battle();

// Process protocol messages
ws.onmessage = (event) => {
  const { chunk } = JSON.parse(event.data);
  for (const line of chunk.split('\n')) {
    const { args, kwArgs } = Protocol.parseBattleLine(line);
    battle.add(args, kwArgs);
  }
};
```

#### 2. Rendering Pokemon Sprites
Use `@pkmn/img` for sprites:

```typescript
import { Sprites } from '@pkmn/img';

// Get sprite URL
const spriteUrl = Sprites.getPokemon(pokemon.speciesForme, {
  gen: 'ani',
  side: 'p1',
  gender: pokemon.gender,
  shiny: pokemon.shiny
});

// In React component
<img src={spriteUrl} alt={pokemon.name} />
```

#### 3. Move Selection UI
```typescript
// Get available moves
const moves = battle.p1.active[0].moves;

// Render move buttons
moves.map((move, index) => (
  <button
    key={move.id}
    onClick={() => sendAction(`move ${index + 1}`)}
    disabled={move.disabled}
  >
    {move.move}
    <span>{move.pp}/{move.maxpp} PP</span>
  </button>
));
```

#### 4. Team Import/Export
Use `@pkmn/sets` for team management:

```typescript
import { Sets } from '@pkmn/sets';

// Import team from text
const team = Sets.importTeam(teamText);

// Export team to packed format
const packedTeam = Teams.pack(team);

// Send to server
ws.send(JSON.stringify({
  type: 'submit-team',
  data: { roomId, team: packedTeam }
}));
```

### WebSocket Communication

#### Message Types

**Client → Server:**
```typescript
// Create battle
{ type: 'create-battle', data: { format: 'gen9ou', playerName: 'Player1' } }

// Join battle
{ type: 'join-battle', data: { inviteCode: 'ABC123', playerName: 'Player2' } }

// Submit team
{ type: 'submit-team', data: { roomId: '...', team: 'packed-team-string' } }

// Battle action
{ type: 'battle-action', data: { roomId: '...', action: 'move 1' } }
```

**Server → Client:**
```typescript
// Battle created
{ type: 'battle-created', data: { roomId: '...', inviteLink: '...' } }

// Battle updates (protocol messages)
{ type: 'battle-update', data: { chunk: '|move|p1a: Pikachu|Thunderbolt|p2a: Charizard' } }

// Battle ready
{ type: 'battle-ready', data: { roomId: '...' } }
```

### Battle Formats

Common formats to support:
- `gen9randombattle` - Random Battle (current gen)
- `gen9ou` - Overused tier
- `gen9doublesou` - Doubles OU
- `gen9vgc2024` - VGC 2024 format
- `gen9customgame` - Custom Game (anything goes)

### State Management (Client)

Using Zustand for state management:

```typescript
import { create } from 'zustand';

interface BattleStore {
  battle: Battle | null;
  playerId: string | null;
  side: 'p1' | 'p2' | null;
  setBattle: (battle: Battle) => void;
  updateBattle: (args: any[], kwArgs: any) => void;
}

const useBattleStore = create<BattleStore>((set) => ({
  battle: null,
  playerId: null,
  side: null,
  setBattle: (battle) => set({ battle }),
  updateBattle: (args, kwArgs) => set((state) => {
    if (state.battle) {
      state.battle.add(args, kwArgs);
    }
    return { battle: state.battle };
  }),
}));
```

### Error Handling

1. **Connection Errors**
```typescript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Show reconnection UI
};

ws.onclose = () => {
  // Attempt reconnection with exponential backoff
};
```

2. **Battle Errors**
```typescript
if (message.type === 'error') {
  // Display error to user
  showError(message.error);
}
```

### Security Considerations

1. **Input Validation**
   - Validate all user inputs on the server
   - Sanitize player names and chat messages
   - Validate team data before passing to simulator

2. **Rate Limiting**
   - Limit actions per second per player
   - Prevent spam in chat
   - Limit battle creation rate

3. **Authentication** (Future Enhancement)
   - Add JWT tokens for persistent identity
   - Store battle history
   - Implement ELO ratings

## Testing

### Server Tests
```typescript
// Test battle creation
describe('BattleManager', () => {
  it('should create a battle room', () => {
    const room = battleManager.createBattle('gen9ou', 'Player1', 'player-id');
    expect(room.format).toBe('gen9ou');
    expect(room.state).toBe('waiting');
  });
});
```

### Client Tests
```typescript
// Test battle UI
describe('BattleUI', () => {
  it('should render move buttons', () => {
    const { getByText } = render(<MoveSelector moves={mockMoves} />);
    expect(getByText('Thunderbolt')).toBeInTheDocument();
  });
});
```

## Deployment

### Server Deployment
1. Build TypeScript: `bun run build`
2. Set environment variables:
   - `PORT` - Server port
   - `CLIENT_URL` - Client URL for CORS
3. Use PM2 or similar for process management (or run directly with Bun)

### Client Deployment
1. Build for production: `bun run build`
2. Configure WebSocket URL in environment
3. Deploy to CDN or static hosting

## Performance Optimization

1. **Battle Instance Pooling**
   - Reuse battle instances when possible
   - Clear old battle data periodically

2. **Protocol Message Batching**
   - Batch multiple updates in a single WebSocket frame
   - Compress large messages

3. **Client-Side Caching**
   - Cache Pokemon sprites
   - Cache move/ability data
   - Use React.memo for expensive components

## Future Enhancements

1. **Spectator Mode**
   - Allow spectators to join battles
   - Hide unrevealed information
   - Add spectator chat

2. **Battle Replays**
   - Store battle logs
   - Replay battles from logs
   - Share replay links

3. **Tournament System**
   - Create tournaments
   - Swiss/elimination brackets
   - Automated pairings

4. **Mobile Support**
   - Responsive UI
   - Touch-friendly controls
   - Mobile app wrapper

## Troubleshooting

### Common Issues

1. **"Cannot find module '@pkmn/sim'"**
   - Run `bun install` in the correct directory
   - Ensure Bun is properly installed

2. **WebSocket connection fails**
   - Check server is running
   - Verify CORS settings
   - Check firewall/proxy settings

3. **Battles not starting**
   - Verify both players submitted teams
   - Check format is valid
   - Look for errors in server logs

4. **Sprites not loading**
   - Check network tab for 404s
   - Verify @pkmn/img configuration
   - Check CORS headers for sprite CDN