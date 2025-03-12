import { useState } from "react";
import { PokemonWithMoves } from "../utils/pokemonUtils";
import Pokemon from "./Pokemon";
import MoveSelector from "./MoveSelector";
import { BattleState } from "./BattleEngine";

type PokemonBattleProps = {
	userPokemon: PokemonWithMoves;
	opponentPokemon: PokemonWithMoves;
	battleState?: BattleState;
};

/**
 * Component for displaying two Pokemon ready for battle (simplified version)
 */
export default function PokemonBattle({
	userPokemon,
	opponentPokemon,
	battleState = { inProgress: false, actions: [], winner: null },
}: PokemonBattleProps) {
	return (
		<div className="w-full max-w-4xl mx-auto">
			<h2 className="text-2xl font-bold mb-6 text-center">Battle Setup</h2>

			<div className="grid md:grid-cols-2 gap-8">
				{/* User Pokemon */}
				<Pokemon pokemon={userPokemon} side="user" />

				{/* Opponent Pokemon */}
				<Pokemon pokemon={opponentPokemon} side="opponent" />
			</div>

			<div className="mt-8 text-center">
				<p className="text-lg">These Pokemon are ready to battle!</p>
				<p className="text-sm text-gray-600 mt-2">
					Select their moves in the battle page to get started.
				</p>
			</div>
		</div>
	);
}
