import React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TYPE_COLORS } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { Move } from "@pkmn/dex";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { Check } from "lucide-react";

export interface BattleMoveButtonProps {
	move: Move;
	disabled?: boolean;
	isDisabled?: boolean;
	disabledReason?: string;
	pp?: number;
	maxPp?: number;
	isSelected?: boolean;
	onClick: () => void;
}

export default function BattleMoveButton({
	move,
	disabled,
	isDisabled,
	disabledReason,
	pp,
	maxPp,
	isSelected,
	onClick,
}: BattleMoveButtonProps) {
	const isButtonDisabled =
		disabled || isDisabled || (pp !== undefined && pp <= 0);
	const tooltipContent = isDisabled
		? disabledReason
		: move.desc || move.shortDesc;

	// Calculate PP status for styling
	const ppPercentage = pp !== undefined && maxPp ? (pp / maxPp) * 100 : 100;
	let ppColor = "text-emerald-500";
	if (ppPercentage <= 50) ppColor = "text-yellow-500";
	if (ppPercentage <= 25) ppColor = "text-red-500";
	if (ppPercentage <= 0) ppColor = "text-gray-400";

	// Format move priority for display
	const getPriorityText = (priority: number) => {
		if (priority > 0) return `+${priority} (Goes first)`;
		if (priority < 0) return `${priority} (Goes last)`;
		return "0 (Normal)";
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant={isSelected ? "default" : "outline"}
					className={cn(
						"relative w-full h-full p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
						isButtonDisabled && "opacity-50 cursor-not-allowed",
						isSelected &&
							!isButtonDisabled &&
							"ring-2 ring-offset-2 ring-primary shadow-lg transform scale-[1.02]",
						!isButtonDisabled &&
							!isSelected &&
							"hover:bg-accent/50 hover:scale-[1.01]",
						TYPE_COLORS[move.type] &&
							isSelected &&
							`${TYPE_COLORS[move.type]} text-white`,
					)}
					onClick={onClick}
					disabled={isButtonDisabled}
				>
					{isSelected && !isButtonDisabled && (
						<div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 shadow-md">
							<Check size={12} />
						</div>
					)}
					<div className="flex items-center justify-between w-full">
						<span
							className={cn(
								"font-medium",
								isSelected && !isButtonDisabled && "text-white font-semibold",
							)}
						>
							{move.name}
						</span>
					</div>
					<div className="flex items-center gap-2 flex-wrap justify-center">
						<Badge
							variant={isSelected ? "default" : "secondary"}
							className={cn(
								"text-xs px-2 py-0",
								!isSelected && `${TYPE_COLORS[move.type]} text-white`,
								isSelected && !isButtonDisabled && "bg-white/20 text-white",
							)}
						>
							{move.type}
						</Badge>
						{isDisabled && (
							<Badge variant="destructive" className="text-xs px-2 py-0">
								Disabled
							</Badge>
						)}
						{pp === 0 && (
							<Badge variant="destructive" className="text-xs px-2 py-0">
								No PP
							</Badge>
						)}
					</div>
				</Button>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				className="w-80 p-4 bg-[#0F1729] border-[#1D283A] shadow-xl"
			>
				<div className="space-y-3">
					{/* Move Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-lg font-semibold text-white">
								{move.name}
							</span>
							<Badge
								variant="outline"
								className={cn(
									"text-xs border-0",
									TYPE_COLORS[move.type],
									"text-white",
								)}
							>
								{move.type}
							</Badge>
						</div>
						<Badge variant="outline" className="border-[#1D283A] text-white">
							{move.category || "Special"}
						</Badge>
					</div>

					{/* Move Stats */}
					<div className="grid grid-cols-3 gap-2 text-sm">
						<div className="space-y-1">
							<p className="text-[#64748B]">Power</p>
							<p className="font-medium text-white">{move.basePower || "-"}</p>
						</div>
						<div className="space-y-1">
							<p className="text-[#64748B]">Accuracy</p>
							<p className="font-medium text-white">
								{move.accuracy === true ? "Never Misses" : move.accuracy || "-"}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-[#64748B]">Priority</p>
							<p className="font-medium text-white">
								{getPriorityText(move.priority || 0)}
							</p>
						</div>
					</div>

					<Separator className="bg-[#1D283A]" />

					{/* Move Description */}
					<div className="space-y-2">
						<p className="text-sm leading-relaxed text-[#94A3B8]">
							{isDisabled ? (
								<span className="text-red-400 font-medium">
									{disabledReason}
								</span>
							) : (
								tooltipContent
							)}
						</p>
					</div>

					{/* PP Warning */}
					{pp !== undefined && maxPp !== undefined && (
						<div
							className={cn(
								"text-sm font-medium rounded-lg p-2",
								pp <= 5
									? "bg-red-950/50 text-red-400 border border-red-900/50"
									: "bg-[#1D283A] text-[#94A3B8]",
							)}
						>
							{pp <= 5 ? (
								<span>⚠️ Warning: Low PP remaining!</span>
							) : (
								<span>
									PP: {pp}/{maxPp} remaining
								</span>
							)}
						</div>
					)}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
