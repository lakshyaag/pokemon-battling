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
  type: 'create_random_team' | 'join_queue' | 'make_move' | 'leave_queue';
  data?: any;
}

export interface ServerMessage {
  type: 'team_generated' | 'game_found' | 'battle_update' | 'error' | 'game_ended';
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
