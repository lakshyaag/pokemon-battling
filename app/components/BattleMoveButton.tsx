import type { Move } from "@pkmn/data";
import React from "react";
import type { MoveData } from "../services/player";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TYPE_COLORS } from "@/lib/constants";

type BattleMoveButtonProps = {
	moveDetails: MoveData;
	moveData: Move;
	isSelected: boolean;
	onClick: () => void;
	disabled?: boolean;
};

export default function BattleMoveButton({
	moveDetails,
	moveData,
	isSelected,
	onClick,
	disabled = false,
}: BattleMoveButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					disabled={disabled}
					className={`
							w-full py-2 px-3 rounded text-sm capitalize border
							${
								isSelected
									? "bg-green-500 text-white border-green-600"
									: "bg-white hover:bg-gray-100 border-gray-300"
							}
							${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
						`}
				>
					{moveData.name.replace(/-/g, " ")}
				</button>
			</TooltipTrigger>
			<TooltipContent className="p-3 max-w-xs">
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-semibold">{moveData.name}</span>
						<Badge className={`${TYPE_COLORS[moveData.type]} text-white`}>
							{moveData.type}
						</Badge>
					</div>
					<div className="grid grid-cols-3 gap-2 text-xs">
						<div>
							<span className="font-medium">Power:</span>{" "}
							{moveData.basePower || "-"}
						</div>
						<div>
							<span className="font-medium">Acc:</span>{" "}
							{moveData.accuracy === true ? "-" : moveData.accuracy}
						</div>
						<div>
							<span className="font-medium">PP:</span> {moveDetails.pp} /{" "}
							{moveDetails.maxpp}
						</div>
					</div>
					<div className="text-xs text-gray-600">
						{moveData.shortDesc || moveData.desc || "No description available."}
					</div>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
