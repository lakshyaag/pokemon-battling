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

	useEffect(() => {
		const setupBattle = async () => {
			try {
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

				// Create user Pokemon object
				const userPokemonObj: PokemonWithMoves = {
					id: pokemonId,
					name: pokemonId,
					sprite: "",
					moves,
				};

				// Generate random opponent
				const opponent = await getRandomPokemon();

				setUserPokemon(userPokemonObj);
				setOpponentPokemon(opponent);
				setIsLoading(false);
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
		setUserMove(move);
	};

	/**
	 * Handle the selection of an opponent move
	 */
	const handleOpponentMoveSelect = (move: string) => {
		setOpponentMove(move);
	};

	/**
	 * Start the battle with selected moves
	 */
	const startBattle = () => {
		setBattleState((prev) => ({
			...prev,
			inProgress: true,
		}));

		// The actual battle logic is in BattleEngine component
	};

	/**
	 * Reset the battle state
	 */
	const resetBattle = () => {
		setBattleState({
			inProgress: false,
			actions: [],
			winner: null,
		});
		setUserMove("");
		setOpponentMove("");
	};

	/**
	 * Handle when battle is complete
	 */
	const handleBattleComplete = (result: BattleState) => {
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

	return (
		<div className="container mx-auto py-8 px-4">
			<h1 className="text-3xl font-bold mb-8 text-center">Pokemon Battle</h1>

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
					userPokemon={userPokemon}
					opponentPokemon={opponentPokemon}
					userMove={userMove}
					opponentMove={opponentMove}
					onBattleComplete={handleBattleComplete}
				/>
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
