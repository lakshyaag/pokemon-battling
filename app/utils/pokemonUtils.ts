import { Generations, type Specie, type GenerationNum } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import type { PokemonData } from "../components/PokemonSelector";
import { getGraphics } from "@/lib/constants";
import type { Pokemon } from "@pkmn/client";
import { Sprites } from "@pkmn/img";

export type PokemonWithMoves = {
	pokemon: PokemonData;
	moves: string[];
};

/**
 * Generate a random Pokemon for a specific generation
 * @param generation - The generation number
 */
export async function getRandomPokemon(generation: GenerationNum): Promise<PokemonWithMoves> {
	const gens = new Generations(Dex);
	const gen = gens.get(generation);

	// Get all Pokemon
	const allPokemon = Array.from(gen.species);

	// Select a random Pokemon
	const randomIndex = Math.floor(Math.random() * allPokemon.length);
	const randomPokemon = allPokemon[randomIndex];

	// Get random moves for this Pokemon
	const moves = await getRandomMovesForPokemon(randomPokemon, generation);

	return {
		// @ts-ignore
		pokemon: randomPokemon,
		moves,
	};
}

/**
 * Get random moves for a specific Pokemon in a specific generation
 * @param pokemon - The Pokemon species
 * @param generation - The generation number
 */
export async function getRandomMovesForPokemon(
	pokemon: Specie,
	generation: GenerationNum
): Promise<string[]> {
	try {
		const gens = new Generations(Dex);
		const gen = gens.get(generation);

		// Wait for the learnsets data to load
		const learnsets = await gen.learnsets.get(pokemon.id);

		if (!learnsets) {
			throw new Error(`No learnset data found for ${pokemon.name}`);
		}

		// Get all moves for this Pokemon
		const availableMoves: string[] = [];

		for (const moveId in learnsets.learnset) {
			const sources = learnsets.learnset[moveId];
			if (sources.some((source) => source.startsWith(generation.toString()))) {
				// Get the actual move object to display proper name
				const move = gen.moves.get(moveId);
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

		return selectedMoves;
	} catch (error) {
		console.error("Error getting moves:", error);
		return [];
	}
}

/**
 * Get the sprite URL for a Pokemon
 * @param pokemon - The Pokemon data
 * @param player - The player side ("p1" or "p2")
 * @param generation - The generation number
 */
export const getSprite = (pokemon: Pokemon, player: "p1" | "p2", generation: GenerationNum) => {
	return Sprites.getPokemon(pokemon.speciesForme, {
		side: player,
		gender: pokemon.gender || undefined,
		gen: getGraphics(generation),
		shiny: pokemon.shiny,
	});
}