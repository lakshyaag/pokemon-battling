import React from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { TypeBadge } from "./ui/type-badge";
import { cva } from "class-variance-authority";
import type { TypeName } from "@pkmn/types";

interface BattleMoveButtonProps {
	moveId: string;
	name: string;
	type: string;
	pp: number;
	maxPp: number;
	disabled?: boolean;
	isDisabled?: boolean;
	disabledReason?: string;
	onClick: () => void;
}

const moveButtonVariants = cva(
	"relative w-full min-h-[5rem] p-3 flex flex-col justify-between overflow-hidden transition-all duration-200 rounded-xl border-2 shadow-sm",
	{
		variants: {
			type: {
				normal: "bg-gray-50/80 hover:bg-gray-100/80 border-gray-200",
				fire: "bg-red-50/80 hover:bg-red-100/80 border-red-200",
				water: "bg-blue-50/80 hover:bg-blue-100/80 border-blue-200",
				electric: "bg-yellow-50/80 hover:bg-yellow-100/80 border-yellow-200",
				grass: "bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200",
				ice: "bg-cyan-50/80 hover:bg-cyan-100/80 border-cyan-200",
				fighting: "bg-red-100/80 hover:bg-red-200/80 border-red-300",
				poison: "bg-purple-50/80 hover:bg-purple-100/80 border-purple-200",
				ground: "bg-amber-50/80 hover:bg-amber-100/80 border-amber-200",
				flying: "bg-sky-50/80 hover:bg-sky-100/80 border-sky-200",
				psychic: "bg-pink-50/80 hover:bg-pink-100/80 border-pink-200",
				bug: "bg-lime-50/80 hover:bg-lime-100/80 border-lime-200",
				rock: "bg-stone-50/80 hover:bg-stone-100/80 border-stone-200",
				ghost: "bg-purple-100/80 hover:bg-purple-200/80 border-purple-300",
				dragon: "bg-violet-50/80 hover:bg-violet-100/80 border-violet-200",
				dark: "bg-neutral-100/80 hover:bg-neutral-200/80 border-neutral-300",
				steel: "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200",
				fairy: "bg-pink-50/80 hover:bg-pink-100/80 border-pink-200",
			},
		},
		defaultVariants: {
			type: "normal",
		},
	},
);

/**
 * Button component for displaying and selecting a Pokémon move
 */
export default function BattleMoveButton({
	moveId,
	name,
	type,
	pp,
	maxPp,
	disabled,
	isDisabled,
	disabledReason,
	onClick,
}: BattleMoveButtonProps) {
	const ppPercentage = (pp / maxPp) * 100;
	const ppColor =
		ppPercentage === 100
			? "text-emerald-600"
			: ppPercentage > 50
				? "text-emerald-600"
				: ppPercentage > 20
					? "text-yellow-600"
					: "text-red-600";

	return (
		<Button
			variant="ghost"
			className={cn(
				moveButtonVariants({ type: type.toLowerCase() as Lowercase<TypeName> }),
				disabled && "opacity-50 cursor-not-allowed hover:bg-inherit",
			)}
			disabled={disabled}
			onClick={onClick}
		>
			<div className="flex flex-col w-full gap-1">
				<div className="flex items-start justify-between">
					<span className="font-medium text-md">{name}</span>
					<TypeBadge type={type} className="shadow-sm" />
				</div>
				<div className={cn("text-sm font-medium self-end", ppColor)}>
					PP {pp}/{maxPp}
				</div>
			</div>
			{isDisabled && disabledReason && (
				<div className="absolute inset-0 bg-black/5 flex items-center justify-center">
					<span className="text-sm text-red-700 font-medium bg-white/90 px-2 py-1 rounded-md">
						{disabledReason}
					</span>
				</div>
			)}
		</Button>
	);
}
