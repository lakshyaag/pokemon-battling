import { GENERATION } from "@/lib/constants";
import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import type { PokemonData } from "../components/PokemonSelector";

export type PokemonWithMoves = {
	pokemon: PokemonData;
	moves: string[];
};

/**
 * Generate a random Pokemon from Gen 1
 */
export async function getRandomPokemon(): Promise<PokemonWithMoves> {
	const gens = new Generations(Dex);
	const gen = gens.get(GENERATION);

	// Get all Pokemon
	const allPokemon = Array.from(gen.species);

	// Select a random Pokemon
	const randomIndex = Math.floor(Math.random() * allPokemon.length);
	const randomPokemon = allPokemon[randomIndex];

	// Get random moves for this Pokemon
	const moves = await getRandomMovesForPokemon(randomPokemon.id);

	return {
		// @ts-ignore
		pokemon: randomPokemon,
		moves,
	};
}

/**
 * Get random moves for a specific Pokemon
 */
export async function getRandomMovesForPokemon(
	pokemonId: string,
): Promise<string[]> {
	try {
		const gens = new Generations(Dex);
		const gen = gens.get(GENERATION);

		// Get learnset data for the Pokemon
		const pokemon = gen.species.get(pokemonId);
		if (!pokemon) {
			throw new Error(`Pokemon ${pokemonId} not found`);
		}

		// Wait for the learnsets data to load
		const learnsets = await gen.learnsets.get(pokemon.id);

		if (!learnsets) {
			throw new Error(`No learnset data found for ${pokemon.name}`);
		}

		// Get all moves for this Pokemon in Gen 1
		const availableMoves: string[] = [];

		for (const moveId in learnsets.learnset) {
			const sources = learnsets.learnset[moveId];
			if (sources.some((source) => source.startsWith(GENERATION.toString()))) {
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
