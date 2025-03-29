import type { Pokemon } from "@pkmn/client";

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
 * Interface for battle options
 */
export interface BattleOptions {
    format: string;
    p1Name: string;
    p2Name: string;
    p1Team?: string;
    p2Team?: string;
    onBattleUpdate?: (state: BattleState) => void;
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
    format: string;
    turn: number;
    p1: PlayerState;
    p2: PlayerState;
    weather: string;
    status: string;
    logs: string[];
    isComplete: boolean;
    winner: string | null;
}

/**
 * Interface for player move decision
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
 * Interface for player request
 */
export interface PlayerRequest {
    active: {
        moves: MoveData[];
    }[];
    side: {
        id: string;
        name: string;
        pokemon: Pokemon[];
    };
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