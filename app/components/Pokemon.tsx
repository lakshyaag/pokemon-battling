import { useEffect, useState } from "react";
import { Sprites } from "@pkmn/img";
import type { PokemonWithMoves } from "../utils/pokemonUtils";
import { GENERATION } from "@/lib/constants";
import MoveList from "./MoveList";

type PokemonProps = {
	pokemon: PokemonWithMoves;
	side?: "user" | "opponent";
	className?: string;
	showMoves?: boolean;
	selectedMove?: string;
	onSelectMove?: (move: string) => void;
	disabledMoves?: boolean;
	movesTitle?: string;
};

/**
 * Reusable component to display a single Pokémon and optionally its moves
 */
export default function Pokemon({
	pokemon,
	side = "user",
	className = "",
	showMoves = false,
	selectedMove = "",
	onSelectMove,
	disabledMoves = false,
	movesTitle,
}: PokemonProps) {
	const [sprite, setSprite] = useState<string>("");

	useEffect(() => {
		if (pokemon.id) {
			const spriteUrl = Sprites.getPokemon(pokemon.name, {
				gen: GENERATION,
				side: side === "user" ? "p1" : "p2",
			}).url;
			setSprite(spriteUrl);
		}
	}, [pokemon, side]);

	const bgColor = side === "user" ? "bg-blue-50" : "bg-red-50";
	const defaultMovesTitle = side === "user" ? "Your Moves" : "Opponent Moves";

	const handleMoveSelect = (move: string) => {
		if (onSelectMove) {
			onSelectMove(move);
		}
	};

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

			{/* Show moves if requested */}
			{showMoves && pokemon.moves.length > 0 && (
				<MoveList
					moves={pokemon.moves}
					selectedMove={selectedMove}
					onSelectMove={handleMoveSelect}
					disabled={disabledMoves}
					title={movesTitle || defaultMovesTitle}
					className="mt-2"
				/>
			)}
		</div>
	);
}
