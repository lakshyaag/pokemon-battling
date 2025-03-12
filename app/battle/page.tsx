"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getRandomPokemon } from "../utils/pokemonUtils";
import type { PokemonWithMoves } from "../utils/pokemonUtils";
import BattleField from "../components/BattleField";
import BattleEngine from "../components/BattleEngine";
import type { BattleState } from "../components/BattleEngine";

/**
 * Page for displaying the battle interface with user's Pokemon and a random opponent
 */
export default function BattlePage() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [userPokemon, setUserPokemon] = useState<PokemonWithMoves | null>(null);
	const [opponentPokemon, setOpponentPokemon] =
		useState<PokemonWithMoves | null>(null);
	const [userMove, setUserMove] = useState<string>("");
	const [opponentMove, setOpponentMove] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [battleState, setBattleState] = useState<BattleState>({
		inProgress: false,
		actions: [],
		winner: null,
	});
	const [turn, setTurn] = useState<number>(0);
	const [battleLog, setBattleLog] = useState<BattleState[]>([]);
	const [battleEngineKey, setBattleEngineKey] = useState<number>(0);

	useEffect(() => {
		const setupBattle = async () => {
			try {
				console.log("Setting up battle");
				setIsLoading(true);

				// Get user's Pokemon from URL parameters
				const pokemonId = searchParams.get("pokemon");
				const movesParam = searchParams.get("moves");

				if (!pokemonId || !movesParam) {
					throw new Error(
						"Pokemon selection is missing. Please select a Pokemon first.",
					);
				}

				const moves = decodeURIComponent(movesParam).split(",");
				console.log("User Pokemon:", pokemonId, "Moves:", moves);

				// Create user Pokemon object
				const userPokemonObj: PokemonWithMoves = {
					id: pokemonId,
					name: pokemonId,
					sprite: "",
					moves,
				};

				// Generate random opponent
				console.log("Generating random opponent");
				const opponent = await getRandomPokemon();
				console.log("Opponent generated:", opponent);

				setUserPokemon(userPokemonObj);
				setOpponentPokemon(opponent);
				setTurn(1);
				setIsLoading(false);
				console.log("Battle setup complete");
			} catch (err) {
				console.error("Failed to set up battle:", err);
				setError(
					err instanceof Error ? err.message : "An unknown error occurred",
				);
				setIsLoading(false);
			}
		};

		setupBattle();
	}, [searchParams]);

	/**
	 * Handle the selection of a user move
	 */
	const handleUserMoveSelect = (move: string) => {
		console.log("User selected move:", move);
		setUserMove(move);
	};

	/**
	 * Handle the selection of an opponent move
	 */
	const handleOpponentMoveSelect = (move: string) => {
		console.log("Opponent selected move:", move);
		setOpponentMove(move);
	};

	/**
	 * Start the battle with selected moves
	 */
	const startBattle = () => {
		console.log("Starting battle with moves - User:", userMove, "Opponent:", opponentMove);
		setBattleState((prev) => ({
			...prev,
			inProgress: true,
		}));
		
		// This re-mounts the BattleEngine component
		setBattleEngineKey(prevKey => prevKey + 1);
	};

	/**
	 * Continue to the next turn
	 */
	const nextTurn = () => {
		if (battleState.winner) {
			console.log("Battle already has winner, cannot proceed to next turn");
			return; // Battle is over
		}

		console.log("Proceeding to next turn");
		
		// Increment turn counter
		setTurn(prevTurn => prevTurn + 1);
		
		// Reset moves
		setUserMove("");
		setOpponentMove("");
		
		// Save current state to battle log
		setBattleLog(prev => [...prev, battleState]);
		
		// Reset battle state for next turn
		setBattleState({
			inProgress: false,
			actions: [],
			winner: null,
		});
		
		console.log("Ready for next turn");
	};

	/**
	 * Reset the battle state
	 */
	const resetBattle = () => {
		console.log("Resetting battle state");
		setBattleState({
			inProgress: false,
			actions: [],
			winner: null,
		});
		setUserMove("");
		setOpponentMove("");
		setBattleLog([]);
		setTurn(1);
		
		// This re-mounts the BattleEngine component
		setBattleEngineKey(prevKey => prevKey + 1);
		console.log("Battle reset complete");
	};

	/**
	 * Handle when battle is complete
	 */
	const handleBattleComplete = (result: BattleState) => {
		console.log("Battle completed with result:", result);
		setBattleState(result);
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-16 px-4 text-center">
				<h1 className="text-2xl font-bold mb-4">Setting Up Battle</h1>
				<p>Loading Pokemon data...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto py-16 px-4 text-center">
				<h1 className="text-2xl font-bold mb-4">Error</h1>
				<p className="text-red-500 mb-4">{error}</p>
				<Link
					href="/"
					className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					Go Back to Selection
				</Link>
			</div>
		);
	}

	if (!userPokemon || !opponentPokemon) {
		return (
			<div className="container mx-auto py-16 px-4 text-center">
				<h1 className="text-2xl font-bold mb-4">Something Went Wrong</h1>
				<p className="mb-4">Failed to load Pokemon data.</p>
				<Link
					href="/"
					className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					Go Back to Selection
				</Link>
			</div>
		);
	}

	const battleComplete = battleState.actions.length > 0 && !battleState.inProgress;

	return (
		<div className="container mx-auto py-8 px-4">
			<h1 className="text-3xl font-bold mb-2 text-center">Pokemon Battle</h1>
			<div className="text-center mb-6">
				<span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 rounded-full text-sm font-medium">
					Turn {turn}
				</span>
			</div>

			{/* Battle Field Component */}
			<BattleField
				userPokemon={userPokemon}
				opponentPokemon={opponentPokemon}
				battleState={battleState}
				onSelectUserMove={handleUserMoveSelect}
				onSelectOpponentMove={handleOpponentMoveSelect}
				onStartBattle={startBattle}
				onReset={resetBattle}
			/>

			{/* Battle Engine - Logic only, no UI */}
			{battleState.inProgress && (
				<BattleEngine
					key={battleEngineKey}
					userPokemon={userPokemon}
					opponentPokemon={opponentPokemon}
					userMove={userMove}
					opponentMove={opponentMove}
					onBattleComplete={handleBattleComplete}
				/>
			)}

			{/* Next Turn Button */}
			{battleComplete && !battleState.winner && (
				<div className="mt-6 flex justify-center">
					<button
						onClick={nextTurn}
						className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Next Turn
					</button>
				</div>
			)}

			{/* Battle Log */}
			{battleLog.length > 0 && (
				<div className="mt-8 p-4 border border-gray-200 rounded-lg">
					<h3 className="text-xl font-semibold mb-3">Battle Log</h3>
					<div className="space-y-4">
						{battleLog.map((turn, index) => (
							<div key={`turn-${index + 1}`} className="p-3 bg-gray-50 rounded-md">
								<h4 className="font-medium mb-2">Turn {index + 1}</h4>
								<div className="space-y-2">
									{turn.actions.map((action, actionIndex) => (
										<p key={`action-${index}-${actionIndex}`}>{action.result}</p>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="mt-8 flex justify-center">
				<Link
					href="/"
					className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					Choose Different Pokemon
				</Link>
			</div>
		</div>
	);
}
