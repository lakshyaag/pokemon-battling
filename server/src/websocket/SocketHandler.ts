import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { TeamGenerator } from '../services/TeamGenerator';
import { GameManager } from '../services/GameManager';
import type { ClientMessage, ServerMessage, Player } from '../types';

export class SocketHandler {
  private teamGenerator: TeamGenerator;
  private gameManager: GameManager;
  private clients: Map<string, { ws: WebSocket; player: Player }> = new Map();

  constructor() {
    try {
      this.teamGenerator = new TeamGenerator();
      this.gameManager = new GameManager();

      // Set up battle update callback
      this.gameManager.setBattleUpdateCallback((gameRoom, update, parsedState) => {
        this.handleBattleUpdate(gameRoom, update, parsedState);
      });

      console.log('SocketHandler initialized successfully');
    } catch (error) {
      console.error('Error initializing SocketHandler:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket): void {
    try {
      const playerId = uuidv4();

      const player: Player = {
        id: playerId,
        name: `Player_${playerId.slice(0, 8)}`
      };

      this.clients.set(playerId, { ws, player });

      console.log(`Player connected: ${player.name} (${playerId})`);

      // Send welcome message
      this.sendMessage(playerId, {
        type: 'connection_established',
        data: { playerId, playerName: player.name }
      });

      // Set up message handler
      ws.on('message', (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(playerId, message);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(playerId, 'Invalid message format');
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(playerId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
      });
    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Server error');
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(playerId: string, message: ClientMessage): void {
    const client = this.clients.get(playerId);
    if (!client) return;

    console.log(`Received message from ${playerId}:`, message.type);

    switch (message.type) {
      case 'create_random_team':
        this.handleCreateRandomTeam(playerId, message.data);
        break;

      case 'join_queue':
        this.handleJoinQueue(playerId, message.data);
        break;

      case 'leave_queue':
        this.handleLeaveQueue(playerId);
        break;

      case 'make_move':
        this.handleMakeMove(playerId, message.data);
        break;

      case 'battle_move':
        this.handleBattleMove(playerId, message.data).catch(error => {
          console.error('Error in battle_move handler:', error);
          this.sendError(playerId, 'Failed to process move');
        });
        break;

      case 'battle_switch':
        this.handleBattleSwitch(playerId, message.data).catch(error => {
          console.error('Error in battle_switch handler:', error);
          this.sendError(playerId, 'Failed to process switch');
        });
        break;

      default:
        this.sendError(playerId, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle create random team request
   */
  private handleCreateRandomTeam(playerId: string, data: any): void {
    try {
      const format = data?.format || 'gen9randombattle';
      const team = this.teamGenerator.generateRandomTeam(format);

      // Update player's team
      const client = this.clients.get(playerId);
      if (client) {
        client.player.team = team;
      }

      this.sendMessage(playerId, {
        type: 'team_generated',
        data: { team }
      });

      console.log(`Generated random team for player ${playerId}`);
    } catch (error) {
      console.error('Error generating random team:', error);
      this.sendError(playerId, 'Failed to generate random team');
    }
  }

  /**
   * Handle join matchmaking queue
   */
  private handleJoinQueue(playerId: string, data: any): void {
    const client = this.clients.get(playerId);
    if (!client) return;

    // Update player name if provided
    if (data?.playerName) {
      client.player.name = data.playerName;
    }

    // Use provided team or player's current team
    const team = data?.team || client.player.team;

    if (!team || team.length === 0) {
      this.sendError(playerId, 'No team available. Please create a team first.');
      return;
    }

    // Validate team
    if (!this.teamGenerator.validateTeam(team)) {
      this.sendError(playerId, 'Invalid team. Please create a new team.');
      return;
    }

    client.player.team = team;

    // Add to matchmaking queue
    this.gameManager.addPlayerToQueue(client.player);

    // Try to find a match
    const game = this.gameManager.getPlayerGame(playerId);
    if (game) {
      this.handleGameFound(game);
    } else {
      this.sendMessage(playerId, {
        type: 'queue_joined',
        data: {
          message: 'Waiting for opponent...',
          queueSize: this.gameManager.getWaitingPlayersCount()
        }
      });
    }
  }

  /**
   * Handle leave queue request
   */
  private handleLeaveQueue(playerId: string): void {
    this.gameManager.removePlayerFromQueue(playerId);

    this.sendMessage(playerId, {
      type: 'queue_left',
      data: { message: 'Left matchmaking queue' }
    });
  }

  /**
   * Handle game found - notify both players
   */
  private handleGameFound(game: any): void {
    const [player1, player2] = game.players;

    if (!player1 || !player2) return;

    // Notify player 1
    this.sendMessage(player1.id, {
      type: 'game_found',
      data: {
        roomId: game.id,
        opponent: player2.name,
        yourTeam: player1.team
      }
    });

    // Notify player 2
    this.sendMessage(player2.id, {
      type: 'game_found',
      data: {
        roomId: game.id,
        opponent: player1.name,
        yourTeam: player2.team
      }
    });

    console.log(`Game found: ${game.id} - ${player1.name} vs ${player2.name}`);
  }

  /**
   * Handle battle move (legacy)
   */
  private handleMakeMove(playerId: string, data: any): void {
    const game = this.gameManager.getPlayerGame(playerId);
    if (!game) {
      this.sendError(playerId, 'No active game found');
      return;
    }

    console.log(`Player ${playerId} made move:`, data);

    this.sendMessage(playerId, {
      type: 'move_acknowledged',
      data: { move: data }
    });
  }

  /**
   * Handle battle move command
   */
  private async handleBattleMove(playerId: string, data: any): Promise<void> {
    const game = this.gameManager.getPlayerGame(playerId);
    if (!game) {
      this.sendError(playerId, 'No active battle found');
      return;
    }

    if (game.status !== 'in_progress') {
      this.sendError(playerId, 'Battle is not in progress');
      return;
    }

    const moveData = {
      type: 'move',
      moveSlot: data.moveSlot
    };

    try {
      const success = await this.gameManager.handleBattleMove(game, playerId, moveData);
      if (!success) {
        this.sendError(playerId, 'Failed to execute move');
      }
    } catch (error) {
      console.error('Error in handleBattleMove:', error);
      this.sendError(playerId, 'Failed to execute move');
    }
  }

  /**
   * Handle battle switch command
   */
  private async handleBattleSwitch(playerId: string, data: any): Promise<void> {
    const game = this.gameManager.getPlayerGame(playerId);
    if (!game) {
      this.sendError(playerId, 'No active battle found');
      return;
    }

    if (game.status !== 'in_progress') {
      this.sendError(playerId, 'Battle is not in progress');
      return;
    }

    const switchData = {
      type: 'switch',
      pokemonSlot: data.pokemonSlot
    };

    try {
      const success = await this.gameManager.handleBattleMove(game, playerId, switchData);
      if (!success) {
        this.sendError(playerId, 'Failed to switch Pokemon');
      }
    } catch (error) {
      console.error('Error in handleBattleSwitch:', error);
      this.sendError(playerId, 'Failed to switch Pokemon');
    }
  }

  /**
 * Handle battle updates from GameManager
 */
  private handleBattleUpdate(gameRoom: GameRoom, update: string, parsedState: any): void {
    const [player1, player2] = gameRoom.players;

    if (!player1 || !player2) return;

    // Create user-specific battle states
    const p1BattleState = this.createUserSpecificBattleState(parsedState, 'p1');
    const p2BattleState = this.createUserSpecificBattleState(parsedState, 'p2');

    const p1Data = {
      roomId: gameRoom.id,
      update: update,
      lines: update.split('\n').filter(line => line.trim()),
      battleState: p1BattleState,
      yourSide: 'p1',
      opponentSide: 'p2'
    };

    const p2Data = {
      roomId: gameRoom.id,
      update: update,
      lines: update.split('\n').filter(line => line.trim()),
      battleState: p2BattleState,
      yourSide: 'p2',
      opponentSide: 'p1'
    };

    this.sendMessage(player1.id, {
      type: 'battle_update',
      data: p1Data
    });

    this.sendMessage(player2.id, {
      type: 'battle_update',
      data: p2Data
    });

    // Handle battle end
    if (parsedState?.ended) {
      setTimeout(() => {
        this.sendMessage(player1.id, {
          type: 'battle_ended',
          data: {
            winner: parsedState.winner,
            message: parsedState.lastAction
          }
        });

        this.sendMessage(player2.id, {
          type: 'battle_ended',
          data: {
            winner: parsedState.winner,
            message: parsedState.lastAction
          }
        });

        // Clean up game
        this.gameManager.removeGame(gameRoom.id);
      }, 3000); // 3 second delay to show results
    }
  }

  /**
   * Create user-specific battle state with personalized messages
   */
  private createUserSpecificBattleState(battleState: any, userSide: 'p1' | 'p2'): any {
    if (!battleState || !battleState.lastAction || !battleState.lastActionSide) {
      return battleState;
    }

    const isUserAction = battleState.lastActionSide === userSide;
    let userSpecificAction = battleState.lastAction;

    // Transform messages to be user-specific
    if (battleState.lastAction.includes('switched in!')) {
      const pokemonName = battleState.lastAction.split(' ')[0];
      userSpecificAction = isUserAction
        ? `Your ${pokemonName} switched in!`
        : `Opponent's ${pokemonName} switched in!`;
    } else if (battleState.lastAction.includes('used ') && battleState.lastAction.includes('!')) {
      const parts = battleState.lastAction.split(' used ');
      const pokemonName = parts[0];
      const moveAndRest = parts[1];
      userSpecificAction = isUserAction
        ? `Your ${pokemonName} used ${moveAndRest}`
        : `Opponent's ${pokemonName} used ${moveAndRest}`;
    } else if (battleState.lastAction.includes('took damage!')) {
      const pokemonName = battleState.lastAction.split(' ')[0];
      userSpecificAction = isUserAction
        ? `Your ${pokemonName} took damage!`
        : `Opponent's ${pokemonName} took damage!`;
    } else if (battleState.lastAction.includes('was healed!')) {
      const pokemonName = battleState.lastAction.split(' ')[0];
      userSpecificAction = isUserAction
        ? `Your ${pokemonName} was healed!`
        : `Opponent's ${pokemonName} was healed!`;
    }

    return {
      ...battleState,
      lastAction: userSpecificAction
    };
  }

  /**
   * Handle player disconnection
   */
  private handleDisconnection(playerId: string): void {
    const client = this.clients.get(playerId);
    if (!client) return;

    console.log(`Player disconnected: ${client.player.name} (${playerId})`);

    // Remove from queue if waiting
    this.gameManager.removePlayerFromQueue(playerId);

    // Handle active game disconnection
    const game = this.gameManager.getPlayerGame(playerId);
    if (game) {
      // Notify opponent of disconnection
      const opponent = game.players.find(p => p?.id !== playerId);
      if (opponent) {
        this.sendMessage(opponent.id, {
          type: 'opponent_disconnected',
          data: { message: 'Your opponent has disconnected' }
        });
      }

      // End the game
      this.gameManager.endGame(game.id);
    }

    // Remove client
    this.clients.delete(playerId);
  }

  /**
   * Send message to specific client
   */
  private sendMessage(playerId: string, message: ServerMessage): void {
    const client = this.clients.get(playerId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(playerId: string, error: string): void {
    this.sendMessage(playerId, {
      type: 'error',
      data: { error }
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get game statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      waitingPlayers: this.gameManager.getWaitingPlayersCount(),
      activeGames: this.gameManager.getActiveGames().length
    };
  }
}
