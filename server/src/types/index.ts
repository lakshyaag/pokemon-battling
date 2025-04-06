import type { PlayerId, PlayerDecision, PlayerRequest } from "../../services/battle-types";

// --- Client and Battle Types ---
export interface ClientInfo {
	userId: string;
	currentBattleId?: string;
	playerRole?: PlayerId;
}

export interface SocketInfo {
	socketId: string;
	userId: string;
}

export interface BattleRoom {
	battleId: string;
	p1: SocketInfo | null;
	p2: SocketInfo | null;
	spectators: string[];
	format: string;
	started: boolean;
	p1Decision: PlayerDecision | null;
	p2Decision: PlayerDecision | null;
	// Disconnect timers
	p1DisconnectTimer?: NodeJS.Timeout;
	p2DisconnectTimer?: NodeJS.Timeout;
}

// Database types
export interface BattleRecord {
	id: string;
	format: string;
	p1_user_id: string;
	p2_user_id: string | null;
	p1_socket_id: string | null;
	p2_socket_id: string | null;
	p1_name: string;
	p2_name: string | null;
	status: "waiting" | "active" | "finished";
	winner: string | null;
	last_activity_at: string;
	created_at: string;
	p1_last_request: PlayerRequest | null;
	p2_last_request: PlayerRequest | null;
	initial_protocol_lines: string[];
}

// Re-export battle types for convenience
export type { PlayerId, PlayerDecision, PlayerRequest }; 