import React from "react";
import type { Pokemon, Battle } from "@pkmn/client";
import type { PlayerRequest, MoveData } from "@/services/battle-types";
import type { BattleEngine } from "@/services/battle-engine";
import type { GenerationNum } from "@pkmn/types";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TypeBadge } from "./ui/type-badge";
import BattleMoveButton from "./BattleMoveButton";
import { getSprite, parseCondition, getHPColor } from "@/utils/pokemonUtils";
import { getStatusClass, getStatusName } from "@/lib/utils";
import { Button } from "./ui/button";

interface PlayerDisplayProps {
	player: "p1" | "p2";
	battle: Battle | null;
	request: PlayerRequest | null;
	generation: GenerationNum;
	engine: BattleEngine | null;
	selectedMove: number | null;
	onMoveSelect: (player: "p1" | "p2", moveIndex: number | null) => void;
}

export default function PlayerDisplay({
	player,
	battle,
	request,
	generation,
	engine,
	selectedMove,
	onMoveSelect,
}: PlayerDisplayProps) {
	if (!battle || !engine) {
		return (
			<Card className="w-full">
				<CardContent className="pt-6 text-center text-muted-foreground">
					Loading player...
				</CardContent>
			</Card>
		);
	}

	const pokemon = battle[player].active[0];
	// Get request data even if pokemon exists, for item/ability/moves
	const pokemonFromRequest = request?.side.pokemon.find((p) => p.active);

	const renderInfo = () => {
		if (!pokemon) {
			return (
				<div className="text-center text-muted-foreground italic h-32 flex items-center justify-center">
					No active Pokémon
				</div>
			);
		}

		const spriteUrl = getSprite(pokemon, player, generation);
		// Use request for item/ability as it's more reliable during updates
		const itemData = pokemonFromRequest?.item
			? engine.getItem(pokemonFromRequest.item)
			: null;
		const abilityData = pokemonFromRequest?.baseAbility
			? engine.getAbility(pokemonFromRequest.baseAbility)
			: null;

		const { currentHP, maxHP, status } = parseCondition(pokemon);
		const hpPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
		const hpColor = getHPColor(hpPercentage);

		return (
			<div className="flex flex-col items-center space-y-3">
				<div className="relative w-32 h-32">
					<img
						src={spriteUrl}
						alt={pokemon.name}
						className="w-full h-full object-contain pixelated"
					/>
					{status && (
						<Badge
							variant="secondary"
							className={`absolute bottom-0 right-0 text-xs px-1.5 py-0.5 ${getStatusClass(status)}`}
						>
							{getStatusName(status)}
						</Badge>
					)}
				</div>
				<div className="text-center w-full">
					<h3 className="text-lg font-bold mb-1">{pokemon.name}</h3>
					<div className="flex gap-1.5 justify-center mb-2">
						{pokemon.types.map((type) => (
							<TypeBadge key={type} type={type} />
						))}
					</div>
					<div className="space-y-1">
						<div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
							<div
								className={`h-full ${hpColor} rounded-full transition-all duration-300 ease-in-out`}
								style={{ width: `${hpPercentage}%` }}
							/>
						</div>
						<p className="text-xs font-medium text-muted-foreground">
							{currentHP} / {maxHP} HP
						</p>
					</div>
					{itemData && (
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="text-xs mt-1.5 cursor-help text-muted-foreground">
									Item: <span className="font-medium">{itemData.name}</span>
								</p>
							</TooltipTrigger>
							<TooltipContent>
								<p className="max-w-xs text-sm">
									{itemData.desc || "No description."}
								</p>
							</TooltipContent>
						</Tooltip>
					)}
					{abilityData && (
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="text-xs mt-0.5 cursor-help text-muted-foreground">
									Ability:{" "}
									<span className="font-medium">{abilityData.name}</span>
								</p>
							</TooltipTrigger>
							<TooltipContent>
								<p className="max-w-xs text-sm">
									{abilityData.desc || "No description."}
								</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		);
	};

	const renderMovesSection = () => {
		// Show waiting message if explicitly waiting for opponent
		if (request?.wait) {
			return (
				<div className="text-muted-foreground italic text-center p-4 h-[12rem] flex items-center justify-center">
					Waiting for opponent...
				</div>
			);
		}

		const moves = request?.active?.[0]?.moves;
		if (!moves || moves.length === 0) {
			return (
				<div className="text-muted-foreground italic text-center p-4 h-[12rem] flex items-center justify-center">
					No moves available (e.g., Struggle).
				</div>
			);
		}

		return (
			<div className="space-y-3">
				<div className="grid grid-cols-2 gap-2.5">
					{moves.map((moveInfo, index) => {
						const moveData = engine.getMoveData(moveInfo.id);
						if (!moveData) return null;

						const isDisabled = moveInfo.disabled;
						const isButtonDisabled = isDisabled || moveInfo.pp <= 0;

						return (
							<BattleMoveButton
								key={`${moveInfo.id}-${index}`}
								move={moveData}
								pp={moveInfo.pp}
								maxPp={moveInfo.maxpp}
								disabled={isButtonDisabled}
								isDisabled={isDisabled}
								isSelected={selectedMove === index + 1}
								onClick={() => {
									if (isButtonDisabled) return;
									// If this move is already selected, deselect it
									if (selectedMove === index + 1) {
										onMoveSelect(player, null);
									} else {
										onMoveSelect(player, index + 1);
									}
								}}
							/>
						);
					})}
				</div>
				{selectedMove !== null && (
					<div className="flex justify-end">
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive/90"
							onClick={() => onMoveSelect(player, null)}
						>
							Cancel Selection
						</Button>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex flex-col space-y-4 w-full">
			<Card>
				<CardContent className="pt-5 pb-4">{renderInfo()}</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4 pb-4">{renderMovesSection()}</CardContent>
			</Card>
		</div>
	);
}
