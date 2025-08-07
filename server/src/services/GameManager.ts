import { v4 as uuidv4 } from 'uuid';
import { BattleStreams } from '@pkmn/sim';
import { Teams } from '@pkmn/sim';
import type { Player, GameRoom } from '../types';
import type { PokemonSet } from '@pkmn/sets';

export class GameManager {
  private waitingPlayers: Player[] = [];
  private activeGames: Map<string, GameRoom> = new Map();

  /**
   * Add a player to the matchmaking queue
   */
  addPlayerToQueue(player: Player): void {
    // Remove player if already in queue
    this.removePlayerFromQueue(player.id);
    
    this.waitingPlayers.push(player);
    console.log(`Player ${player.name} (${player.id}) joined queue`);
    
    // Try to match players
    this.tryMatchPlayers();
  }

  /**
   * Remove a player from the matchmaking queue
   */
  removePlayerFromQueue(playerId: string): void {
    const index = this.waitingPlayers.findIndex(p => p.id === playerId);
    if (index !== -1) {
      const player = this.waitingPlayers.splice(index, 1)[0];
      console.log(`Player ${player.name} (${player.id}) left queue`);
    }
  }

  /**
   * Try to match waiting players
   */
  private tryMatchPlayers(): GameRoom | null {
    if (this.waitingPlayers.length >= 2) {
      const player1 = this.waitingPlayers.shift()!;
      const player2 = this.waitingPlayers.shift()!;
      
      return this.createGame(player1, player2);
    }
    
    return null;
  }

  /**
   * Create a new game between two players
   */
  createGame(player1: Player, player2: Player): GameRoom {
    const roomId = uuidv4();
    
    // Create battle streams for the game
    const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
    
    const gameRoom: GameRoom = {
      id: roomId,
      players: [player1, player2],
      status: 'waiting',
      battle: streams
    };

    this.activeGames.set(roomId, gameRoom);
    
    console.log(`Game created: ${roomId} between ${player1.name} and ${player2.name}`);
    
    // Initialize the battle
    this.initializeBattle(gameRoom);
    
    return gameRoom;
  }

  /**
   * Initialize the battle with player teams
   */
  private async initializeBattle(gameRoom: GameRoom): Promise<void> {
    const [player1, player2] = gameRoom.players;
    
    if (!player1?.team || !player2?.team) {
      console.error('Players missing teams for battle initialization');
      return;
    }

    try {
      const streams = gameRoom.battle;
      const spec = { formatid: 'gen9customgame' };

      // Pack teams for battle
      const p1Team = Teams.pack(player1.team);
      const p2Team = Teams.pack(player2.team);

      const p1spec = { name: player1.name, team: p1Team };
      const p2spec = { name: player2.name, team: p2Team };

      // Start the battle
      gameRoom.status = 'in_progress';

      // Write battle initialization commands
      await streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);

      console.log(`Battle initialized for game ${gameRoom.id}`);
    } catch (error) {
      console.error('Error initializing battle:', error);
      gameRoom.status = 'completed';
    }
  }

  /**
   * Get a game by room ID
   */
  getGame(roomId: string): GameRoom | undefined {
    return this.activeGames.get(roomId);
  }

  /**
   * Get all active games
   */
  getActiveGames(): GameRoom[] {
    return Array.from(this.activeGames.values());
  }

  /**
   * End a game
   */
  endGame(roomId: string): void {
    const game = this.activeGames.get(roomId);
    if (game) {
      game.status = 'completed';
      this.activeGames.delete(roomId);
      console.log(`Game ${roomId} ended`);
    }
  }

  /**
   * Get player's current game
   */
  getPlayerGame(playerId: string): GameRoom | undefined {
    for (const game of this.activeGames.values()) {
      if (game.players.some(p => p?.id === playerId)) {
        return game;
      }
    }
    return undefined;
  }

  /**
   * Get waiting players count
   */
  getWaitingPlayersCount(): number {
    return this.waitingPlayers.length;
  }
}
