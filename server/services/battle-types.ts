import type { Pokemon, Battle, ID } from "@pkmn/sim";
import type { Args } from "@pkmn/protocol";

/**
 * Interface for move data in a request
 */
export interface MoveData {
	id: ID;
	move: string;
	pp: number;
	maxpp: number;
	target?: string;
	disabled?: boolean;
}

/**
 * Interface for battle options
 */
export interface BattleOptions {
	format: string;
	p1Name: string;
	p2Name: string;
	p1Team?: string;
	p2Team?: string;
	debug?: boolean;
}

/**
 * Interface for player state in battle
 */
export interface PlayerState {
	name: string;
	active: Pokemon | null;
	team: Pokemon[];
	request: PlayerRequest | null;
	selectedMove: PlayerDecision | null;
}

/**
 * Interface for battle state - mainly used for debugging and testing
 */
export interface BattleState {
	battle: Battle;
	logs: string[];
	p1Request: PlayerRequest | null;
	p2Request: PlayerRequest | null;
}

/**
 * Interface for player request from the battle stream
 */
export interface PlayerRequest {
	active?: Array<{
		moves: Array<{
			id: ID;
			move: string;
			pp: number;
			maxpp: number;
			target: string;
			disabled?: boolean;
		}>;
		trapped?: boolean;
		maybeTrapped?: boolean;
		canSwitch?: boolean | number[];
	}>;
	side: {
		name: string;
		id: ID;
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
			moves: ID[];
			baseAbility: ID;
			item: ID;
			pokeball: string;
			ability: ID;
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
	targetIndex?: number; // For moves that require a target
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
 * Type for protocol line handlers
 */
export type ProtocolLineHandler = (lines: string[]) => void;

/**
 * Type for request handlers
 */
export type RequestHandler = (request: PlayerRequest) => void;

/**
 * Type for player identifiers
 */
export type PlayerId = "p1" | "p2";

/**
 * Type for protocol line types
 */
export type ProtocolLineType = "omniscient" | PlayerId;

/**
 * Type for battle protocol args from @pkmn/protocol
 */
export type BattleProtocolArgs = Args;
