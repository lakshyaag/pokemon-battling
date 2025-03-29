import React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TYPE_COLORS } from "@/lib/constants";

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
	const typeClass = TYPE_COLORS[type.toLowerCase() as keyof typeof TYPE_COLORS] || "bg-gray-400 text-white";

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
				<Badge variant="outline" className={typeClass}>
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
