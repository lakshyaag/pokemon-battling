import { Dex, BattleStreams, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';
import { v4 as uuidv4 } from 'uuid';
import { BattleRoom, PlayerInfo } from '../types';
import { EventEmitter } from 'events';

// Set up random team generation
Teams.setGeneratorFactory(TeamGenerators);

export class BattleManager extends EventEmitter {
  private battles: Map<string, BattleRoom> = new Map();

  constructor() {
    super();
  }

  createBattle(format: string, playerName: string, playerId: string): BattleRoom {
    const roomId = uuidv4();
    const inviteCode = this.generateInviteCode();
    
    const room: BattleRoom = {
      id: roomId,
      format,
      players: new Map(),
      spectators: new Set(),
      createdAt: new Date(),
      state: 'waiting',
      inviteCode,
    };

    // Add the creating player
    const playerInfo: PlayerInfo = {
      id: playerId,
      name: playerName,
      isReady: false,
      side: 'p1',
    };
    room.players.set(playerId, playerInfo);

    this.battles.set(roomId, room);
    this.emit('battle-created', room);
    
    return room;
  }

  joinBattle(roomId: string, playerName: string, playerId: string): BattleRoom | null {
    const room = this.battles.get(roomId);
    if (!room || room.state !== 'waiting') {
      return null;
    }

    // Check if room is full
    if (room.players.size >= 2) {
      return null;
    }

    // Add the joining player
    const playerInfo: PlayerInfo = {
      id: playerId,
      name: playerName,
      isReady: false,
      side: 'p2',
    };
    room.players.set(playerId, playerInfo);

    // Update room state if we have 2 players
    if (room.players.size === 2) {
      room.state = 'ready';
      this.emit('battle-ready', room);
    }

    return room;
  }

  submitTeam(roomId: string, playerId: string, team: string): boolean {
    const room = this.battles.get(roomId);
    if (!room || room.state !== 'ready') {
      return false;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return false;
    }

    // Validate team
    try {
      const format = Dex.formats.get(room.format);
      if (!format) {
        throw new Error(`Unknown format: ${room.format}`);
      }

      // For random battles, generate a team
      if (room.format.includes('random')) {
        const generator = Teams.getGenerator(room.format);
        if (generator) {
          team = Teams.pack(generator.getTeam());
        }
      }

      // Store the team
      player.team = team;
      player.isReady = true;

      // Check if both players are ready
      const allReady = Array.from(room.players.values()).every(p => p.isReady);
      if (allReady) {
        this.startBattle(room);
      }

      return true;
    } catch (error) {
      console.error('Team submission error:', error);
      return false;
    }
  }

  private startBattle(room: BattleRoom): void {
    try {
      // Create battle streams
      const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
      room.streams = streams;

      // Set up omniscient stream listener
      const processChunk = async () => {
        for await (const chunk of streams.omniscient) {
          this.emit('battle-update', room.id, chunk);
        }
      };
      processChunk().catch(console.error);

      // Get player info
      const players = Array.from(room.players.values());
      const p1 = players.find(p => p.side === 'p1')!;
      const p2 = players.find(p => p.side === 'p2')!;

      // Start the battle
      const spec = { formatid: room.format };
      const p1spec = { name: p1.name, team: p1.team! };
      const p2spec = { name: p2.name, team: p2.team! };

      streams.omniscient.write(`>start ${JSON.stringify(spec)}`);
      streams.omniscient.write(`>player p1 ${JSON.stringify(p1spec)}`);
      streams.omniscient.write(`>player p2 ${JSON.stringify(p2spec)}`);

      room.state = 'active';
      this.emit('battle-started', room);
    } catch (error) {
      console.error('Battle start error:', error);
      room.state = 'finished';
      this.emit('battle-error', room.id, error);
    }
  }

  sendBattleAction(roomId: string, playerId: string, action: string): boolean {
    const room = this.battles.get(roomId);
    if (!room || room.state !== 'active' || !room.streams) {
      return false;
    }

    const player = room.players.get(playerId);
    if (!player || !player.side) {
      return false;
    }

    try {
      // Write action to the appropriate stream
      const stream = player.side === 'p1' ? room.streams.p1 : room.streams.p2;
      stream.write(action);
      return true;
    } catch (error) {
      console.error('Battle action error:', error);
      return false;
    }
  }

  getBattle(roomId: string): BattleRoom | undefined {
    return this.battles.get(roomId);
  }

  getBattleByInviteCode(inviteCode: string): BattleRoom | undefined {
    return Array.from(this.battles.values()).find(room => room.inviteCode === inviteCode);
  }

  removeBattle(roomId: string): void {
    const room = this.battles.get(roomId);
    if (room) {
      room.state = 'finished';
      this.battles.delete(roomId);
      this.emit('battle-ended', room);
    }
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Cleanup old battles
  cleanupOldBattles(maxAgeHours: number = 24): void {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [roomId, room] of this.battles) {
      if (now - room.createdAt.getTime() > maxAge) {
        this.removeBattle(roomId);
      }
    }
  }
}