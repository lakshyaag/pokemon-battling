import type { GraphicsGen } from "@pkmn/img";
import { PRNG } from "@pkmn/sim";
import type { GenerationNum, TypeName } from "@pkmn/types";

const SPRITES: { [gen in GenerationNum]: GraphicsGen } = {
	1: "gen1rg",
	2: "gen2g",
	3: "gen3rs",
	4: "gen4dp",
	5: "gen5",
	6: "ani",
	7: "ani",
	8: "ani",
	9: "ani",
};

export const getFormat = (generation: GenerationNum) =>
	`gen${generation}randombattle`;
export const getGraphics = (generation: GenerationNum) => SPRITES[generation];

// Type color mapping
export const TYPE_COLORS: Partial<Record<TypeName, string>> = {
	Normal: "bg-gray-400",
	Fire: "bg-red-500",
	Water: "bg-blue-500",
	Electric: "bg-yellow-400",
	Grass: "bg-green-500",
	Ice: "bg-blue-200",
	Fighting: "bg-red-700",
	Poison: "bg-purple-500",
	Ground: "bg-yellow-600",
	Flying: "bg-indigo-400",
	Psychic: "bg-pink-500",
	Bug: "bg-lime-500",
	Rock: "bg-yellow-800",
	Ghost: "bg-purple-700",
	Dragon: "bg-indigo-600",
	Dark: "bg-gray-800",
	Steel: "bg-gray-500",
	Fairy: "bg-pink-300",
};
