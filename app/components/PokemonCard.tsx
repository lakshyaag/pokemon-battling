import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import MoveList from "./MoveList";
import type { PokemonWithMoves } from "../utils/pokemonUtils";
import { Badge } from "./ui/badge";
import { TYPE_COLORS } from "@/lib/constants";

type PokemonCardProps = {
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
export default function PokemonCard({
	pokemon,
	side = "user",
	className = "",
	showMoves = false,
	selectedMove = "",
	onSelectMove,
	disabledMoves = false,
	movesTitle,
}: PokemonCardProps) {
	const { pokemon: pokemonData, moves } = pokemon;

	const bgColor =
		side === "user"
			? "from-blue-500/10 to-blue-500/5"
			: "from-red-500/10 to-red-500/5";
	const glowColor =
		side === "user"
			? "from-blue-500/25 via-blue-500/5 to-transparent"
			: "from-red-500/25 via-red-500/5 to-transparent";
	const defaultMovesTitle = side === "user" ? "Your Moves" : "Opponent Moves";

	const handleMoveSelect = (move: string) => {
		if (onSelectMove) {
			onSelectMove(move);
		}
	};

	return (
		<Card
			className={cn(
				"overflow-hidden transition-all duration-200 backdrop-blur-sm bg-gradient-to-b",
				bgColor,
				className,
			)}
		>
			<CardHeader className="p-4">
				<div className="flex flex-col items-center gap-2 mb-2">
					<div className="flex items-center justify-between w-full">
						<span className="text-sm text-muted-foreground">
							#{pokemonData.num.toString().padStart(3, "0")}
						</span>
						<span className="text-xl font-semibold capitalize tracking-tight mx-2">
							{pokemonData.name.replace(/-/g, " ")}
						</span>
						<div className="flex gap-1">
							{pokemonData.types.map((type) => (
								<Badge
									key={type}
									variant="secondary"
									className={`${TYPE_COLORS[type]} text-white text-xs px-2 py-0`}
								>
									{type}
								</Badge>
							))}
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-6 pt-0">
				<div className="flex flex-col items-center">
					<div className="relative w-40 h-40 flex items-center justify-center group">
						{/* Glow effect */}
						<div
							className={cn(
								"absolute inset-0 bg-gradient-radial opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl -z-10",
								glowColor,
							)}
						/>
						<img
							src={pokemonData.sprite}
							alt={pokemonData.name}
							className="w-full h-full object-contain relative z-10 drop-shadow-xl transform group-hover:scale-110 transition-all duration-300 will-change-transform"
							loading="lazy"
						/>
					</div>
				</div>

				{/* Show moves if requested */}
				{showMoves && moves.length > 0 && (
					<div className="mt-6">
						<MoveList
							moves={moves}
							selectedMove={selectedMove}
							onSelectMove={handleMoveSelect}
							disabled={disabledMoves}
							title={movesTitle || defaultMovesTitle}
							className="mt-2"
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
