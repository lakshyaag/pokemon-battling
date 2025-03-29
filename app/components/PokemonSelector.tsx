import { useState, useEffect, useMemo, useCallback } from "react";
import { Generations, type Specie } from "@pkmn/data";
import { Teams } from "@pkmn/sim";
import { Dex } from "@pkmn/dex";
import { Sprites } from "@pkmn/img";
import { TYPE_COLORS } from "@/lib/constants";
import { getRandomMovesForPokemon } from "../utils/pokemonUtils";
import PokemonCard from "./PokemonCard";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords } from "lucide-react";
import { useBattleStore } from "@/app/store/battle-store";
import { useRouter } from "next/navigation";
import { useSettings } from "@/app/store/settings";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type PokemonData = Specie & {
	sprite: string;
};

/**
 * Component for selecting a single Pokemon
 */
export default function PokemonSelector() {
	const router = useRouter();
	const {
		setSelectedPokemon,
		setSelectedMoves,
		selectedMoves,
		selectedPokemon,
		setOpponentPokemon,
		setOpponentMoves,
		setP1Team,
		setP2Team,
	} = useBattleStore();
	const [allPokemon, setAllPokemon] = useState<PokemonData[]>([]);
	const [selectedPokemonId, setSelectedPokemonId] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMoves, setIsLoadingMoves] = useState(false);
	const [isStartingBattle, setIsStartingBattle] = useState(false);
	const { generation } = useSettings();

	// Memoize the sorted Pokemon list
	const sortedPokemon = useMemo(() => {
		return [...allPokemon].sort((a, b) => a.num - b.num);
	}, [allPokemon]);

	useEffect(() => {
		// Initialize the generations using the Dex
		const fetchPokemonData = async () => {
			try {
				const gens = new Generations(Dex);
				const gen = gens.get(generation);

				// Get all Pokemon from the selected generation
				const pokemonList = Array.from(gen.species).map((species) => {
					// Get sprite URL using @pkmn/img
					const spriteUrl = Sprites.getPokemon(species.name, {
						gen: generation,
						side: "p2",
					}).url;

					return {
						...species,
						sprite: spriteUrl,
					};
				});

				// @ts-ignore
				setAllPokemon(pokemonList);
				setIsLoading(false);
			} catch (error) {
				console.error("Error loading Pokemon data:", error);
				setIsLoading(false);
			}
		};

		fetchPokemonData();
	}, [generation]);

	const getRandomMoves = useCallback(
		async (pokemonId: string) => {
			setIsLoadingMoves(true);
			try {
				const pokemon = allPokemon.find((p) => p.id === pokemonId);
				if (!pokemon) {
					throw new Error(`Pokemon ${pokemonId} not found`);
				}
				const moves = await getRandomMovesForPokemon(pokemon, generation);

				if (pokemon) {
					setSelectedMoves(moves);
					setSelectedPokemon(pokemon);
				}
			} catch (error) {
				console.error("Error getting moves:", error);
				setSelectedMoves([]);
				setSelectedPokemon(null);
			} finally {
				setIsLoadingMoves(false);
			}
		},
		[allPokemon, setSelectedMoves, setSelectedPokemon, generation],
	);

	const handleSelectChange = useCallback(
		async (value: string) => {
			setSelectedPokemonId(value);

			if (value) {
				await getRandomMoves(value);
			} else {
				setSelectedMoves([]);
				setSelectedPokemon(null);
			}
		},
		[getRandomMoves, setSelectedMoves, setSelectedPokemon],
	);

	const handleStartBattle = useCallback(async () => {
		if (!selectedPokemon) return;

		setIsStartingBattle(true);
		try {
			// Select a random opponent
			const availablePokemon = allPokemon.filter(
				(p) => p.id !== selectedPokemon.id,
			);
			const randomOpponent =
				availablePokemon[Math.floor(Math.random() * availablePokemon.length)];

			// Get moves for the opponent
			const opponentMoves = await getRandomMovesForPokemon(randomOpponent, generation);

			// Set opponent data
			setOpponentPokemon(randomOpponent);
			setOpponentMoves(opponentMoves);

			// Generate team strings for both players
			// @ts-ignore
			const p1Team = Teams.exportSet({
				name: selectedPokemon.name,
				species: selectedPokemon.baseSpecies,
				moves: selectedMoves,
			});

			// @ts-ignore
			const p2Team = Teams.exportSet({
				name: randomOpponent.name,
				species: randomOpponent.baseSpecies,
				moves: opponentMoves,
			});

			setP1Team(p1Team);
			setP2Team(p2Team);

			// Navigate to battle page
			router.push("/battle");
		} catch (error) {
			console.error("Error starting battle:", error);
		} finally {
			setIsStartingBattle(false);
		}
	}, [
		selectedPokemon,
		allPokemon,
		setOpponentPokemon,
		setOpponentMoves,
		selectedMoves,
		setP1Team,
		setP2Team,
		router,
		generation,
	]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-4">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span className="ml-2">Loading Pokemon data...</span>
			</div>
		);
	}

	// Find the selected Pokemon object
	const selectedPokemonData = selectedPokemonId
		? allPokemon.find((p) => p.id === selectedPokemonId)
		: null;

	return (
		<div className="w-full space-y-6">
			<Select value={selectedPokemonId} onValueChange={handleSelectChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select a Pokemon..." />
				</SelectTrigger>
				<SelectContent className="max-h-[300px]">
					<ScrollArea className="h-[300px]">
						{sortedPokemon.map((pokemon) => (
							<SelectItem
								key={pokemon.id}
								value={pokemon.id}
								className="flex items-center gap-2 py-2 hover:bg-accent/50 transition-colors"
							>
								<img
									src={pokemon.sprite}
									alt={pokemon.name}
									className="w-10 h-10 object-contain"
									loading="lazy"
								/>
								<span className="text-sm text-muted-foreground mr-1">
									#{pokemon.num.toString().padStart(3, "0")}
								</span>
								<span className="font-medium capitalize">
									{pokemon.name.replace(/-/g, " ")}
								</span>
								<div className="flex gap-1 ml-auto">
									{pokemon.types.map((type) => (
										<Badge
											key={type}
											variant="secondary"
											className={`${TYPE_COLORS[type]} text-white text-xs px-2 py-0`}
										>
											{type}
										</Badge>
									))}
								</div>
							</SelectItem>
						))}
					</ScrollArea>
				</SelectContent>
			</Select>

			{selectedPokemonData && (
				<Card className="overflow-hidden border-2">
					<CardContent className="pt-6">
						<PokemonCard
							pokemon={{
								pokemon: selectedPokemonData,
								moves: selectedMoves,
							}}
							className="mb-4"
							showMoves={true}
							disabledMoves={isLoadingMoves}
						/>

						<div className="flex justify-center mt-6">
							<Button
								onClick={handleStartBattle}
								disabled={!selectedPokemon || isStartingBattle}
								className="w-full sm:w-auto"
							>
								{isStartingBattle ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Starting Battle...
									</>
								) : (
									<>
										<Swords className="mr-2 h-4 w-4" />
										Start Battle
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
