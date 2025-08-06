import { Battle, BattleStreams } from '@pkmn/sim';

export interface PlayerInfo {
  id: string;
  name: string;
  team?: string;
  isReady: boolean;
  side: 'p1' | 'p2' | null;
}

export interface BattleRoom {
  id: string;
  battle?: Battle;
  streams?: BattleStreams.BattleStreams;
  players: Map<string, PlayerInfo>;
  spectators: Set<string>;
  format: string;
  createdAt: Date;
  state: 'waiting' | 'ready' | 'active' | 'finished';
  inviteCode: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface CreateBattleMessage {
  type: 'create-battle';
  data: {
    format: string;
    playerName: string;
  };
}

export interface JoinBattleMessage {
  type: 'join-battle';
  data: {
    roomId: string;
    playerName: string;
  };
}

export interface SubmitTeamMessage {
  type: 'submit-team';
  data: {
    roomId: string;
    team: string;
  };
}

export interface BattleActionMessage {
  type: 'battle-action';
  data: {
    roomId: string;
    action: string;
  };
}

export interface ChatMessage {
  type: 'chat';
  data: {
    roomId: string;
    message: string;
  };
}

export type IncomingMessage = 
  | CreateBattleMessage 
  | JoinBattleMessage 
  | SubmitTeamMessage 
  | BattleActionMessage 
  | ChatMessage;

export interface OutgoingMessage {
  type: string;
  data: any;
  error?: string;
}