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
 * Simple event emitter with type safety
 * @template T - Record mapping event names to their data types
 */
export class BattleEventEmitter<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	private events: {
		[K in keyof T]?: Array<(data: T[K]) => void>;
	} = {};

	/**
	 * Register an event listener with type safety
	 * @param event - The event name (key of T)
	 * @param listener - The event listener function
	 * @returns A function to unsubscribe
	 */
	on<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void {
		if (!this.events[event]) {
			this.events[event] = [];
		}

		const listeners = this.events[event];
		if (listeners) {
			// Type assertion needed due to TypeScript's limitations with arrays and callbacks
			(listeners as Array<(data: T[K]) => void>).push(listener);
		}

		return () => {
			const currentListeners = this.events[event];
			if (currentListeners) {
				// Filter out the specific listener instance
				this.events[event] = currentListeners.filter(
					(l) => l !== listener,
				) as Array<(data: T[K]) => void>;
			}
		};
	}

	/**
	 * Emit an event with type safety
	 * @param event - The event name (key of T)
	 * @param data - The event data (type T[K])
	 */
	emit<K extends keyof T>(
		event: K,
		...args: T[K] extends undefined ? [data?: T[K]] : [data: T[K]]
	): void {
		const data = args[0];
		const listeners = this.events[event];
		if (!listeners?.length) return;

		// Create a copy of listeners array to prevent modification during iteration
		const currentListeners = [...listeners];

		for (const listener of currentListeners) {
			try {
				// Type assertion needed due to TypeScript's limitations with arrays and callbacks
				(listener as (data: T[K]) => void)(data as T[K]);
			} catch (error) {
				console.error(`Error in event listener for ${String(event)}:`, error);
			}
		}
	}

	/**
	 * Remove all listeners for an event or all events
	 * @param event - The event name (optional, key of T)
	 */
	removeAllListeners(event?: keyof T): void {
		if (event) {
			delete this.events[event];
		} else {
			this.events = {};
		}
	}
}
