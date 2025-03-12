import { useState, useEffect } from "react";
import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import { Sprites } from "@pkmn/img";

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

				// Get Gen 1 data
				const gen1 = gens.get(1);

				// Get all Gen 1 Pokemon
				const pokemonList = Array.from(gen1.species)
					.map((species) => {
						// Get sprite URL using @pkmn/img
						const spriteUrl = Sprites.getPokemon(species.name, {
							gen: 1,
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
		setIsLoadingMoves(true);
		try {
			// Initialize the generations using the Dex
			const gens = new Generations(Dex);

			// Get Gen 1 data
			const gen1 = gens.get(1);

			// Get learnset data for the selected Pokemon
			const pokemon = gen1.species.get(pokemonId);
			if (!pokemon) {
				throw new Error(`Pokemon ${pokemonId} not found`);
			}

			// Wait for the learnsets data to load
			const learnsets = await gen1.learnsets.get(pokemon.id);

			if (!learnsets) {
				throw new Error(`No learnset data found for ${pokemon.name}`);
			}

			// Get all moves for this Pokemon in Gen 1
			const availableMoves: string[] = [];

			// Filter for gen1 moves (entries with '1L', '1M', '1T', etc. in their source)
			for (const moveId in learnsets.learnset) {
				const sources = learnsets.learnset[moveId];
				if (sources.some((source) => source.startsWith("1"))) {
					// Get the actual move object to display proper name
					const move = gen1.moves.get(moveId);
					if (move) {
						availableMoves.push(move.name);
					}
				}
			}

			// If we have less than 4 moves, use all of them
			// Otherwise, randomly select 4 moves
			let selectedMoves: string[];
			if (availableMoves.length <= 4) {
				selectedMoves = [...availableMoves];
			} else {
				selectedMoves = [];
				const movesCopy = [...availableMoves];

				while (selectedMoves.length < 4 && movesCopy.length > 0) {
					const randomIndex = Math.floor(Math.random() * movesCopy.length);
					selectedMoves.push(movesCopy[randomIndex]);
					movesCopy.splice(randomIndex, 1);
				}
			}

			setSelectedMoves(selectedMoves);
			onSelect(pokemonId, selectedMoves);
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

			{selectedPokemon && (
				<div className="mt-6">
					<div className="flex items-center mb-4">
						{allPokemon.find((p) => p.id === selectedPokemon) && (
							<img
								src={allPokemon.find((p) => p.id === selectedPokemon)?.sprite}
								alt={selectedPokemon}
								className="w-16 h-16 mr-4"
								onError={(e) => {
									const target = e.target as HTMLImageElement;
									target.src =
										"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
								}}
							/>
						)}
						<h3 className="text-lg font-semibold">
							{allPokemon
								.find((p) => p.id === selectedPokemon)
								?.name.replace(/-/g, " ")}
						</h3>
					</div>

					<div>
						<h4 className="font-medium mb-2">Random Moves:</h4>
						{isLoadingMoves ? (
							<p className="text-sm italic">Loading moves...</p>
						) : (
							<ul className="list-disc pl-5">
								{selectedMoves.map((move, index) => (
									<li key={index} className="text-sm mb-1 capitalize">
										{move.replace(/-/g, " ")}
									</li>
								))}
								{selectedMoves.length === 0 && (
									<li className="text-sm italic">No moves available</li>
								)}
							</ul>
						)}
					</div>

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
