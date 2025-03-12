import { useState, useEffect } from "react";
import { PokemonWithMoves } from "../utils/pokemonUtils";

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
 */
export default function BattleEngine({
	userPokemon,
	opponentPokemon,
	userMove,
	opponentMove,
	onBattleComplete,
}: BattleEngineProps) {
	const [battleState, setBattleState] = useState<BattleState>({
		inProgress: false,
		actions: [],
		winner: null,
	});

	// Execute battle automatically when component mounts
	useEffect(() => {
		executeBattle();
		// We only want this to run once when the component mounts
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/**
	 * Executes a battle round with the selected moves
	 */
	const executeBattle = () => {
		// Start the battle
		setBattleState((prev) => ({
			...prev,
			inProgress: true,
			actions: [],
		}));

		// Add a delay to simulate battle calculation
		setTimeout(() => {
			// For now, we'll just simulate a battle with random outcomes
			// In a real implementation, this would use the @pkmn/sim library

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

			setBattleState(updatedState);
			onBattleComplete(updatedState);
		}, 1000); // 1 second delay for dramatic effect
	};

	// Helper function to get random effectiveness
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
