import { useEffect, useState } from "react";
import type { PokemonWithMoves } from "../utils/pokemonUtils";
import type {
	BattleService as BattleServiceType,
	BattleState as ServiceBattleState,
} from "../utils/battleService";
import { BattleService } from "../utils/battleService";

export type BattleAction = {
	pokemon: string;
	move: string;
	result?: string;
	effectiveness?: "not very effective" | "effective" | "super effective";
};

export type BattleState = {
	inProgress: boolean;
	actions: BattleAction[];
	winner: "user" | "opponent" | null;
};

type BattleEngineProps = {
	userPokemon: PokemonWithMoves;
	opponentPokemon: PokemonWithMoves;
	userMove: string;
	opponentMove: string;
	onBattleComplete: (battleState: BattleState) => void;
};

/**
 * Component that handles the battle logic between two Pokémon
 * This component automatically executes the battle when mounted
 * Uses the @pkmn/sim BattleService to simulate battles
 */
export default function BattleEngine({
	userPokemon,
	opponentPokemon,
	userMove,
	opponentMove,
	onBattleComplete,
}: BattleEngineProps) {
	const [battleService] = useState<BattleService>(() => {
		console.log("Creating new BattleService instance");
		return new BattleService(userPokemon, opponentPokemon);
	});

	// Execute battle automatically when component mounts
	useEffect(() => {
		console.log("BattleEngine mounted, executing battle");
		const runBattle = async () => {
			try {
				await executeBattle();
			} catch (error) {
				console.error("Battle execution failed in effect:", error);
				fallbackRandomSimulation();
			}
		};
		
		void runBattle();
		// We only want this to run once when the component mounts
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/**
	 * Executes a battle round with the selected moves
	 */
	const executeBattle = async () => {
		console.log("Executing battle with moves:", userMove, opponentMove);
		try {
			// Start the battle if not already started
			let battleState: ServiceBattleState;
			const currentState = battleService.getBattleState();

			console.log("Current battle state:", currentState);

			if (!currentState.turn) {
				console.log("Initializing new battle");
				// Initialize battle with both Pokémon
				battleState = await battleService.createBattle(
					{
						id: userPokemon.id,
						moves: userPokemon.moves,
					},
					{
						id: opponentPokemon.id,
						moves: opponentPokemon.moves,
					},
				);
				console.log("Battle initialized with state:", battleState);
			}

			// Make moves for both players
			console.log("Making moves:", userMove, opponentMove);
			battleState = await battleService.makeMove(userMove, opponentMove);
			console.log("Moves completed with state:", battleState);

			// Map the service battle state to our component state
			const mappedState = mapBattleState(battleState);
			console.log("Mapped battle state:", mappedState);

			// Update battle state
			onBattleComplete(mappedState);
		} catch (error) {
			console.error("Battle execution failed:", error);

			// Fall back to random simulation for error cases
			console.log("Falling back to random simulation");
			fallbackRandomSimulation();
		}
	};

	/**
	 * Maps the service battle state to our component battle state
	 */
	const mapBattleState = (serviceState: ServiceBattleState): BattleState => {
		console.log("Mapping service state to component state:", serviceState);
		const actions: BattleAction[] = serviceState.lastResults.map((result) => {
			console.log("Mapping result:", result);
			return {
				pokemon:
					result.user === "player" ? userPokemon.name : opponentPokemon.name,
				move: result.move,
				result: result.message,
				effectiveness: mapEffectiveness(result.effectiveness),
			};
		});

		return {
			inProgress: serviceState.inProgress,
			actions,
			winner:
				serviceState.winner === "player"
					? "user"
					: serviceState.winner === "opponent"
						? "opponent"
						: null,
		};
	};

	/**
	 * Maps service effectiveness to component effectiveness
	 */
	const mapEffectiveness = (
		effectiveness?: "super" | "resisted" | "immune" | "neutral",
	): BattleAction["effectiveness"] => {
		switch (effectiveness) {
			case "super":
				return "super effective";
			case "resisted":
				return "not very effective";
			default:
				return "effective";
		}
	};

	/**
	 * Fallback to random simulation if battle service fails
	 */
	const fallbackRandomSimulation = () => {
		console.log("Running fallback random simulation");
		// Simulate battle with random outcomes for fallback
		setTimeout(() => {
			const userAction: BattleAction = {
				pokemon: userPokemon.name,
				move: userMove,
				result: `${userPokemon.name.replace(/-/g, " ")} used ${userMove.replace(/-/g, " ")}!`,
				effectiveness: getRandomEffectiveness(),
			};

			const opponentAction: BattleAction = {
				pokemon: opponentPokemon.name,
				move: opponentMove,
				result: `${opponentPokemon.name.replace(/-/g, " ")} used ${opponentMove.replace(/-/g, " ")}!`,
				effectiveness: getRandomEffectiveness(),
			};

			// Randomly determine a winner for demonstration purposes
			const winner = Math.random() > 0.5 ? "user" : "opponent";

			// Update battle state
			const updatedState: BattleState = {
				inProgress: false,
				actions: [userAction, opponentAction],
				winner,
			};

			console.log("Fallback simulation complete with state:", updatedState);
			onBattleComplete(updatedState);
		}, 1000);
	};

	// Helper function to get random effectiveness for fallback
	const getRandomEffectiveness = () => {
		const options: BattleAction["effectiveness"][] = [
			"not very effective",
			"effective",
			"super effective",
		];
		return options[Math.floor(Math.random() * options.length)];
	};

	// This component doesn't render anything itself, it's just logic
	return null;
}
