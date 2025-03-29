import React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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
	// Get color based on move type
	const getTypeColor = (type: string) => {
		const typeColors: Record<string, { bg: string; text: string }> = {
			normal: { bg: "bg-gray-400", text: "text-white" },
			fire: { bg: "bg-red-500", text: "text-white" },
			water: { bg: "bg-blue-500", text: "text-white" },
			electric: { bg: "bg-yellow-400", text: "text-black" },
			grass: { bg: "bg-green-500", text: "text-white" },
			ice: { bg: "bg-cyan-300", text: "text-black" },
			fighting: { bg: "bg-red-700", text: "text-white" },
			poison: { bg: "bg-purple-500", text: "text-white" },
			ground: { bg: "bg-yellow-700", text: "text-white" },
			flying: { bg: "bg-indigo-400", text: "text-white" },
			psychic: { bg: "bg-pink-500", text: "text-white" },
			bug: { bg: "bg-lime-500", text: "text-white" },
			rock: { bg: "bg-yellow-800", text: "text-white" },
			ghost: { bg: "bg-purple-700", text: "text-white" },
			dragon: { bg: "bg-indigo-700", text: "text-white" },
			dark: { bg: "bg-gray-700", text: "text-white" },
			steel: { bg: "bg-gray-500", text: "text-white" },
			fairy: { bg: "bg-pink-300", text: "text-black" },
		};

		return (
			typeColors[type.toLowerCase()] || {
				bg: "bg-gray-400",
				text: "text-white",
			}
		);
	};

	const typeColor = getTypeColor(type);

	const button = (
		<Button
			variant="outline"
			className={`w-full h-full p-2 flex flex-col items-center justify-between gap-1 ${
				disabled ? "opacity-50" : ""
			}`}
			disabled={disabled}
			onClick={onClick}
		>
			<div className="flex items-center justify-between w-full">
				<span className="font-medium">{name}</span>
				<Badge
					variant="outline"
					className={`${typeColor.bg} ${typeColor.text}`}
				>
					{type}
				</Badge>
			</div>
			<div className="text-sm text-gray-500 self-end">
				PP: {pp}/{maxPp}
			</div>
		</Button>
	);

	if (isDisabled && disabledReason) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>
					<p>{disabledReason}</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	return button;
}
