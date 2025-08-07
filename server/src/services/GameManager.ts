import { v4 as uuidv4 } from 'uuid';
import { BattleStreams } from '@pkmn/sim';
import { Teams } from '@pkmn/sim';
import type { Player, GameRoom } from '../types';
import type { PokemonSet } from '@pkmn/sets';
import { BattleStateParser } from '../../../shared/BattleStateParser';

export class GameManager {
  private waitingPlayers: Player[] = [];
  private activeGames: Map<string, GameRoom> = new Map();
  private battleUpdateCallback?: (gameRoom: GameRoom, update: string, parsedState: any) => void;
  private battleParsers: Map<string, BattleStateParser> = new Map();
  private turnChoices: Map<string, { p1?: string, p2?: string }> = new Map();

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
      const spec = {
        formatid: 'gen9ou'  // Try using a standard format
      };

      // Pack teams for battle
      const p1Team = Teams.pack(player1.team);
      const p2Team = Teams.pack(player2.team);

      const p1spec = { name: player1.name, team: p1Team };
      const p2spec = { name: player2.name, team: p2Team };

      // Initialize battle state parser
      const parser = new BattleStateParser();
      this.battleParsers.set(gameRoom.id, parser);

      // Start listening to battle stream for updates
      this.setupBattleStreamListener(gameRoom);

      // Also listen to individual player streams for requests
      this.setupPlayerStreamListeners(gameRoom);

      // Start the battle
      gameRoom.status = 'in_progress';

      // Write battle initialization commands
      await streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);

      // Auto-start the battle after a short delay to skip team preview
      setTimeout(async () => {
        try {
          // Send team order and start battle
          await streams.p1.write('team 123456');
          await streams.p2.write('team 123456');

          // Battle should start automatically after team selection
          console.log('Team selection sent, battle should start automatically');

          console.log(`Auto-started battle for game ${gameRoom.id}`);
        } catch (error) {
          console.error('Error auto-starting battle:', error);
        }
      }, 1500);

      console.log(`Battle initialized for game ${gameRoom.id}`);
    } catch (error) {
      console.error('Error initializing battle:', error);
      gameRoom.status = 'completed';
    }
  }

  /**
   * Set up listeners for individual player streams
   */
  private setupPlayerStreamListeners(gameRoom: GameRoom): void {
    const streams = gameRoom.battle;
    if (!streams) return;

    // Listen to p1 stream for requests
    (async () => {
      try {
        for await (const chunk of streams.p1) {
          console.log(`P1 stream:`, chunk);
          if (chunk.includes('|request|')) {
            console.log(`P1 received request - waiting for move choice`);
          }
        }
      } catch (error) {
        console.error('Error in p1 stream listener:', error);
      }
    })();

    // Listen to p2 stream for requests  
    (async () => {
      try {
        for await (const chunk of streams.p2) {
          console.log(`P2 stream:`, chunk);
          if (chunk.includes('|request|')) {
            console.log(`P2 received request - waiting for move choice`);
          }
        }
      } catch (error) {
        console.error('Error in p2 stream listener:', error);
      }
    })();
  }

  /**
   * Set up battle stream listener for real-time updates
   */
  private setupBattleStreamListener(gameRoom: GameRoom): void {
    const streams = gameRoom.battle;
    if (!streams) return;

    // Listen to battle updates from omniscient stream
    (async () => {
      try {
        for await (const chunk of streams.omniscient) {
          console.log(`Battle ${gameRoom.id} update:`, chunk);

          // Parse and broadcast battle updates to clients
          this.processBattleUpdate(gameRoom, chunk);
        }
      } catch (error) {
        console.error('Error in battle stream listener:', error);
        // Don't crash the whole system, just mark game as completed
        gameRoom.status = 'completed';
        this.removeGame(gameRoom.id);
      }
    })();
  }

  /**
 * Process battle updates and send to clients
 */
  private processBattleUpdate(gameRoom: GameRoom, update: string): void {
    // Parse the battle protocol message
    const lines = update.split('\n').filter(line => line.trim());

    for (const line of lines) {
      console.log(`Processing battle line: ${line}`);
    }

    // Parse battle state
    const parser = this.battleParsers.get(gameRoom.id);
    let parsedState = null;

    if (parser) {
      try {
        parsedState = parser.parseUpdate(update);
        console.log(`Parsed battle state - Turn: ${parsedState.turn}, Last Action: ${parsedState.lastAction}`);

        // Log HP status
        if (parsedState.players.p1.activePokemon) {
          console.log(`P1 Active: ${parsedState.players.p1.activePokemon.name} (${parsedState.players.p1.activePokemon.hp}/${parsedState.players.p1.activePokemon.maxhp})`);
        }
        if (parsedState.players.p2.activePokemon) {
          console.log(`P2 Active: ${parsedState.players.p2.activePokemon.name} (${parsedState.players.p2.activePokemon.hp}/${parsedState.players.p2.activePokemon.maxhp})`);
        }
      } catch (error) {
        console.error('Error parsing battle state:', error);
      }
    }

    // Send update to clients via callback
    if (this.battleUpdateCallback) {
      this.battleUpdateCallback(gameRoom, update, parsedState);
    }
  }

  /**
   * Set callback for battle updates
   */
  setBattleUpdateCallback(callback: (gameRoom: GameRoom, update: string, parsedState: any) => void): void {
    this.battleUpdateCallback = callback;
  }

  /**
   * Handle battle move from player
   */
  async handleBattleMove(gameRoom: GameRoom, playerId: string, moveData: any): Promise<boolean> {
    const streams = gameRoom.battle;
    if (!streams || gameRoom.status !== 'in_progress') {
      console.log(`Cannot process move: streams=${!!streams}, status=${gameRoom.status}`);
      return false;
    }

    try {
      const [player1, player2] = gameRoom.players;
      const isPlayer1 = player1?.id === playerId;
      const playerStream = isPlayer1 ? streams.p1 : streams.p2;
      const playerSide = isPlayer1 ? 'p1' : 'p2';

      // Format move command according to Pokemon Showdown protocol
      let command = '';

      if (moveData.type === 'move') {
        // Move command: move 1 (slot number)
        command = `move ${moveData.moveSlot}`;
      } else if (moveData.type === 'switch') {
        // Switch command: switch 2 (pokemon number)
        command = `switch ${moveData.pokemonSlot}`;
      }

      if (command) {
        console.log(`Player ${playerSide} (${playerId}) executing: ${command}`);
        console.log(`Stream available: ${!!playerStream}, Stream writable: ${playerStream.writable}`);

        // Track turn choices for debugging
        const roomChoices = this.turnChoices.get(gameRoom.id) || {};
        roomChoices[playerSide] = command;
        this.turnChoices.set(gameRoom.id, roomChoices);

        console.log(`Turn choices for ${gameRoom.id}:`, roomChoices);

        await playerStream.write(command);
        console.log(`Successfully sent command: ${command}`);

        // Check if both players have made choices
        if (roomChoices.p1 && roomChoices.p2) {
          console.log(`Both players have submitted choices - turn should process now`);
          // Clear choices for next turn
          this.turnChoices.set(gameRoom.id, {});
        }

        return true;
      } else {
        console.log(`Invalid command data:`, moveData);
      }
    } catch (error) {
      console.error('Error handling battle move:', error);
    }

    return false;
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
      this.removeGame(roomId);
      console.log(`Game ${roomId} ended`);
    }
  }

  /**
   * Remove a game and clean up resources
   */
  removeGame(roomId: string): void {
    this.activeGames.delete(roomId);
    this.battleParsers.delete(roomId);
    this.turnChoices.delete(roomId);
    console.log(`Game ${roomId} removed`);
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
