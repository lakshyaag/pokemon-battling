"use client";

import React, { useState, useEffect, useRef } from "react";
import { BattleService } from "../services/battle.service";
import type { Pokemon } from "@pkmn/client";
import type { BattleRequest } from "../services/player";
import { FORMAT, TYPE_COLORS } from "@/lib/constants";
import BattleMoveButton from "./BattleMoveButton";
import { Badge } from "./ui/badge";
import { getStatusClass } from "@/lib/utils";
import { getStatusName } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface BattleComponentProps {
	format?: string;
	p1Name?: string;
	p2Name?: string;
	p1Team?: string;
	p2Team?: string;
}

/**
 * Interface for battle state
 */
interface BattleState {
	turn: number;
	p1: {
		active: Pokemon | null;
		team: Pokemon[];
		request: BattleRequest | null;
		selectedMove: number | null;
	};
	p2: {
		active: Pokemon | null;
		team: Pokemon[];
		request: BattleRequest | null;
		selectedMove: number | null;
	};
	weather: string;
	status: string;
	logs: string[];
}

/**
 * Component for displaying and interacting with a Pokémon battle
 */
export default function BattleComponent({
	format = FORMAT,
	p1Name = "Player 1",
	p2Name = "Player 2",
	p1Team,
	p2Team,
}: BattleComponentProps) {
	const battleServiceRef = useRef<BattleService | null>(null);
	const [battleState, setBattleState] = useState<BattleState>({
		turn: 0,
		p1: { active: null, team: [], request: null, selectedMove: null },
		p2: { active: null, team: [], request: null, selectedMove: null },
		weather: "none",
		status: "Initializing battle...",
		logs: [],
	});
	const [isInitialized, setIsInitialized] = useState(false);

	// Initialize battle service
	useEffect(() => {
		if (!isInitialized) {
			const battleService = new BattleService({
				format,
				p1Name,
				p2Name,
				p1Team,
				p2Team,
				onBattleUpdate: (state) => {
					setBattleState(state);
				},
			});

			battleServiceRef.current = battleService;
			setIsInitialized(true);

			// Start the battle
			battleService.startBattle(p1Team, p2Team);
		}
	}, [format, p1Name, p2Name, p1Team, p2Team, isInitialized]);

	// Handle move selection for player 1
	const handleP1MoveSelect = (moveIndex: number) => {
		setBattleState((prev) => ({
			...prev,
			p1: { ...prev.p1, selectedMove: moveIndex },
		}));
		battleServiceRef.current?.makeP1Move(moveIndex);
	};

	// Handle move selection for player 2
	const handleP2MoveSelect = (moveIndex: number) => {
		setBattleState((prev) => ({
			...prev,
			p2: { ...prev.p2, selectedMove: moveIndex },
		}));
		battleServiceRef.current?.makeP2Move(moveIndex);
	};

	// Reset selected moves after each turn
	useEffect(() => {
		setBattleState((prev) => ({
			...prev,
			p1: { ...prev.p1, selectedMove: null },
			p2: { ...prev.p2, selectedMove: null },
		}));
	}, []);

	// Parse HP and status from condition string
	const parseCondition = (pokemon?: Pokemon) => {
		if (!pokemon) return { currentHP: 0, maxHP: 0, status: "" };

		const currentHP = pokemon.hp;
		const maxHP = pokemon.maxhp;
		const status = pokemon.status;

		return { currentHP, maxHP, status };
	};

	// Render player's Pokémon information
	const renderPokemonInfo = (player: "p1" | "p2") => {
		const pokemon = battleState[player].active;
		const pokemonFromRequest = battleState[player].request?.side.pokemon[0];

		if (!pokemon) return <div>No active Pokémon</div>;

		const sprite = battleServiceRef.current?.getSprite(pokemon, player);
		const item = pokemonFromRequest?.item
			? battleServiceRef.current?.getItem(pokemonFromRequest.item)
			: null;
		const ability = pokemonFromRequest?.baseAbility
			? battleServiceRef.current?.getAbility(pokemonFromRequest.baseAbility)
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
		const request = battleState[player].request;
		if (!request || !request.active || !request.active[0]) {
			return <div>No moves available</div>;
		}

		const active = request.active[0];
		const moves = active.moves || [];
		const selectedMove = battleState[player].selectedMove;

		return (
			<div className="mt-5">
				<h4 className="text-md font-semibold mb-3">Available Moves</h4>
				<div className="grid grid-cols-2 gap-2">
					{moves.map((move, index) => {
						// Get move details if battleService is available
						const moveData = battleServiceRef.current?.getMoveData(move.id);
						if (!moveData) {
							return null;
						}

						return (
							<BattleMoveButton
								key={move.id}
								moveDetails={move}
								// @ts-ignore - The type error is due to a mismatch between @pkmn/sim and @pkmn/dex-types
								moveData={moveData}
								isSelected={selectedMove === index + 1}
								onClick={() => {
									if (player === "p1") {
										handleP1MoveSelect(index + 1);
									} else {
										handleP2MoveSelect(index + 1);
									}
								}}
								disabled={move.disabled}
							/>
						);
					})}
				</div>
			</div>
		);
	};

	// Render battle logs
	const renderBattleLogs = () => {
		return (
			<div className="h-full flex flex-col">
				<h3 className="text-lg font-semibold mb-3">Battle Log</h3>
				<pre className="text-sm font-medium bg-green-100 border-green-200">
					{FORMAT}
				</pre>
				<div className="flex-1 overflow-y-auto max-h-[400px] p-2.5 border border-gray-200 rounded bg-gray-50">
					{battleState.logs.map((log: string, index: number) => (
						<div
							key={`log-${index}-${Date.now()}`}
							className="mb-1"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
							dangerouslySetInnerHTML={{ __html: log }}
						/>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col w-full max-w-7xl mx-auto p-6 bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl shadow-lg">
			<div className="text-center mb-6">
				<div className="flex justify-center items-center gap-4 mt-2">
					<Badge
						variant="outline"
						className="px-4 py-1.5 text-sm font-medium transition-colors"
					>
						Turn: {battleState.turn}
					</Badge>
					<Badge
						variant="secondary"
						className="px-4 py-1.5 text-sm font-medium"
					>
						{battleState.status}
					</Badge>
					{battleState.weather !== "none" && (
						<Badge
							variant="outline"
							className="px-4 py-1.5 text-sm font-medium bg-blue-100 border-blue-200"
						>
							{battleState.weather}
						</Badge>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_1.2fr] gap-6">
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
					<h3 className="text-xl font-bold mb-4 text-indigo-800">{p1Name}</h3>
					{renderPokemonInfo("p1")}
					{renderMoves("p1")}
				</div>

				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
					{renderBattleLogs()}
				</div>

				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
					<h3 className="text-xl font-bold mb-4 text-indigo-800">{p2Name}</h3>
					{renderPokemonInfo("p2")}
					{renderMoves("p2")}
				</div>
			</div>
		</div>
	);
}
