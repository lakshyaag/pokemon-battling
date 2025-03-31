import type { Pokemon, Battle } from "@pkmn/client";

/**
 * Interface for move data
 */
export interface MoveData {
	id: string;
	move: string;
	pp: number;
	maxpp: number;
	disabled?: boolean;
}

/**
 * Interface for player state in battle
 */
export interface PlayerState {
	name?: string;
	active: Pokemon | null;
	team: Pokemon[];
	request: PlayerRequest | null;
	selectedMove: PlayerDecision | null;
}

/**
 * Interface for battle state
 */
export interface BattleState {
	battle: Battle;
	logs: string[];
	p1Request: PlayerRequest | null;
	p2Request: PlayerRequest | null;
}

export type PlayerId = "p1" | "p2";

/**
 * Interface for player request from the battle stream
 */
export interface PlayerRequest {
	active?: {
		moves: Array<{
			id: string;
			pp: number;
			maxpp: number;
			target: string;
			disabled?: boolean;
		}>;
		trapped?: boolean;
		maybeTrapped?: boolean;
		canSwitch?: boolean | number[];
	}[];
	side: {
		name: string;
		id: string;
		pokemon: Array<{
			ident: string;
			details: string;
			condition: string;
			active: boolean;
			stats: {
				atk: number;
				def: number;
				spa: number;
				spd: number;
				spe: number;
			};
			moves: string[];
			baseAbility: string;
			item: string;
			pokeball: string;
			ability: string;
			reviving?: boolean;
			fainted?: boolean;
		}>;
	};
	forceSwitch?: boolean[];
	wait?: boolean;
	rqid?: number;
}

/**
 * Interface for player move decisions
 */
export interface MoveDecision {
	type: "move";
	moveIndex: number;
}

/**
 * Interface for player switch decision
 */
export interface SwitchDecision {
	type: "switch";
	pokemonIndex: number;
}

/**
 * Union type for player decisions
 */
export type PlayerDecision = MoveDecision | SwitchDecision;

/**
 * Interface for battle turn result
 */
export interface TurnResult {
	turn: number;
	state: Readonly<BattleState>;
}

/**
 * Interface for battle end result
 */
export interface BattleEndResult {
	winner: string;
	state: Readonly<BattleState>;
}

/**
 * Interface for player move event
 */
export interface PlayerMoveEvent {
	player: "p1" | "p2";
	moveIndex: number;
}

/**
 * Interface for player request event
 */
export interface PlayerRequestEvent {
	player: "p1" | "p2";
	request: PlayerRequest;
}
