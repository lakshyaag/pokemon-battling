import type { GraphicsGen } from "@pkmn/img";
import { PRNG } from "@pkmn/sim";
import type { GenerationNum } from "@pkmn/types";

// Keep the SPRITES definition
const SPRITES: { [gen in GenerationNum]: GraphicsGen[] } = {
	1: ["gen1rg", "gen1rb", "gen1"],
	2: ["gen2g", "gen2s", "gen2"],
	3: ["gen3rs", "gen3frlg", "gen3", "gen3-2"],
	4: ["gen4dp", "gen4dp-2", "gen4"],
	5: ["gen5", "gen5ani"],
	6: ["ani"], // Use animated sprites for Gen 6+
	7: ["ani"],
	8: ["ani"],
	9: ["ani"],
};

const prng = new PRNG();
export const getFormat = (generation: GenerationNum) => `gen${generation}randombattle`;

// Make getGraphics return GraphicsGen type for clarity
export const getGraphics = (generation: GenerationNum): GraphicsGen => {
	// Ensure generation is a valid key, fallback if necessary (though settings should prevent invalid values)
	const validGen = Math.max(1, Math.min(9, generation)) as GenerationNum;
	return prng.sample(SPRITES[validGen]);
};
