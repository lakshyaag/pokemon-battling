import { useState, useEffect } from "react";
import type { PokemonWithMoves } from "../utils/pokemonUtils";
import Pokemon from "./Pokemon";
import type { BattleAction, BattleState } from "./BattleEngine";

type BattleFieldProps = {
	userPokemon: PokemonWithMoves;
	opponentPokemon: PokemonWithMoves;
	battleState: BattleState;
	onSelectUserMove: (move: string) => void;
	onSelectOpponentMove: (move: string) => void;
	onStartBattle: () => void;
	onReset: () => void;
};

/**
 * Component that displays the battle field with two Pokémon and controls
 */
export default function BattleField({
	userPokemon,
	opponentPokemon,
	battleState,
	onSelectUserMove,
	onSelectOpponentMove,
	onStartBattle,
	onReset,
}: BattleFieldProps) {
	const [userSelectedMove, setUserSelectedMove] = useState<string>("");
	const [opponentSelectedMove, setOpponentSelectedMove] = useState<string>("");
	const [animationComplete, setAnimationComplete] = useState(false);

	// Reset state when Pokémon change
	useEffect(() => {
		setUserSelectedMove("");
		setOpponentSelectedMove("");
		setAnimationComplete(false);
	}, []);

	// Start animation when battle completes
	useEffect(() => {
		if (battleState.actions.length > 0 && !battleState.inProgress) {
			// Simulate battle animation time
			const timer = setTimeout(() => {
				setAnimationComplete(true);
			}, 1500);

			return () => clearTimeout(timer);
		}
	}, [battleState]);

	const handleUserMoveSelect = (move: string) => {
		setUserSelectedMove(move);
		onSelectUserMove(move);
	};

	const handleOpponentMoveSelect = (move: string) => {
		setOpponentSelectedMove(move);
		onSelectOpponentMove(move);
	};

	const handleStartBattle = () => {
		setAnimationComplete(false);
		onStartBattle();
	};

	const handleReset = () => {
		setUserSelectedMove("");
		setOpponentSelectedMove("");
		setAnimationComplete(false);
		onReset();
	};

	const renderBattleResults = () => {
		if (!battleState.actions.length) return null;

		return (
			<div className="mt-8 p-6 bg-gray-100 rounded-lg">
				<h3 className="text-xl font-bold mb-4 text-center">Battle Results</h3>

				<div className="space-y-4">
					{battleState.actions.map((action: BattleAction, idx: number) => (
						<div key={`${action.pokemon}-${action.move}-${idx}`} className="p-3 bg-white rounded shadow">
							<p>{action.result}</p>
							{action.effectiveness && (
								<p
									className={`mt-1 ${getEffectivenessColor(action.effectiveness)}`}
								>
									It's {action.effectiveness}!
								</p>
							)}
						</div>
					))}

					{battleState.winner && animationComplete && (
						<div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-center">
							<p className="text-lg font-bold">
								{battleState.winner === "user"
									? `${userPokemon.name.replace(/-/g, " ")} wins!`
									: `${opponentPokemon.name.replace(/-/g, " ")} wins!`}
							</p>
						</div>
					)}
				</div>
			</div>
		);
	};

	// Helper function to get color class based on effectiveness
	const getEffectivenessColor = (effectiveness: string): string => {
		switch (effectiveness) {
			case "super effective":
				return "text-green-600 font-semibold";
			case "not very effective":
				return "text-red-600";
			default:
				return "text-gray-700";
		}
	};

	const battleInProgress = battleState.inProgress;
	const battleComplete =
		battleState.actions.length > 0 && !battleState.inProgress;

	return (
		<div className="w-full max-w-4xl mx-auto">
			<div className="grid md:grid-cols-2 gap-8">
				{/* User Pokemon Side with integrated moves */}
				<Pokemon 
					pokemon={userPokemon} 
					side="user" 
					showMoves={true}
					selectedMove={userSelectedMove}
					onSelectMove={handleUserMoveSelect}
					disabledMoves={battleInProgress || battleComplete}
				/>

				{/* Opponent Pokemon Side with integrated moves */}
				<Pokemon 
					pokemon={opponentPokemon} 
					side="opponent" 
					showMoves={true}
					selectedMove={opponentSelectedMove}
					onSelectMove={handleOpponentMoveSelect}
					disabledMoves={battleInProgress || battleComplete}
				/>
			</div>

			{/* Battle Controls */}
			<div className="mt-8 flex justify-center space-x-4">
				<button
					type="button"
					onClick={handleStartBattle}
					disabled={
						!userSelectedMove ||
						!opponentSelectedMove ||
						battleInProgress ||
						battleComplete
					}
					className={`
            px-6 py-2 rounded-md text-white font-medium
            ${
							!userSelectedMove ||
							!opponentSelectedMove ||
							battleInProgress ||
							battleComplete
								? "bg-gray-400 cursor-not-allowed"
								: "bg-green-600 hover:bg-green-700"
						}
          `}
				>
					{battleInProgress ? "Battle in Progress..." : "Start Battle"}
				</button>

				<button
					type="button"
					onClick={handleReset}
					disabled={battleInProgress}
					className={`
            px-6 py-2 rounded-md font-medium
            ${
							battleInProgress
								? "bg-gray-400 text-white cursor-not-allowed"
								: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
						}
          `}
				>
					Reset
				</button>
			</div>

			{/* Battle Results */}
			{renderBattleResults()}
		</div>
	);
}
