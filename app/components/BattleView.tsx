"use client";

import React, { useState, useEffect, useRef } from "react";
import type { BattleState } from "../services/battle-types";
import type { Pokemon, Battle } from "@pkmn/client";
import type { BattleEngine } from "../services/battle-engine";
import { TYPE_COLORS } from "@/lib/constants";
import BattleMoveButton from "./BattleMoveButton";
import { Badge } from "./ui/badge";
import { getStatusClass, getStatusName } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { getSprite, parseCondition, getHPColor } from "../utils/pokemonUtils";
import { battleManager } from "@/services/battle-manager-instance";
import { useSettings } from "@/store/settings";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { TypeBadge } from "./ui/type-badge";

// Add this type to handle battle logs safely
type BattleLog = {
	id: string;
	html: string;
};

interface BattleViewProps {
	battleId: string;
}

/**
 * Component for displaying and interacting with a Pokémon battle
 */
export default function BattleView({ battleId }: BattleViewProps) {
	const battleEngineRef = useRef<BattleEngine | null>(null);
	const { generation } = useSettings();
	const [viewState, setViewState] = useState<BattleState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const maxRetries = 3;

	// Initialize battle engine and subscribe to updates
	useEffect(() => {
		let retryTimeout: NodeJS.Timeout;
		let mounted = true;

		const initializeBattle = () => {
			const engine = battleManager.getBattle(battleId);

			if (!engine) {
				if (retryCount < maxRetries) {
					// Retry after a short delay
					retryTimeout = setTimeout(() => {
						if (mounted) {
							setRetryCount((prev) => prev + 1);
							initializeBattle();
						}
					}, 1000);
					return;
				}

				setError(`Battle with ID ${battleId} not found or has ended.`);
				setViewState(null);
				return;
			}

			if (!mounted) return;

			battleEngineRef.current = engine;

			// Create a custom Battle type that extends @pkmn/client's Battle
			const battle = engine.getBattle() as Battle & {
				format?: string;
				currentTurn?: number;
				weather?: string;
				winner?: string | null;
				ended?: boolean;
			};

			setViewState({
				battle,
				logs: [...engine.getLogs()], // Create a new array to avoid readonly issues
				p1Request: engine.getP1Request(),
				p2Request: engine.getP2Request(),
			});

			setError(null);
			setRetryCount(0);

			// Subscribe to state updates
			const unsubscribe = engine.on("stateUpdate", (state) => {
				if (mounted) {
					setViewState(state);
				}
			});

			// Handle battle end
			const unsubscribeEnd = engine.on("battleEnd", ({ winner, state }) => {
				if (mounted) {
					console.log(`Battle ${battleId} ended. Winner: ${winner}`);
					setViewState((prev) =>
						prev
							? {
									...prev,
									battle: state as Battle & { winner?: string | null },
								}
							: null,
					);
				}
			});

			return () => {
				unsubscribe();
				unsubscribeEnd();
			};
		};

		const cleanup = initializeBattle();

		return () => {
			mounted = false;
			if (retryTimeout) {
				clearTimeout(retryTimeout);
			}
			if (cleanup) {
				cleanup();
			}
		};
	}, [battleId, retryCount]);

	// Handle player decisions
	const handlePlayerDecision = (player: "p1" | "p2", moveIndex: number) => {
		if (!battleEngineRef.current) return;
		battleEngineRef.current.processPlayerDecision(player, {
			type: "move",
			moveIndex,
		});
	};

	// Render player's Pokémon information
	const renderPokemonInfo = (player: "p1" | "p2") => {
		if (!viewState?.battle) return <div>Loading battle state...</div>;

		const pokemon = viewState.battle[player].active[0];
		const request = player === "p1" ? viewState.p1Request : viewState.p2Request;
		const pokemonFromRequest = request?.side.pokemon[0];

		if (!pokemon) return <div>No active Pokémon</div>;

		const spriteUrl = getSprite(pokemon, player, generation);
		const itemData = pokemonFromRequest?.item
			? battleEngineRef.current?.getItem(pokemonFromRequest.item)
			: null;
		const abilityData = pokemonFromRequest?.baseAbility
			? battleEngineRef.current?.getAbility(pokemonFromRequest.baseAbility)
			: null;

		// Extract HP information
		const { currentHP, maxHP, status } = parseCondition(pokemon);
		const hpPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
		const hpColor = getHPColor(hpPercentage);

		return (
			<Card className="w-full">
				<CardContent className="pt-6">
					<div className="flex flex-col items-center space-y-4">
						<div className="relative">
							<img
								src={spriteUrl}
								alt={pokemon.name}
								className="w-32 h-32 object-contain pixelated"
							/>
							{status && (
								<Badge
									className={`absolute bottom-0 right-0 ${getStatusClass(status)}`}
								>
									{getStatusName(status)}
								</Badge>
							)}
						</div>
						<div className="text-center w-full">
							<h3 className="text-lg font-bold mb-2">{pokemon.name}</h3>
							<div className="flex gap-2 justify-center mb-3">
								{pokemon.types.map((type) => (
									<TypeBadge key={type} type={type} />
								))}
							</div>
							<div className="space-y-2">
								<div className="h-2 w-full bg-gray-200 rounded-full">
									<div
										className={`h-full ${hpColor} rounded-full transition-all duration-500 ease-in-out`}
										style={{ width: `${hpPercentage}%` }}
									/>
								</div>
								<p className="text-sm">
									{currentHP} / {maxHP} HP
								</p>
							</div>
							{itemData && (
								<Tooltip>
									<TooltipTrigger asChild>
										<p className="text-sm mt-2 cursor-help">
											<span className="font-semibold">Item:</span>{" "}
											{itemData.name}
										</p>
									</TooltipTrigger>
									<TooltipContent>
										<p className="max-w-xs">{itemData.desc}</p>
									</TooltipContent>
								</Tooltip>
							)}
							{abilityData && (
								<Tooltip>
									<TooltipTrigger asChild>
										<p className="text-sm mt-1 cursor-help">
											<span className="font-semibold">Ability:</span>{" "}
											{abilityData.name}
										</p>
									</TooltipTrigger>
									<TooltipContent>
										<p className="max-w-xs">{abilityData.desc}</p>
									</TooltipContent>
								</Tooltip>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	};

	// Render available moves for a player
	const renderMoves = (player: "p1" | "p2") => {
		const request =
			player === "p1" ? viewState?.p1Request : viewState?.p2Request;

		if (!request?.active?.[0]) {
			if (request?.wait) {
				return (
					<div className="text-gray-500 italic text-center p-4">
						Waiting for opponent...
					</div>
				);
			}
			return (
				<div className="text-gray-500 italic text-center p-4">
					No move selection needed now.
				</div>
			);
		}

		const moves = request.active[0].moves || [];

		return (
			<Card>
				<CardContent className="pt-6">
					<div className="grid grid-cols-2 gap-3">
						{moves.map((move, index) => {
							const moveData = battleEngineRef.current?.getMoveData(move.id);
							if (!moveData) return null;

							const isDisabled = move.disabled;
							const isButtonDisabled = !request || isDisabled || move.pp <= 0;

							return (
								<Tooltip key={move.id}>
									<TooltipTrigger asChild>
										<div>
											<BattleMoveButton
												moveId={move.id}
												name={moveData.name}
												type={moveData.type}
												pp={move.pp}
												maxPp={move.maxpp}
												disabled={isButtonDisabled}
												isDisabled={isDisabled}
												disabledReason={
													isDisabled ? "Move disabled by an effect" : undefined
												}
												onClick={() => {
													if (isButtonDisabled) return;
													handlePlayerDecision(player, index + 1);
												}}
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<div className="space-y-1">
											<p className="font-semibold">{moveData.name}</p>
											<p className="text-sm">
												{moveData.shortDesc || moveData.desc}
											</p>
											<div className="text-xs text-muted-foreground">
												<span>Power: {moveData.basePower}</span>
												<span className="mx-2">•</span>
												<span>
													Accuracy:{" "}
													{moveData.accuracy === true ? "—" : moveData.accuracy}
												</span>
											</div>
										</div>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</CardContent>
			</Card>
		);
	};

	// Render battle logs
	const renderBattleLogs = () => {
		if (!viewState?.logs) return null;

		return (
			<Card className="h-full">
				<CardContent className="p-0">
					<div className="flex items-center justify-between p-4 border-b">
						<Badge variant="outline" className="text-base">
							Turn {viewState.battle.turn}
						</Badge>
					</div>
					<ScrollArea className="h-[400px] p-4">
						{viewState.logs.map((log, index) => {
							const key = `${viewState.battle.turn}-${index}`;
							return (
								<div
									key={key}
									className="mb-2 last:mb-0 protocol-line text-sm leading-relaxed"
									dangerouslySetInnerHTML={{ __html: log }}
								/>
							);
						})}
					</ScrollArea>
				</CardContent>
			</Card>
		);
	};

	if (error) {
		return (
			<Card className="mx-auto max-w-md">
				<CardContent className="p-6">
					<div className="text-red-500 text-center">
						{error}
						{retryCount < maxRetries && (
							<div className="mt-2 text-sm">
								Attempting to reconnect... (Attempt {retryCount + 1}/
								{maxRetries})
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!viewState?.battle) {
		return (
			<Card className="mx-auto max-w-md">
				<CardContent className="p-6">
					<div className="text-center">Loading battle state...</div>
				</CardContent>
			</Card>
		);
	}

	const battle = viewState.battle as Battle & {
		format?: string;
		currentTurn?: number;
		weather?: string;
		winner?: string | null;
		ended?: boolean;
	};

	return (
		<div className="flex flex-col w-full max-w-7xl mx-auto space-y-6">
			{/* Battle Header */}
			{(battle.winner || battle.ended) && (
				<Card className="bg-primary/5 border-primary/20">
					<CardContent className="flex items-center justify-center p-4">
						{battle.winner ? (
							<Badge variant="default" className="text-lg px-6 py-2">
								Winner: {battle.winner}
							</Badge>
						) : (
							<Badge variant="secondary" className="text-lg px-6 py-2">
								Result: Tie
							</Badge>
						)}
					</CardContent>
				</Card>
			)}

			{/* Main Battle Grid */}
			<div className="grid grid-cols-3 gap-6">
				{/* Player 1 */}
				<div className="col-span-1 space-y-4">
					{renderPokemonInfo("p1")}
					{renderMoves("p1")}
				</div>

				{/* Battle Log */}
				<div className="col-span-1">{renderBattleLogs()}</div>

				{/* Player 2 */}
				<div className="col-span-1 space-y-4">
					{renderPokemonInfo("p2")}
					{renderMoves("p2")}
				</div>
			</div>
		</div>
	);
}
