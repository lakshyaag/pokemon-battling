import { useEffect, useState } from "react";
import { Sprites } from "@pkmn/img";
import { PokemonWithMoves } from "../utils/pokemonUtils";

type PokemonProps = {
	pokemon: PokemonWithMoves;
	side?: "user" | "opponent";
	className?: string;
};

/**
 * Reusable component to display a single Pokémon
 */
export default function Pokemon({
	pokemon,
	side = "user",
	className = "",
}: PokemonProps) {
	const [sprite, setSprite] = useState<string>("");

	useEffect(() => {
		if (pokemon.id) {
			const spriteUrl = Sprites.getPokemon(pokemon.name, { gen: 1 }).url;
			setSprite(spriteUrl);
		}
	}, [pokemon]);

	const bgColor = side === "user" ? "bg-blue-50" : "bg-red-50";

	return (
		<div className={`border rounded-lg p-4 ${bgColor} ${className}`}>
			<div className="text-center mb-4">
				<h3 className="text-xl font-semibold">
					{side === "user" ? "Your Pokemon" : "Opponent Pokemon"}
				</h3>
			</div>

			<div className="flex flex-col items-center mb-4">
				{sprite && (
					<img
						src={sprite}
						alt={pokemon.name}
						className="w-32 h-32 object-contain"
						onError={(e) => {
							const target = e.target as HTMLImageElement;
							target.src =
								"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
						}}
					/>
				)}
				<p className="text-lg font-medium mt-2 capitalize">
					{pokemon.name.replace(/-/g, " ")}
				</p>
			</div>
		</div>
	);
}
