import type { BattleState, PlayerRequest } from "./battle-types";

/**
 * Type-safe event map for battle events
 */
export interface BattleEventMap {
    stateUpdate: Readonly<BattleState>;
    battleStart: Readonly<BattleState>;
    battleEnd: { winner: string; state: Readonly<BattleState> };
    turnStart: number;
    turnComplete: number;
    playerMove: { player: "p1" | "p2"; moveIndex: number };
    playerRequest: { player: "p1" | "p2"; request: PlayerRequest };
}

/**
 * Simple event emitter for battle events
 */
export class BattleEventEmitter {
    private events: Record<string, Array<(data: unknown) => void>> = {};

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
        // Type assertion here is necessary because we maintain type safety through the generic
        return this.addListener(event, listener as (data: unknown) => void);
    }

    /**
     * Internal method to add a listener
     */
    private addListener(event: string, listener: (data: unknown) => void): () => void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);

        // Return unsubscribe function
        return () => {
            this.events[event] = this.events[event].filter(l => l !== listener);
        };
    }

    /**
     * Emit an event with type safety
     * @param event - The event name
     * @param data - The event data
     */
    emit<K extends keyof BattleEventMap>(event: K, data?: BattleEventMap[K]): void {
        if (!this.events[event]) return;

        for (const listener of this.events[event]) {
            try {
                listener(data as unknown);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        }
    }

    /**
     * Remove all listeners for an event
     * @param event - The event name (optional, if not provided, removes all listeners)
     */
    removeAllListeners(event?: string): void {
        if (event) {
            this.events[event] = [];
        } else {
            this.events = {};
        }
    }
} 