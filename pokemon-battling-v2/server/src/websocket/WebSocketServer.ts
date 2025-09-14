import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { BattleManager } from '../battle/BattleManager';
import { IncomingMessage, OutgoingMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Client {
  id: string;
  ws: WebSocket;
  roomId?: string;
  playerId: string;
}

export class WebSocketServer {
  private wss: WSServer;
  private clients: Map<string, Client> = new Map();
  private battleManager: BattleManager;

  constructor(server: Server, battleManager: BattleManager) {
    this.battleManager = battleManager;
    this.wss = new WSServer({ server });
    this.setupEventListeners();
    this.setupBattleListeners();
  }

  private setupEventListeners(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const playerId = uuidv4();
      const client: Client = { id: clientId, ws, playerId };
      this.clients.set(clientId, client);

      console.log(`Client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message: IncomingMessage = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          console.error('Invalid message:', error);
          this.sendError(client, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.handleDisconnect(client);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send welcome message
      this.send(client, {
        type: 'connected',
        data: { clientId, playerId },
      });
    });
  }

  private setupBattleListeners(): void {
    this.battleManager.on('battle-created', (room) => {
      console.log(`Battle created: ${room.id}`);
    });

    this.battleManager.on('battle-ready', (room) => {
      // Notify both players that the battle is ready
      this.broadcastToRoom(room.id, {
        type: 'battle-ready',
        data: { roomId: room.id },
      });
    });

    this.battleManager.on('battle-started', (room) => {
      // Notify all clients in the room that the battle has started
      this.broadcastToRoom(room.id, {
        type: 'battle-started',
        data: { roomId: room.id },
      });
    });

    this.battleManager.on('battle-update', (roomId: string, chunk: string) => {
      // Broadcast battle updates to all clients in the room
      this.broadcastToRoom(roomId, {
        type: 'battle-update',
        data: { roomId, chunk },
      });
    });

    this.battleManager.on('battle-error', (roomId: string, error: any) => {
      this.broadcastToRoom(roomId, {
        type: 'battle-error',
        data: { roomId, error: error.message },
      });
    });
  }

  private handleMessage(client: Client, message: IncomingMessage): void {
    switch (message.type) {
      case 'create-battle':
        this.handleCreateBattle(client, message.data);
        break;
      case 'join-battle':
        this.handleJoinBattle(client, message.data);
        break;
      case 'submit-team':
        this.handleSubmitTeam(client, message.data);
        break;
      case 'battle-action':
        this.handleBattleAction(client, message.data);
        break;
      case 'chat':
        this.handleChat(client, message.data);
        break;
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  private handleCreateBattle(client: Client, data: any): void {
    const { format, playerName } = data;
    
    if (!format || !playerName) {
      this.sendError(client, 'Missing format or playerName');
      return;
    }

    const room = this.battleManager.createBattle(format, playerName, client.playerId);
    client.roomId = room.id;

    this.send(client, {
      type: 'battle-created',
      data: {
        roomId: room.id,
        inviteCode: room.inviteCode,
        inviteLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/join/${room.inviteCode}`,
      },
    });
  }

  private handleJoinBattle(client: Client, data: any): void {
    const { roomId, playerName, inviteCode } = data;
    
    if (!playerName) {
      this.sendError(client, 'Missing playerName');
      return;
    }

    let room;
    if (inviteCode) {
      room = this.battleManager.getBattleByInviteCode(inviteCode);
    } else if (roomId) {
      room = this.battleManager.getBattle(roomId);
    }

    if (!room) {
      this.sendError(client, 'Battle not found');
      return;
    }

    const joined = this.battleManager.joinBattle(room.id, playerName, client.playerId);
    if (!joined) {
      this.sendError(client, 'Failed to join battle');
      return;
    }

    client.roomId = room.id;

    this.send(client, {
      type: 'battle-joined',
      data: {
        roomId: room.id,
        format: room.format,
        players: Array.from(room.players.values()),
      },
    });

    // Notify other player
    this.broadcastToRoom(room.id, {
      type: 'player-joined',
      data: {
        playerName,
        playerId: client.playerId,
      },
    }, client.id);
  }

  private handleSubmitTeam(client: Client, data: any): void {
    const { roomId, team } = data;
    
    if (!roomId || !client.roomId) {
      this.sendError(client, 'Not in a battle room');
      return;
    }

    const success = this.battleManager.submitTeam(roomId, client.playerId, team);
    if (!success) {
      this.sendError(client, 'Failed to submit team');
      return;
    }

    this.send(client, {
      type: 'team-submitted',
      data: { success: true },
    });
  }

  private handleBattleAction(client: Client, data: any): void {
    const { roomId, action } = data;
    
    if (!roomId || !client.roomId || !action) {
      this.sendError(client, 'Invalid battle action');
      return;
    }

    const success = this.battleManager.sendBattleAction(roomId, client.playerId, action);
    if (!success) {
      this.sendError(client, 'Failed to send battle action');
    }
  }

  private handleChat(client: Client, data: any): void {
    const { roomId, message } = data;
    
    if (!roomId || !client.roomId || !message) {
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'chat',
      data: {
        playerId: client.playerId,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private handleDisconnect(client: Client): void {
    if (client.roomId) {
      this.broadcastToRoom(client.roomId, {
        type: 'player-disconnected',
        data: { playerId: client.playerId },
      }, client.id);
    }
  }

  private send(client: Client, message: OutgoingMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private sendError(client: Client, error: string): void {
    this.send(client, {
      type: 'error',
      data: {},
      error,
    });
  }

  private broadcastToRoom(roomId: string, message: OutgoingMessage, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients) {
      if (client.roomId === roomId && clientId !== excludeClientId) {
        this.send(client, message);
      }
    }
  }
}