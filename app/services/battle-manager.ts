import { BattleEngine } from "./battle-engine";
import type { BattleOptions, PlayerDecision } from "./battle-types";

/**
 * Class for managing Pokemon battles
 */
export class BattleManager {
	private battles: Map<string, BattleEngine> = new Map();

	/**
	 * Create a new battle
	 * @param battleId - Unique identifier for the battle
	 * @param options - Battle options
	 * @returns The created battle engine
	 */
	createBattle(battleId: string, options: BattleOptions): BattleEngine {
		// Check if battle with this ID already exists
		if (this.battles.has(battleId)) {
			throw new Error(`Battle with ID ${battleId} already exists`);
		}

		// Create new battle engine
		const battleEngine = new BattleEngine(options);

		// Store in battles map
		this.battles.set(battleId, battleEngine);

		// Set up cleanup when battle ends
		battleEngine.on("battleEnd", () => {
			// Keep the battle for a while before removing
			setTimeout(() => {
				console.log("Removing battle", battleId);
				this.removeBattle(battleId);
			}, 60000); // 1 minute
		});

		return battleEngine;
	}

	/**
	 * Get a battle by ID
	 * @param battleId - The battle ID
	 * @returns The battle engine or undefined if not found
	 */
	getBattle(battleId: string): BattleEngine | undefined {
		return this.battles.get(battleId);
	}

	/**
	 * Remove a battle
	 * @param battleId - The battle ID
	 * @returns True if battle was removed, false if not found
	 */
	removeBattle(battleId: string): boolean {
		return this.battles.delete(battleId);
	}

	/**
	 * Get all active battle IDs
	 * @returns Array of battle IDs
	 */
	getActiveBattleIds(): string[] {
		return Array.from(this.battles.keys());
	}

	/**
	 * Start a battle
	 * @param battleId - The battle ID
	 * @param p1Team - Player 1's team
	 * @param p2Team - Player 2's team
	 */
	startBattle(battleId: string, p1Team?: string, p2Team?: string): void {
		const battle = this.getBattle(battleId);
		if (!battle) {
			throw new Error(`Battle with ID ${battleId} not found`);
		}

		battle.startBattle(p1Team, p2Team);
	}

	/**
	 * Make a move for a player
	 * @param battleId - The battle ID
	 * @param player - The player ("p1" or "p2")
	 * @param decision - The player's decision
	 */
	makePlayerMove(
		battleId: string,
		player: "p1" | "p2",
		decision: PlayerDecision,
	): void {
		const battle = this.getBattle(battleId);
		if (!battle) {
			throw new Error(`Battle with ID ${battleId} not found`);
		}

		battle.processPlayerDecision(player, decision);
	}
}
