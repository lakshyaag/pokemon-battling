import type { TypeName } from "@pkmn/types";

export const GENERATION = 3;
export const FORMAT = `gen${GENERATION}randombattle`;
export const GRAPHICS = 'gen3rs';

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