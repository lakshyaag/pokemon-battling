import React from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { TypeBadge } from "./ui/type-badge";
import { cva } from "class-variance-authority";
import type { TypeName } from "@pkmn/types";
import type { Move } from "@pkmn/dex";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Separator } from "./ui/separator";

interface BattleMoveButtonProps {
	move: Move;
	pp: number;
	maxPp: number;
	disabled?: boolean;
	isDisabled?: boolean;
	onClick: () => void;
}

// Variants for button background based on type
const moveButtonVariants = cva(
	"relative w-full min-h-[5rem] h-full p-3 flex flex-col justify-between overflow-hidden transition-all duration-200 rounded-lg border shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
	{
		variants: {
			type: {
				normal:
					"bg-gray-100/50 hover:bg-gray-100 border-gray-200 dark:bg-gray-800/30 dark:hover:bg-gray-800/60 dark:border-gray-700",
				fire: "bg-red-100/50 hover:bg-red-100 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-800/50",
				water:
					"bg-blue-100/50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border-blue-800/50",
				electric:
					"bg-yellow-100/50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 dark:border-yellow-800/50",
				grass:
					"bg-emerald-100/50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800/50",
				ice: "bg-cyan-100/50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 dark:border-cyan-800/50",
				fighting:
					"bg-red-200/50 hover:bg-red-200 border-red-300 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:border-red-800/50",
				poison:
					"bg-purple-100/50 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:border-purple-800/50",
				ground:
					"bg-amber-100/50 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:border-amber-800/50",
				flying:
					"bg-sky-100/50 hover:bg-sky-100 border-sky-200 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 dark:border-sky-800/50",
				psychic:
					"bg-pink-100/50 hover:bg-pink-100 border-pink-200 dark:bg-pink-900/20 dark:hover:bg-pink-900/40 dark:border-pink-800/50",
				bug: "bg-lime-100/50 hover:bg-lime-100 border-lime-200 dark:bg-lime-900/20 dark:hover:bg-lime-900/40 dark:border-lime-800/50",
				rock: "bg-stone-100/50 hover:bg-stone-100 border-stone-200 dark:bg-stone-900/20 dark:hover:bg-stone-900/40 dark:border-stone-800/50",
				ghost:
					"bg-purple-200/50 hover:bg-purple-200 border-purple-300 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 dark:border-purple-800/50",
				dragon:
					"bg-violet-100/50 hover:bg-violet-100 border-violet-200 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 dark:border-violet-800/50",
				dark: "bg-neutral-200/50 hover:bg-neutral-200 border-neutral-300 dark:bg-neutral-900/20 dark:hover:bg-neutral-900/40 dark:border-neutral-700",
				steel:
					"bg-slate-100/50 hover:bg-slate-100 border-slate-200 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 dark:border-slate-700",
				fairy:
					"bg-pink-100/50 hover:bg-pink-100 border-pink-200 dark:bg-pink-900/20 dark:hover:bg-pink-900/40 dark:border-pink-800/50",
				unknown:
					"bg-gray-100/50 hover:bg-gray-100 border-gray-200 dark:bg-gray-800/30 dark:hover:bg-gray-800/60 dark:border-gray-700",
			},
		},
		defaultVariants: {
			type: "unknown",
		},
	},
);

/**
 * Button component for displaying and selecting a Pokémon move
 */
export default function BattleMoveButton({
	move,
	pp,
	maxPp,
	disabled,
	isDisabled,
	onClick,
}: BattleMoveButtonProps) {
	const ppPercentage = maxPp > 0 ? (pp / maxPp) * 100 : 0;
	let ppColor = "text-emerald-600 dark:text-emerald-400"; // Default: Green (good PP)
	if (ppPercentage <= 50 && ppPercentage > 25) {
		ppColor = "text-yellow-600 dark:text-yellow-400"; // Yellow (medium PP)
	} else if (ppPercentage <= 25) {
		ppColor = "text-red-600 dark:text-red-400"; // Red (low PP)
	}
	if (pp <= 0) {
		ppColor = "text-gray-500 dark:text-gray-500"; // Gray (no PP)
	}

	const isButtonDisabled = disabled || isDisabled || pp <= 0;
	const typeName = (move.type?.toLowerCase() || "unknown") as
		| Lowercase<TypeName>
		| "unknown";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					className={cn(
						moveButtonVariants({
							type: typeName as Lowercase<TypeName>,
						}),
						isButtonDisabled &&
							"opacity-60 cursor-not-allowed hover:bg-inherit",
						"text-left",
					)}
					disabled={isButtonDisabled}
					onClick={onClick}
				>
					<div className="flex flex-col w-full h-full gap-1">
						<div className="flex items-center justify-center">
							<span className="font-semibold text-base text-foreground">
								{move.name}
							</span>
						</div>
						<div className="flex items-center justify-between mt-auto">
							<TypeBadge type={move.type} className="flex-shrink-0" />
							<span className={cn("text-xs font-medium", ppColor)}>
								{pp}/{maxPp}
							</span>
						</div>
					</div>
					{isDisabled && (
						<div className="absolute inset-0 bg-black/5 dark:bg-white/5 flex items-center justify-center rounded-lg">
							<span className="text-xs text-destructive font-medium bg-background/80 px-1.5 py-0.5 rounded border border-destructive/30">
								Disabled
							</span>
						</div>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent className="w-64 p-3 bg-background text-foreground shadow-sm opacity-90">
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<span className="font-semibold text-base">{move.name}</span>
						<TypeBadge type={move.type} />
					</div>
					<Separator />
					<p className="text-sm text-muted-foreground leading-relaxed">
						{move.shortDesc || move.desc || "No description available."}
					</p>
					<div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-1">
						<div>
							Power:{" "}
							<span className="font-medium text-foreground">
								{move.basePower || "-"}
							</span>
						</div>
						<div>
							Acc:{" "}
							<span className="font-medium text-foreground">
								{move.accuracy === true ? "∞" : move.accuracy || "-"}
							</span>
						</div>
						<div>
							PP:{" "}
							<span className={cn("font-medium", ppColor)}>
								{pp}/{maxPp}
							</span>
						</div>
					</div>
					{move.category && (
						<div className="text-xs text-muted-foreground">
							Category:{" "}
							<span className="font-medium text-foreground">
								{move.category}
							</span>
						</div>
					)}
					{isDisabled && (
						<p className="text-xs text-destructive font-semibold pt-1">
							Move is currently disabled.
						</p>
					)}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
