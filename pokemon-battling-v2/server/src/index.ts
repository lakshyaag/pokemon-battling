import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { BattleManager } from './battle/BattleManager';
import { WebSocketServer } from './websocket/WebSocketServer';
import { Dex } from '@pkmn/sim';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize managers
const battleManager = new BattleManager();
const wsServer = new WebSocketServer(server, battleManager);

// HTTP Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available formats
app.get('/api/formats', (req, res) => {
  const formats = [];
  for (const [id, format] of Dex.formats) {
    if (format.effectType === 'Format' && !format.isNonstandard) {
      formats.push({
        id: format.id,
        name: format.name,
        gameType: format.gameType || 'singles',
        ruleset: format.ruleset || [],
      });
    }
  }
  res.json({ formats });
});

// Get battle info by invite code
app.get('/api/battles/invite/:inviteCode', (req, res) => {
  const { inviteCode } = req.params;
  const room = battleManager.getBattleByInviteCode(inviteCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Battle not found' });
  }

  res.json({
    roomId: room.id,
    format: room.format,
    state: room.state,
    players: Array.from(room.players.values()).map(p => ({
      name: p.name,
      isReady: p.isReady,
      side: p.side,
    })),
  });
});

// Validate team
app.post('/api/teams/validate', (req, res) => {
  const { team, format } = req.body;
  
  try {
    const dexFormat = Dex.formats.get(format);
    if (!dexFormat) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    // TODO: Implement team validation using TeamValidator
    res.json({ valid: true, errors: [] });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  
  // Cleanup old battles periodically
  setInterval(() => {
    battleManager.cleanupOldBattles();
  }, 60 * 60 * 1000); // Every hour
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});