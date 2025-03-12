"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PokemonSelector from "../components/PokemonSelector";

/**
 * Page for selecting a Pokemon to battle with
 */
export default function SelectPokemonPage() {
	const router = useRouter();
	const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
	const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const handleSelectPokemon = (pokemonId: string, moves: string[]) => {
		setSelectedPokemon(pokemonId);
		setSelectedMoves(moves);
	};

	const handleContinue = () => {
		if (selectedPokemon) {
			setIsLoading(true);

			// Redirect to the battle page with the selected Pokemon and moves
			const movesParam = encodeURIComponent(selectedMoves.join(","));
			router.push(`/battle?pokemon=${selectedPokemon}&moves=${movesParam}`);
		}
	};

	return (
		<main className="container mx-auto py-8 px-4">
			<h1 className="text-3xl font-bold mb-6">Select Your Pokemon</h1>
			<p className="mb-6 text-gray-600">
				Choose one Pokemon from Generation 1 to use in your battle. You'll get 4
				random moves from its moveset.
			</p>

			<PokemonSelector onSelect={handleSelectPokemon} />

			<div className="mt-8 flex justify-end">
				<button
					type="button"
					onClick={handleContinue}
					disabled={!selectedPokemon || isLoading}
					className={`px-6 py-2 rounded-md ${
						selectedPokemon && !isLoading
							? "bg-blue-600 hover:bg-blue-700 text-white"
							: "bg-gray-300 text-gray-500 cursor-not-allowed"
					}`}
				>
					{isLoading ? "Setting up battle..." : "Battle!"}
				</button>
			</div>
		</main>
	);
}
