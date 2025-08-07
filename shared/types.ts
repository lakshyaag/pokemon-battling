import type { PokemonSet } from '@pkmn/sets';

export interface Player {
  id: string;
  name: string;
  team?: PokemonSet[];
}

export interface GameRoom {
  id: string;
  players: [Player?, Player?];
  status: 'waiting' | 'in_progress' | 'completed';
  battle?: any; // Battle instance from @pkmn/sim
}

export interface ClientMessage {
  type: 'create_random_team' | 'join_queue' | 'make_move' | 'leave_queue' | 'battle_move' | 'battle_switch';
  data?: any;
}

export interface ServerMessage {
  type: 'team_generated' | 'game_found' | 'battle_update' | 'error' | 'game_ended' | 'battle_started' | 'battle_request' | 'battle_ended';
  data?: any;
}

export interface RandomTeamRequest {
  generation?: string;
  format?: string;
}

export interface RandomTeamResponse {
  team: PokemonSet[];
}

export interface JoinQueueRequest {
  playerName: string;
  team: PokemonSet[];
}

export interface GameFoundResponse {
  roomId: string;
  opponent: string;
  yourTeam: PokemonSet[];
  opponentTeam?: PokemonSet[]; // Hidden until battle starts
}

export interface BattleUpdateResponse {
  messages: string[];
  gameState: any;
}

export interface BattleMoveRequest {
  type: 'move' | 'switch';
  moveSlot?: number; // 1-4 for moves
  pokemonSlot?: number; // 1-6 for pokemon
}

export interface BattleState {
  turn: number;
  weather?: string;
  players: {
    p1: BattlePlayerState;
    p2: BattlePlayerState;
  };
}

export interface BattlePlayerState {
  name: string;
  team: PokemonBattleState[];
  activePokemon: number; // Index of active pokemon
}

export interface PokemonBattleState {
  species: string;
  level: number;
  hp: number;
  maxhp: number;
  status?: string;
  moves: string[];
  item?: string;
}
