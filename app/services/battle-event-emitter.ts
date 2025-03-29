import type { Battle } from "@pkmn/client";
import type { BattleState, PlayerRequest } from "./battle-types";

/**
 * Type-safe event map for battle events
 */
export interface BattleEventMap {
    stateUpdate: BattleState;
    battleStart: Battle;
    battleEnd: { winner: string | null; state: Battle };
    playerRequest: { player: "p1" | "p2"; request: PlayerRequest };
    playerMove: { player: "p1" | "p2"; moveIndex: number };
    playerSwitch: { player: "p1" | "p2"; pokemonIndex: number };
}

/**
 * Simple event emitter for battle events
 */
export class BattleEventEmitter {
    private events: { [K in keyof BattleEventMap]?: Array<(data: BattleEventMap[K]) => void> } = {};

    /**
     * Register an event listener with type safety
     * @param event - The event name
     * @param listener - The event listener function
     * @returns A function to unsubscribe
     */
    on<K extends keyof BattleEventMap>(
        event: K,
        listener: (data: BattleEventMap[K]) => void
    ): () => void {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event]?.push(listener);

        return () => {
            if (this.events[event]) {
                this.events[event] = this.events[event]?.filter((l) => l !== listener);
            }
        };
    }

    /**
     * Emit an event with type safety
     * @param event - The event name
     * @param data - The event data
     */
    emit<K extends keyof BattleEventMap>(event: K, data?: BattleEventMap[K]): void {
        if (!this.events[event]) return;

        for (const listener of this.events[event] || []) {
            try {
                listener(data as BattleEventMap[K]);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        }
    }

    /**
     * Remove all listeners for an event
     * @param event - The event name (optional, if not provided, removes all listeners)
     */
    removeAllListeners(event?: keyof BattleEventMap): void {
        if (event) {
            this.events[event] = [];
        } else {
            this.events = {};
        }
    }
} 