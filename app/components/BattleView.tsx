"use client";

import React, { useState, useEffect, useRef } from "react";
import type { BattleState } from "../services/battle-types";
import type { Pokemon } from "@pkmn/client";
import type { BattleEngine } from "../services/battle-engine";
import { TYPE_COLORS } from "@/lib/constants";
import BattleMoveButton from "./BattleMoveButton";
import { Badge } from "./ui/badge";
import { getStatusClass, getStatusName } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { getSprite } from "../utils/pokemonUtils";
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
	const [battleState, setBattleState] = useState<BattleState | null>(null);
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
				setBattleState(null);
				return;
			}

			if (!mounted) return;

			battleEngineRef.current = engine;
			setBattleState(engine.getState());
			setError(null);
			setRetryCount(0);

			// Subscribe to state updates
			const unsubscribe = engine.on("stateUpdate", (state) => {
				if (mounted) {
					setBattleState(state);
				}
			});

			// Handle battle end
			const unsubscribeEnd = engine.on("battleEnd", ({ winner }) => {
				if (mounted) {
					console.log(`Battle ${battleId} ended. Winner: ${winner}`);
					setBattleState((prev) =>
						prev ? { ...prev, isComplete: true, winner } : null,
					);
				}
			});

			// Cleanup: unsubscribe when component unmounts or battleId changes
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
		if (!battleState || battleState.isComplete) return;

		try {
			battleManager.makePlayerMove(battleId, player, {
				type: "move",
				moveIndex,
			});
		} catch (err) {
			console.error(
				`Error making move for ${player} in battle ${battleId}:`,
				err,
			);
			setError(
				`Failed to make move for ${player}. The move might be disabled or unavailable.`,
			);
			// Clear error after 3 seconds
			setTimeout(() => setError(null), 3000);
		}
	};

	// Handle move selection for player 1
	const handleP1MoveSelect = (moveIndex: number) => {
		handlePlayerDecision("p1", moveIndex);
	};

	// Handle move selection for player 2
	const handleP2MoveSelect = (moveIndex: number) => {
		handlePlayerDecision("p2", moveIndex);
	};

	// Parse HP and status from condition string
	const parseCondition = (pokemon?: Pokemon | null) => {
		if (!pokemon) return { currentHP: 0, maxHP: 0, status: "" };

		const currentHP = pokemon.hp;
		const maxHP = pokemon.maxhp;
		const status = pokemon.status;

		return { currentHP, maxHP, status };
	};

	// Render player's Pokémon information
	const renderPokemonInfo = (player: "p1" | "p2") => {
		if (!battleState) return <div>Loading battle state...</div>;

		const pokemon = battleState[player].active;
		const pokemonFromRequest = battleState[player].request?.side.pokemon[0];

		if (!pokemon) return <div>No active Pokémon</div>;

		const sprite = getSprite(pokemon, player, generation);
		const item = pokemonFromRequest?.item
			? battleEngineRef.current?.getItem(pokemonFromRequest.item)
			: null;
		const ability = pokemonFromRequest?.baseAbility
			? battleEngineRef.current?.getAbility(pokemonFromRequest.baseAbility)
			: null;

		// Extract HP information from condition
		const { currentHP, maxHP, status } = parseCondition(pokemon);

		// Calculate HP percentage
		const hpPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
		let hpColor = "bg-green-500"; // Green
		if (hpPercentage <= 50) hpColor = "bg-yellow-500"; // Yellow
		if (hpPercentage <= 20) hpColor = "bg-red-500"; // Red

		return (
			<div className="mb-5">
				<div className="flex items-center mb-3">
					<img
						src={sprite?.url}
						alt={pokemon.name}
						className="w-24 h-24 mr-3"
					/>
					<div>
						<h3 className="text-lg font-semibold">{pokemon.name}</h3>
						{pokemon.types && (
							<div className="flex gap-1 mt-1">
								{pokemon.types.map((type) => (
									<Badge
										key={type}
										variant="secondary"
										className={`${TYPE_COLORS[type]} text-white text-xs px-2 py-0`}
									>
										{type}
									</Badge>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="mb-3">
					<div className="flex justify-between mb-1">
						<span className="font-medium">HP:</span>
						<span className="font-medium">
							{currentHP}/{maxHP} ({Math.round(hpPercentage)}%)
						</span>
					</div>
					<div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
						<div
							className={`h-full ${hpColor} transition-all duration-300`}
							style={{ width: `${hpPercentage}%` }}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1 mb-1">
					{item && (
						<div className="flex justify-between">
							<span className="font-medium">Item:</span>

							<Tooltip>
								<TooltipTrigger asChild>
									<span className="font-medium">{item.name}</span>
								</TooltipTrigger>
								<TooltipContent>
									<span>{item.desc}</span>
								</TooltipContent>
							</Tooltip>
						</div>
					)}
					{ability && (
						<div className="flex justify-between">
							<span className="font-medium">Ability:</span>

							<Tooltip>
								<TooltipTrigger asChild>
									<span className="font-medium">{ability.name}</span>
								</TooltipTrigger>
								<TooltipContent>
									<span>{ability.desc}</span>
								</TooltipContent>
							</Tooltip>
						</div>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					{status && (
						<div
							className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusClass(status)}`}
						>
							{getStatusName(status)}
						</div>
					)}
				</div>
			</div>
		);
	};

	// Render available moves for a player
	const renderMoves = (player: "p1" | "p2") => {
		if (!battleState) return <div>Loading battle state...</div>;

		const request = battleState[player].request;
		if (!request || !request.active || !request.active[0]) {
			return <div className="text-gray-500 italic">No moves available</div>;
		}

		const active = request.active[0];
		const moves = active.moves || [];
		const selectedMove = battleState[player].selectedMove;

		return (
			<div className="grid grid-cols-2 gap-3">
				{moves.map((move, index) => {
					const moveData = battleEngineRef.current?.getMoveData(move.id);
					if (!moveData) return null;

					const isDisabled = move.disabled;
					let disabledReason = "";
					if (isDisabled) {
						disabledReason = "This move is currently disabled";
					}

					// Check if this move is the selected one
					const isSelected = selectedMove?.type === "move" && 
						selectedMove.moveIndex === (index + 1);

					return (
						<BattleMoveButton
							key={move.id}
							move={moveData}
							disabled={!!selectedMove && !isSelected}
							isDisabled={isDisabled}
							disabledReason={disabledReason}
							pp={move.pp}
							maxPp={move.maxpp}
							isSelected={isSelected}
							onClick={() => {
								if (isDisabled || move.pp <= 0) return;
								if (player === "p1") {
									handleP1MoveSelect(index + 1);
								} else {
									handleP2MoveSelect(index + 1);
								}
							}}
						/>
					);
				})}
			</div>
		);
	};

	// Render battle logs
	const renderBattleLogs = () => {
		if (!battleState) return <div>Loading battle logs...</div>;

		// Convert logs array to objects with unique IDs
		const logsWithIds: BattleLog[] = battleState.logs.map((log, index) => ({
			id: `${battleId}-log-${index}-${Date.now()}`,
			html: log,
		}));

		return (
			<div className="h-full flex flex-col">
				<h3 className="text-lg font-semibold mb-3">Battle Log</h3>
				{battleEngineRef.current && (
					<pre className="text-sm font-medium bg-green-100 border-green-200">
						{battleState.format || "Random Battle"}
					</pre>
				)}
				<div className="flex-1 overflow-y-auto mt-3 space-y-1">
					{logsWithIds.map((log) => (
						<div
							key={log.id}
							className="text-sm"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: Battle logs are sanitized by the battle engine
							dangerouslySetInnerHTML={{ __html: log.html }}
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

	if (!battleState) {
		return <div className="text-center p-4">Loading battle state...</div>;
	}

	return (
		<div className="flex flex-col w-full max-w-7xl mx-auto p-6 space-y-6">
			{/* Battle Header */}
			<div className="flex items-center justify-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-lg px-4 py-2">
						Turn: {battleState.turn}
					</Badge>
					<Badge variant="secondary" className="text-lg px-4 py-2">
						Current Turn: {battleState.currentTurn || battleState.turn}
					</Badge>
				</div>
				{battleState.weather !== "none" && (
					<Badge variant="outline" className="text-lg px-4 py-2">
						{battleState.weather}
					</Badge>
				)}
			</div>

			{/* Main Battle Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_1.2fr] gap-6">
				{/* Player 1 */}
				<div className="flex flex-col gap-4">
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<h3 className="text-2xl font-bold mb-6 text-indigo-800 border-b pb-2">
							{battleState.p1.name}
						</h3>
						{renderPokemonInfo("p1")}
					</div>
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<h4 className="text-lg font-semibold mb-4 text-gray-700">
							Available Moves
						</h4>
						{renderMoves("p1")}
						{battleState.p1.selectedMove && (
							<div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
								<p className="text-sm font-medium text-indigo-800">
									Selected:{" "}
									{battleState.p1.selectedMove.type === "move"
										? `Move ${battleState.p1.selectedMove.moveIndex}`
										: battleState.p1.selectedMove.type}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Battle Log */}
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
					{renderBattleLogs()}
				</div>

				{/* Player 2 */}
				<div className="flex flex-col gap-4">
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<h3 className="text-2xl font-bold mb-6 text-indigo-800 border-b pb-2">
							{battleState.p2.name}
						</h3>
						{renderPokemonInfo("p2")}
					</div>
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<h4 className="text-lg font-semibold mb-4 text-gray-700">
							Available Moves
						</h4>
						{renderMoves("p2")}
						{battleState.p2.selectedMove && (
							<div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
								<p className="text-sm font-medium text-indigo-800">
									Selected:{" "}
									{battleState.p2.selectedMove.type === "move"
										? `Move ${battleState.p2.selectedMove.moveIndex}`
										: battleState.p2.selectedMove.type}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
