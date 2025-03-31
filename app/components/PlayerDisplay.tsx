import { useState, useEffect } from "react";
import type { Battle } from "@pkmn/client";
import type { PlayerRequest, PlayerDecision } from "@/lib/battle-types";
import type { GenerationNum } from "@pkmn/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { TypeBadge } from "@/components/ui/type-badge";
import BattleMoveButton from "./BattleMoveButton";
import SwitchButton from "./SwitchButton";
import { getSprite, parseCondition, getHPColor } from "@/utils/pokemonUtils";
import { getStatusClass, getStatusName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dex } from "@pkmn/sim";
import { generation } from "@/lib/constants";

interface PlayerDisplayProps {
	player: "p1" | "p2";
	battle: Battle | null;
	request: PlayerRequest | null;
	generation: GenerationNum;
	selectedDecision: PlayerDecision | null;
	onDecision: (decision: PlayerDecision | null) => void;
	isSelf: boolean;
}

// Initialize Dex for local data lookups
const localDex = Dex.forFormat(`gen${generation}randombattle`);

export default function PlayerDisplay({
	player,
	battle,
	request,
	generation,
	selectedDecision,
	onDecision,
	isSelf,
}: PlayerDisplayProps) {
	const [showingSwitchOptions, setShowingSwitchOptions] = useState(false);

	if (!battle) {
		return (
			<Card className="w-full">
				<CardContent className="pt-6 text-center text-muted-foreground">
					Loading player data...
				</CardContent>
			</Card>
		);
	}

	// Reset switch view when request changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setShowingSwitchOptions(false);
	}, [request?.rqid]);

	const pokemon = battle[player].active[0];
	const pokemonFromRequest = request?.side.pokemon.find((p) => p.active);

	const renderInfo = () => {
		if (!pokemon) {
			return (
				<div className="text-center text-muted-foreground italic h-32 flex items-center justify-center">
					No active Pokémon
				</div>
			);
		}

		const spriteUrl = getSprite(pokemon, isSelf ? "p1" : "p2", generation);
		const itemData = pokemonFromRequest?.item
			? localDex.items.get(pokemonFromRequest.item)
			: null;
		const abilityData = pokemonFromRequest?.baseAbility
			? localDex.abilities.get(pokemonFromRequest.baseAbility)
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
									{itemData.desc || itemData.shortDesc || "No description."}
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
									{abilityData.desc ||
										abilityData.shortDesc ||
										"No description."}
								</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		);
	};

	const renderActionSection = () => {
		if (!isSelf) {
			return (
				<div className="text-muted-foreground italic text-center p-4 h-[12rem] flex items-center justify-center">
					Opponent's turn...
				</div>
			);
		}

		const needsToSwitch = request?.forceSwitch?.[0] === true;
		const canMove =
			request &&
			!request.wait &&
			request.active?.[0]?.moves &&
			request.active[0].moves.length > 0;
		const isTrapped = request?.active?.[0]?.trapped === true;
		const canSwitch = !isTrapped && request?.active?.[0]?.canSwitch !== false;

		const renderSwitchOptions = (showTitle = true) => {
			const switchOptions = request?.side.pokemon.filter(
				(p) => !p.active && p.condition !== "0 fnt",
			);

			if (!switchOptions?.length)
				return (
					<p className="text-sm text-muted-foreground text-center">
						No Pokémon available to switch.
					</p>
				);

			return (
				<div className="space-y-2">
					{showTitle && (
						<h3 className="text-sm font-medium text-muted-foreground mb-2">
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
						const isSelected =
							selectedDecision?.type === "switch" &&
							selectedDecision.pokemonIndex === switchIndex;

						return (
							<SwitchButton
								key={pokemonInfo.ident}
								pokemonInfo={pokemonInfo}
								isSelected={isSelected}
								onClick={() => {
									if (isSelected) onDecision(null);
									else
										onDecision({ type: "switch", pokemonIndex: switchIndex });
								}}
								disabled={isTrapped}
							/>
						);
					})}
				</div>
			);
		};

		if (needsToSwitch) {
			return renderSwitchOptions();
		}

		if (canMove) {
			const moves = request?.active?.[0]?.moves ?? [];
			const isSelectedMove = selectedDecision?.type === "move";
			const isSelectedSwitch = selectedDecision?.type === "switch";

			return (
				<div className="space-y-3">
					{!showingSwitchOptions ? (
						<>
							<div className="grid grid-cols-2 gap-2.5">
								{moves.map((moveInfo, index) => {
									const moveData = localDex.moves.get(moveInfo.id);
									if (!moveData) {
										console.warn("Could not find move data for:", moveInfo.id);
										return (
											<div
												key={`${moveInfo.id}-${index}`}
												className="border rounded p-2 text-center text-muted-foreground text-sm"
											>
												{moveInfo.id} <br /> ({moveInfo.pp}/{moveInfo.maxpp})
											</div>
										);
									}

									const isDisabled = moveInfo.disabled;
									const isButtonDisabled = isDisabled || moveInfo.pp <= 0;
									const moveIndex = index + 1;
									const isCurrentlySelected =
										isSelectedMove && selectedDecision.moveIndex === moveIndex;

									return (
										<BattleMoveButton
											key={`${moveInfo.id}-${index}`}
											move={moveData}
											pp={moveInfo.pp}
											maxPp={moveInfo.maxpp}
											disabled={isButtonDisabled || isSelectedSwitch}
											isDisabled={isDisabled}
											isSelected={isCurrentlySelected}
											onClick={() => {
												if (isButtonDisabled) return;
												if (isCurrentlySelected) {
													onDecision(null);
												} else {
													onDecision({ type: "move", moveIndex: moveIndex });
												}
											}}
										/>
									);
								})}
							</div>
							<div className="flex justify-end gap-2 pt-2">
								{canSwitch && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowingSwitchOptions(true)}
										disabled={isSelectedMove}
									>
										Switch Pokémon
									</Button>
								)}
								{selectedDecision && (
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive/90"
										onClick={() => onDecision(null)}
									>
										Cancel Selection
									</Button>
								)}
							</div>
						</>
					) : (
						<>
							{renderSwitchOptions(false)}
							<div className="flex justify-end gap-2 pt-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowingSwitchOptions(false)}
									disabled={isSelectedSwitch}
								>
									Show Moves
								</Button>
								{selectedDecision && (
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive/90"
										onClick={() => onDecision(null)}
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
				Waiting for turn...
			</div>
		);
	};

	const getActionTitle = () => {
		if (!isSelf) return "Opponent's Action";
		if (request?.forceSwitch?.[0]) return "Choose Switch";
		if (request?.wait) return "Waiting...";
		if (request?.active?.[0]?.moves) return "Choose Action";
		return "Action";
	};

	return (
		<div className="flex flex-col space-y-4 w-full">
			<Card>
				<CardContent className="pt-5 pb-4">{renderInfo()}</CardContent>
			</Card>
			{isSelf ? (
				<Card>
					<CardHeader className="py-2 px-4 border-b">
						<CardTitle className="text-base font-medium">
							{getActionTitle()}
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-4 pb-4">
						{renderActionSection()}
					</CardContent>
				</Card>
			) : (
				<Card className="h-[16rem]">
					<CardContent className="pt-6 text-center text-muted-foreground flex items-center justify-center h-full">
						Opponent is choosing...
					</CardContent>
				</Card>
			)}
		</div>
	);
}
