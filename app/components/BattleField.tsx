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
	const [autoSelectOpponent, setAutoSelectOpponent] = useState(true);
	const [battleTimeout, setBattleTimeout] = useState<NodeJS.Timeout | null>(
		null,
	);

	// Reset state when Pokémon change
	useEffect(() => {
		console.log("Pokemon changed, resetting state");
		setUserSelectedMove("");
		setOpponentSelectedMove("");
		setAnimationComplete(false);
	}, [userPokemon, opponentPokemon]);

	// Start animation when battle completes
	useEffect(() => {
		console.log("Battle state updated:", battleState);
		if (battleState.actions.length > 0 && !battleState.inProgress) {
			console.log("Battle completed, starting animation");
			// Simulate battle animation time
			const timer = setTimeout(() => {
				setAnimationComplete(true);
				console.log("Animation completed");
			}, 1500);

			return () => clearTimeout(timer);
		}
	}, [battleState]);

	// Auto-select opponent move when user selects a move
	useEffect(() => {
		if (
			autoSelectOpponent &&
			userSelectedMove &&
			!opponentSelectedMove &&
			!battleState.inProgress
		) {
			console.log("Auto-selecting opponent move");
			// Choose a random move for the opponent
			const randomMoveIndex = Math.floor(
				Math.random() * opponentPokemon.moves.length,
			);
			const randomMove = opponentPokemon.moves[randomMoveIndex];
			handleOpponentMoveSelect(randomMove);
		}
	}, [
		userSelectedMove,
		opponentSelectedMove,
		opponentPokemon.moves,
		autoSelectOpponent,
		battleState.inProgress,
	]);

	// Safeguard against battle getting stuck in progress
	useEffect(() => {
		if (battleState.inProgress) {
			console.log("Battle in progress, setting timeout safeguard");
			// Set a timeout to reset battle if it takes too long
			const timeout = setTimeout(() => {
				console.log("Battle timeout reached, forcing reset");
				handleReset();
			}, 10000); // 10 second timeout

			setBattleTimeout(timeout);

			return () => {
				if (timeout) clearTimeout(timeout);
			};
		} else if (battleTimeout) {
			// Clear timeout if battle is no longer in progress
			clearTimeout(battleTimeout);
			setBattleTimeout(null);
		}
	}, [battleState.inProgress]);

	const handleUserMoveSelect = (move: string) => {
		console.log("User selected move:", move);
		setUserSelectedMove(move);
		onSelectUserMove(move);
	};

	const handleOpponentMoveSelect = (move: string) => {
		console.log("Opponent selected move:", move);
		setOpponentSelectedMove(move);
		onSelectOpponentMove(move);
	};

	const handleStartBattle = () => {
		console.log(
			"Starting battle with moves:",
			userSelectedMove,
			opponentSelectedMove,
		);
		setAnimationComplete(false);
		onStartBattle();
	};

	const handleReset = () => {
		console.log("Resetting battle");
		setUserSelectedMove("");
		setOpponentSelectedMove("");
		setAnimationComplete(false);
		onReset();
	};

	const toggleAutoSelectOpponent = () => {
		setAutoSelectOpponent((prev) => !prev);
		console.log("Auto-select opponent toggle:", !autoSelectOpponent);
	};

	const renderBattleResults = () => {
		if (!battleState.actions.length) return null;

		return (
			<div className="mt-8 p-6 bg-gray-100 rounded-lg">
				<h3 className="text-xl font-bold mb-4 text-center">Turn Results</h3>

				<div className="space-y-4">
					{battleState.actions.map((action: BattleAction, idx: number) => (
						<div
							key={`${action.pokemon}-${action.move}-${idx}`}
							className="p-3 bg-white rounded shadow"
						>
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
					showMoves={!autoSelectOpponent}
					selectedMove={opponentSelectedMove}
					onSelectMove={handleOpponentMoveSelect}
					disabledMoves={
						battleInProgress || battleComplete || autoSelectOpponent
					}
					movesTitle={
						autoSelectOpponent
							? "Opponent's moves (auto-selected)"
							: "Opponent's moves"
					}
				/>
			</div>

			{/* Auto-select toggle */}
			<div className="mt-4 flex justify-center items-center">
				<label className="flex items-center cursor-pointer">
					<input
						type="checkbox"
						checked={autoSelectOpponent}
						onChange={toggleAutoSelectOpponent}
						className="sr-only"
						disabled={battleInProgress || battleComplete}
					/>
					<div
						className={`relative w-10 h-5 transition-colors duration-200 ease-linear rounded-full ${autoSelectOpponent ? "bg-green-400" : "bg-gray-400"}`}
					>
						<div
							className={`absolute left-0 w-5 h-5 transition-transform duration-200 ease-linear transform bg-white rounded-full ${autoSelectOpponent ? "translate-x-5" : "translate-x-0"}`}
						></div>
					</div>
					<span className="ml-2 text-sm font-medium">
						Auto-select opponent moves
					</span>
				</label>
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
					{battleInProgress ? "Battle in Progress..." : "Execute Turn"}
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
