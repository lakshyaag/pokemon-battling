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
			<div className="flex flex-col items-center space-y-4">
				<div className="relative">
					<img
						src={spriteUrl}
						alt={pokemon.name}
						className="w-32 h-32 object-contain pixelated"
					/>
					{status && (
						<Badge variant="secondary" className="absolute bottom-0 right-0">
							{status}
						</Badge>
					)}
				</div>
				<div className="text-center">
					<h3 className="text-lg font-bold">{pokemon.name}</h3>
					<div className="flex gap-2 justify-center">
						{pokemon.types.map((type) => (
							<Badge key={type} variant="outline">
								{type}
							</Badge>
						))}
					</div>
					<div className="mt-2">
						<div className="h-2 w-full bg-gray-200 rounded-full">
							<div
								className={`h-full ${hpColor} rounded-full`}
								style={{ width: `${hpPercentage}%` }}
							/>
						</div>
						<p className="text-sm mt-1">
							{currentHP} / {maxHP} HP
						</p>
					</div>
					{itemData && (
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="text-sm mt-1 cursor-help">
									<span className="font-semibold">Item:</span> {itemData.name}
								</p>
							</TooltipTrigger>
							<TooltipContent>
								<p>{itemData.desc}</p>
							</TooltipContent>
						</Tooltip>
					)}
					{abilityData && (
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="text-sm cursor-help">
									<span className="font-semibold">Ability:</span>{" "}
									{abilityData.name}
								</p>
							</TooltipTrigger>
							<TooltipContent>
								<p>{abilityData.desc}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		);
	};

	// Render available moves for a player
	const renderMoves = (player: "p1" | "p2") => {
		const request =
			player === "p1" ? viewState?.p1Request : viewState?.p2Request;

		if (!request?.active?.[0]) {
			if (request?.wait) {
				return (
					<div className="text-gray-500 italic">Waiting for opponent...</div>
				);
			}
			return (
				<div className="text-gray-500 italic">
					No move selection needed now.
				</div>
			);
		}

		const moves = request.active[0].moves || [];

		return (
			<div className="grid grid-cols-2 gap-3">
				{moves.map((move, index) => {
					const moveData = battleEngineRef.current?.getMoveData(move.id);
					if (!moveData) return null;

					const isDisabled = move.disabled;
					const isButtonDisabled = !request || isDisabled || move.pp <= 0;

					return (
						<BattleMoveButton
							key={move.id}
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
					);
				})}
			</div>
		);
	};

	// Render battle logs
	const renderBattleLogs = () => {
		if (!viewState?.battle) return <div>Loading battle logs...</div>;

		return (
			<div className="h-full flex flex-col">
				<h3 className="text-lg font-semibold mb-3">Battle Log</h3>
				<pre className="text-sm font-medium bg-gray-100 border-gray-200 p-1 rounded">
					Format: {(viewState.battle as any).format || "Unknown"} Turn:{" "}
					{viewState.battle.turn}
				</pre>
				<div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-2">
					{viewState.logs.map((log) => (
						<div
							key={log}
							className="text-sm leading-relaxed protocol-line"
							dangerouslySetInnerHTML={{ __html: log }}
						/>
					))}
				</div>
			</div>
		);
	};

	if (error) {
		return (
			<div className="text-red-500 text-center p-4">
				{error}
				{retryCount < maxRetries && (
					<div className="mt-2">
						Attempting to reconnect... (Attempt {retryCount + 1}/{maxRetries})
					</div>
				)}
			</div>
		);
	}

	if (!viewState?.battle) {
		return <div className="text-center p-4">Loading battle state...</div>;
	}

	const battle = viewState.battle as Battle & {
		format?: string;
		currentTurn?: number;
		weather?: string;
		winner?: string | null;
		ended?: boolean;
	};

	return (
		<div className="flex flex-col w-full max-w-7xl mx-auto p-6 space-y-6">
			{/* Battle Header */}
			<div className="flex items-center justify-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-lg px-4 py-2">
						Turn: {battle.turn}
					</Badge>
					<Badge variant="secondary" className="text-lg px-4 py-2">
						Current Turn: {battle.currentTurn || battle.turn}
					</Badge>
				</div>
				{battle.weather && battle.weather !== "none" && (
					<Badge variant="outline" className="text-lg px-4 py-2">
						{battle.weather}
					</Badge>
				)}
				{battle.winner && (
					<Badge variant="destructive" className="text-lg px-4 py-2">
						Winner: {battle.winner}
					</Badge>
				)}
				{battle.ended && !battle.winner && (
					<Badge variant="secondary" className="text-lg px-4 py-2">
						Result: Tie
					</Badge>
				)}
			</div>

			{/* Main Battle Grid */}
			<div className="grid grid-cols-3 gap-6">
				{/* Player 1 */}
				<div className="col-span-1">
					{renderPokemonInfo("p1")}
					{renderMoves("p1")}
				</div>

				{/* Battle Log */}
				<div className="col-span-1">{renderBattleLogs()}</div>

				{/* Player 2 */}
				<div className="col-span-1">
					{renderPokemonInfo("p2")}
					{renderMoves("p2")}
				</div>
			</div>
		</div>
	);
}
