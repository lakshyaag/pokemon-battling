import React from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { parseCondition, getHPColor } from "@/utils/pokemonUtils";
import { getStatusClass, getStatusName } from "@/lib/utils";
import { Sprites } from "@pkmn/img";
import { useSettings } from "@/store/settings";
import { getGraphics } from "@/lib/constants";
import type { PlayerRequest } from "@/services/battle-types";
import type { GenderName } from "@pkmn/types";

type PokemonInfo = NonNullable<PlayerRequest["side"]["pokemon"][number]>;

interface SwitchButtonProps {
	pokemonInfo: PokemonInfo;
	onClick: () => void;
	disabled?: boolean;
}

export default function SwitchButton({
	pokemonInfo,
	onClick,
	disabled,
}: SwitchButtonProps) {
	const { generation } = useSettings();
	const graphics = getGraphics(generation);

	// Extract basic info

	console.log(pokemonInfo);
	const name = pokemonInfo.details.split(",")[0].replace(/-.+$/, "");
	const level = pokemonInfo.details.match(/, L(\d+)/)?.[1] || "100";
	const gender = pokemonInfo.details.includes(", M")
		? ("M" as GenderName)
		: pokemonInfo.details.includes(", F")
			? ("F" as GenderName)
			: undefined;
	const shiny = pokemonInfo.details.includes(", shiny");

	// Parse condition string like "100/100" or "0 fnt"
	const [currentHPStr, maxHPStr] = pokemonInfo.condition
		.split("/")
		.map((s) => s.trim());
	const currentHP = Number.parseInt(currentHPStr, 10) || 0;
	let maxHP = Number.parseInt(maxHPStr?.split(" ")[0], 10) || 0;
	const status = pokemonInfo.condition.split(" ")[1]?.toLowerCase() || null;

	// Infer maxHP if missing
	if (maxHP === 0 && currentHP > 0) maxHP = currentHP;
	if (maxHP === 0 && currentHP === 0) maxHP = 100;

	const hpPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
	const hpColor = getHPColor(hpPercentage);

	// Get sprite URL
	const spriteUrl = Sprites.getPokemon(name.toLowerCase(), {
		gen: graphics,
		shiny,
		gender,
	}).url;

	return (
		<Button
			variant="outline"
			className={cn(
				"h-auto w-full p-3 flex items-center justify-start gap-3 text-left border rounded-lg shadow-sm hover:bg-accent/50 dark:hover:bg-accent/10",
				disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
			)}
			onClick={onClick}
			disabled={disabled}
		>
			<img
				src={spriteUrl}
				alt={name}
				className="w-10 h-10 object-contain pixelated flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full"
				loading="lazy"
			/>
			<div className="flex-grow space-y-1">
				<div className="flex justify-between items-center">
					<span className="font-semibold text-sm">{name}</span>
					{level && <span className="text-xs text-muted-foreground">Lv. {level}</span>}
					{status && status !== "fnt" && (
						<Badge
							variant="secondary"
							className={`text-xs px-1 py-0 ${getStatusClass(status)}`}
						>
							{getStatusName(status)}
						</Badge>
					)}
				</div>
				<div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div
						className={`h-full ${hpColor} rounded-full`}
						style={{ width: `${hpPercentage}%` }}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					{currentHP} / {maxHP} HP
				</p>
			</div>
		</Button>
	);
}
