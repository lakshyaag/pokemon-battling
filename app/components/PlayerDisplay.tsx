import { useState } from "react";
import type { Battle } from "@pkmn/client";
import type { PlayerRequest, PlayerDecision } from "@/services/battle-types";
import type { BattleEngine } from "@/services/battle-engine";
import type { GenerationNum } from "@pkmn/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { TypeBadge } from "./ui/type-badge";
import BattleMoveButton from "./BattleMoveButton";
import SwitchButton from "./SwitchButton";
import { getSprite, parseCondition, getHPColor } from "@/utils/pokemonUtils";
import { getStatusClass, getStatusName } from "@/lib/utils";
import { Button } from "./ui/button";

interface PlayerDisplayProps {
	player: "p1" | "p2";
	battle: Battle | null;
	request: PlayerRequest | null;
	generation: GenerationNum;
	engine: BattleEngine | null;
	selectedDecision: PlayerDecision | null;
	onDecision: (player: "p1" | "p2", decision: PlayerDecision | null) => void;
}

export default function PlayerDisplay({
	player,
	battle,
	request,
	generation,
	engine,
	selectedDecision,
	onDecision,
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

	const renderActionSection = () => {
		// Check if a switch is forced for the first active slot
		const needsToSwitch = request?.forceSwitch?.[0] === true;
		// Check if moves are available (request exists, not waiting, has moves)
		const canMove =
			request &&
			!request.wait &&
			request.active?.[0]?.moves &&
			request.active[0].moves.length > 0;
		// Check if trapped
		const isTrapped = request?.active?.[0]?.trapped === true;
		// Check if can switch voluntarily
		const canSwitch = !isTrapped && request?.active?.[0]?.canSwitch !== false;

		const renderSwitchOptions = (showTitle = true) => {
			const switchOptions = request?.side.pokemon.filter(
				(p) => !p.active && p.condition !== "0 fnt",
			);

			if (!switchOptions?.length) return null;

			return (
				<div className="space-y-2">
					{showTitle && (
						<h3 className="text-sm font-medium text-muted-foreground">
							Switch to:
						</h3>
					)}
					{switchOptions.map((pokemonInfo) => {
						const originalIndex =
							request?.side.pokemon.findIndex(
								(p) => p.ident === pokemonInfo.ident,
							) ?? -1;

						const switchIndex = originalIndex + 1;

						if (originalIndex === -1) return null;

						// Check if this specific switch is the selected decision
						const isSelected =
							selectedDecision?.type === "switch" &&
							selectedDecision.pokemonIndex === switchIndex;

						return (
							<SwitchButton
								key={pokemonInfo.ident}
								pokemonInfo={pokemonInfo}
								isSelected={isSelected}
								onClick={() => {
									if (isSelected) {
										onDecision(player, null);
									} else {
										onDecision(player, {
											type: "switch",
											pokemonIndex: switchIndex,
										});
									}
								}}
								disabled={isTrapped}
							/>
						);
					})}
				</div>
			);
		};

		// If forced to switch, only show switch options
		if (needsToSwitch) {
			return renderSwitchOptions();
		}

		// Show moves and optional switch button
		if (canMove) {
			const moves = request?.active?.[0]?.moves ?? [];
			const isSelectedMove = selectedDecision?.type === "move";
			const isSelectedSwitch = selectedDecision?.type === "switch";
			const [showingSwitchOptions, setShowingSwitchOptions] = useState(false);

			return (
				<div className="space-y-3">
					{!showingSwitchOptions ? (
						<>
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
											disabled={isButtonDisabled || isSelectedSwitch}
											isDisabled={isDisabled}
											isSelected={
												isSelectedMove &&
												selectedDecision.moveIndex === index + 1
											}
											onClick={() => {
												if (isButtonDisabled) return;
												if (
													isSelectedMove &&
													selectedDecision.moveIndex === index + 1
												) {
													onDecision(player, null);
												} else {
													onDecision(player, {
														type: "move",
														moveIndex: index + 1,
													});
												}
											}}
										/>
									);
								})}
							</div>
							{canSwitch && (
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowingSwitchOptions(true)}
										disabled={isSelectedMove}
									>
										Switch Pokémon
									</Button>
									{selectedDecision && (
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive/90"
											onClick={() => onDecision(player, null)}
										>
											Cancel Selection
										</Button>
									)}
								</div>
							)}
						</>
					) : (
						<>
							{renderSwitchOptions(false)}
							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowingSwitchOptions(false)}
								>
									Show Moves
								</Button>
								{selectedDecision && (
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive/90"
										onClick={() => onDecision(player, null)}
									>
										Cancel Selection
									</Button>
								)}
							</div>
						</>
					)}
				</div>
			);
		}

		if (request?.wait) {
			return (
				<div className="text-muted-foreground italic text-center p-4 h-[12rem] flex items-center justify-center">
					Waiting for opponent...
				</div>
			);
		}

		return (
			<div className="text-muted-foreground italic text-center p-4 h-[12rem] flex items-center justify-center">
				No action required.
			</div>
		);
	};

	return (
		<div className="flex flex-col space-y-4 w-full">
			<Card>
				<CardContent className="pt-5 pb-4">{renderInfo()}</CardContent>
			</Card>
			<Card>
				<CardHeader className="py-2 px-4 border-b">
					<CardTitle className="text-base font-medium">
						{request?.forceSwitch?.[0] ? "Choose Switch" : "Choose Action"}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-4 pb-4">{renderActionSection()}</CardContent>
			</Card>
		</div>
	);
}
