import type { GenerationNum } from "@pkmn/types";

export const TYPE_COLORS = {
	normal: "bg-gray-400 hover:bg-gray-500 text-white",
	fire: "bg-red-500 hover:bg-red-600 text-white",
	water: "bg-blue-500 hover:bg-blue-600 text-white",
	electric: "bg-yellow-400 hover:bg-yellow-500 text-black",
	grass: "bg-emerald-500 hover:bg-emerald-600 text-white",
	ice: "bg-cyan-400 hover:bg-cyan-500 text-black",
	fighting: "bg-red-700 hover:bg-red-800 text-white",
	poison: "bg-purple-500 hover:bg-purple-600 text-white",
	ground: "bg-amber-700 hover:bg-amber-800 text-white",
	flying: "bg-sky-400 hover:bg-sky-500 text-white",
	psychic: "bg-pink-500 hover:bg-pink-600 text-white",
	bug: "bg-lime-500 hover:bg-lime-600 text-white",
	rock: "bg-stone-600 hover:bg-stone-700 text-white",
	ghost: "bg-purple-700 hover:bg-purple-800 text-white",
	dragon: "bg-violet-600 hover:bg-violet-700 text-white",
	dark: "bg-neutral-800 hover:bg-neutral-900 text-white",
	steel: "bg-slate-500 hover:bg-slate-600 text-white",
	fairy: "bg-pink-300 hover:bg-pink-400 text-black",
} as const;

export const getFormat = (generation: GenerationNum): string => {
	return `gen${generation}randombattle`;
};

export const getGraphics = (generation: GenerationNum): string => {
	return generation <= 4 ? `gen${generation}` : "gen5ani";
};
