import { useState, useEffect } from "react";
import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import { Sprites } from "@pkmn/img";
import { GENERATION } from "@/lib/constants";
import { getRandomMovesForPokemon } from "../utils/pokemonUtils";
import Pokemon from "./Pokemon";

type PokemonSelectorProps = {
	onSelect: (pokemon: string, moves: string[]) => void;
};

type PokemonData = {
	id: string;
	name: string;
	sprite: string;
	moves: string[];
};

/**
 * Component for selecting a single Pokemon from Gen 1
 */
export default function PokemonSelector({ onSelect }: PokemonSelectorProps) {
	const [allPokemon, setAllPokemon] = useState<PokemonData[]>([]);
	const [selectedPokemon, setSelectedPokemon] = useState<string>("");
	const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMoves, setIsLoadingMoves] = useState(false);

	useEffect(() => {
		// Initialize the generations using the Dex
		const fetchPokemonData = async () => {
			try {
				const gens = new Generations(Dex);

				const gen = gens.get(GENERATION);

				// Get all Pokemon
				const pokemonList = Array.from(gen.species)
					.map((species) => {
						// Get sprite URL using @pkmn/img
						const spriteUrl = Sprites.getPokemon(species.name, {
							gen: GENERATION,
						}).url;

						return {
							id: species.id,
							name: species.name,
							sprite: spriteUrl,
							moves: [],
						};
					})

					.sort((a, b) => a.name.localeCompare(b.name));

				setAllPokemon(pokemonList);
				setIsLoading(false);
			} catch (error) {
				console.error("Error loading Pokemon data:", error);
				setIsLoading(false);
			}
		};

		fetchPokemonData();
	}, []);

	const getRandomMoves = async (pokemonId: string) => {
		try {
			const moves = await getRandomMovesForPokemon(pokemonId);

			setSelectedMoves(moves);
			onSelect(pokemonId, moves);
			setIsLoadingMoves(false);
		} catch (error) {
			console.error("Error getting moves:", error);
			setSelectedMoves([]);
			onSelect(pokemonId, []);
			setIsLoadingMoves(false);
		}
	};

	const handleSelectChange = async (
		e: React.ChangeEvent<HTMLSelectElement>,
	) => {
		const pokemonId = e.target.value;
		setSelectedPokemon(pokemonId);

		if (pokemonId) {
			await getRandomMoves(pokemonId);
		} else {
			setSelectedMoves([]);
			onSelect("", []);
		}
	};

	if (isLoading) {
		return <div className="p-4 text-center">Loading Pokemon data...</div>;
	}

	// Find the selected Pokemon object
	const selectedPokemonData = selectedPokemon
		? allPokemon.find((p) => p.id === selectedPokemon)
		: null;

	return (
		<div className="w-full p-4">
			<div className="mb-6">
				<label
					htmlFor="pokemon-select"
					className="block text-sm font-medium mb-2"
				>
					Select a Pokemon
				</label>

				<div className="relative">
					<select
						id="pokemon-select"
						value={selectedPokemon}
						onChange={handleSelectChange}
						className="block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500"
						disabled={isLoading}
					>
						<option value="">Select a Pokemon...</option>
						{allPokemon.map((pokemon) => (
							<option key={pokemon.id} value={pokemon.id}>
								{pokemon.name.replace(/-/g, " ")}
							</option>
						))}
					</select>
				</div>
			</div>

			{selectedPokemonData && (
				<div className="mt-6">
					{/* Use the Pokemon component to display the selected Pokemon with moves */}
					<Pokemon
						pokemon={{
							id: selectedPokemonData.id,
							name: selectedPokemonData.name,
							sprite: selectedPokemonData.sprite,
							moves: selectedMoves,
						}}
						className="mb-4"
						showMoves={true}
						disabledMoves={isLoadingMoves}
					/>

					<button
						type="button"
						onClick={() => getRandomMoves(selectedPokemon)}
						className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
						disabled={isLoadingMoves || !selectedPokemon}
					>
						Regenerate Moves
					</button>
				</div>
			)}
		</div>
	);
}
