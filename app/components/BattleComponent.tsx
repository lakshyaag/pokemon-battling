"use client";

import React, { useState, useEffect, useRef } from "react";
import { BattleService } from "../utils/BattleService";
import type { Move, Pokemon } from "@pkmn/sim";

interface BattleComponentProps {
	format?: string;
	p1Name?: string;
	p2Name?: string;
	p1Team?: string;
	p2Team?: string;
}

export interface BattleRequest {
	active: {
		moves: Move[];
	}[];
	side: {
		id: string;
		name: string;
		pokemon: Pokemon[];
	};
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
	};
	p2: {
		active: Pokemon | null;
		team: Pokemon[];
		request: BattleRequest | null;
	};
	weather: string;
	status: string;
	logs: string[];
}

/**
 * Interface for move data
 */
interface MoveData {
	id: string;
	move: string;
	pp: number;
	maxpp: number;
	disabled?: boolean;
}

/**
 * Component for displaying and interacting with a Pokémon battle
 */
export default function BattleComponent({
	format = "gen3randombattle",
	p1Name = "Player 1",
	p2Name = "Player 2",
	p1Team,
	p2Team,
}: BattleComponentProps) {
	const battleServiceRef = useRef<BattleService | null>(null);
	const [battleState, setBattleState] = useState<BattleState>({
		turn: 0,
		p1: { active: null, team: [], request: null },
		p2: { active: null, team: [], request: null },
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
		battleServiceRef.current?.makeP1Move(moveIndex);
	};

	// Handle move selection for player 2
	const handleP2MoveSelect = (moveIndex: number) => {
		battleServiceRef.current?.makeP2Move(moveIndex);
	};

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
		if (!pokemon) return <div>No active Pokémon</div>;

		// Extract HP information from condition
		const { currentHP, maxHP, status } = parseCondition(pokemon);

		// Calculate HP percentage
		const hpPercentage = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;
		let hpColor = "bg-green-500"; // Green
		if (hpPercentage <= 50) hpColor = "bg-yellow-500"; // Yellow
		if (hpPercentage <= 20) hpColor = "bg-red-500"; // Red

		return (
			<div className="mb-5">
				<h3 className="text-lg font-semibold mb-2">{pokemon.name}</h3>
				<div className="mb-2">
					<div className="flex justify-between mb-1">
						<span>HP:</span>
						<span>
							{currentHP}/{maxHP}
						</span>
					</div>
					<div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
						<div
							className={`h-full ${hpColor} transition-all duration-300`}
							style={{ width: `${hpPercentage}%` }}
						/>
					</div>
				</div>
				{status && (
					<div
						className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-2 ${getStatusClass(status)}`}
					>
						{getStatusName(status)}
					</div>
				)}
			</div>
		);
	};

	// Get status class for styling
	const getStatusClass = (status: string): string => {
		switch (status.toLowerCase()) {
			case "par":
				return "bg-yellow-400 text-yellow-900";
			case "psn":
			case "tox":
				return "bg-purple-600 text-white";
			case "brn":
				return "bg-orange-500 text-white";
			case "slp":
				return "bg-gray-400 text-gray-900";
			case "frz":
				return "bg-blue-300 text-blue-900";
			default:
				return "bg-gray-600 text-white";
		}
	};

	// Get status display name
	const getStatusName = (status: string): string => {
		switch (status.toLowerCase()) {
			case "par":
				return "Paralyzed";
			case "psn":
				return "Poisoned";
			case "tox":
				return "Badly Poisoned";
			case "brn":
				return "Burned";
			case "slp":
				return "Asleep";
			case "frz":
				return "Frozen";
			default:
				return status;
		}
	};

	// Get type class for styling
	const getTypeClass = (type?: string): string => {
		if (!type) return "bg-gray-500 text-white";

		switch (type.toLowerCase()) {
			case "normal":
				return "bg-gray-400 text-gray-900";
			case "fighting":
				return "bg-red-700 text-white";
			case "flying":
				return "bg-indigo-300 text-indigo-900";
			case "poison":
				return "bg-purple-600 text-white";
			case "ground":
				return "bg-yellow-600 text-white";
			case "rock":
				return "bg-yellow-800 text-white";
			case "bug":
				return "bg-green-600 text-white";
			case "ghost":
				return "bg-purple-800 text-white";
			case "steel":
				return "bg-gray-400 text-gray-900";
			case "fire":
				return "bg-orange-500 text-white";
			case "water":
				return "bg-blue-500 text-white";
			case "grass":
				return "bg-green-500 text-white";
			case "electric":
				return "bg-yellow-400 text-yellow-900";
			case "psychic":
				return "bg-pink-500 text-white";
			case "ice":
				return "bg-blue-300 text-blue-900";
			case "dragon":
				return "bg-indigo-600 text-white";
			case "dark":
				return "bg-gray-700 text-white";
			case "fairy":
				return "bg-pink-300 text-pink-900";
			default:
				return "bg-gray-500 text-white";
		}
	};

	// Render available moves for a player
	const renderMoves = (player: "p1" | "p2") => {
		const request = battleState[player].request;
		if (!request || !request.active || !request.active[0]) {
			return <div>No moves available</div>;
		}

		const active = request.active[0];
		const moves = active.moves || [];

		return (
			<div className="mt-5">
				<h4 className="text-md font-semibold mb-3">Available Moves</h4>
				<div className="grid grid-cols-2 gap-2">
					{moves.map((move: MoveData, index: number) => {
						// Get move details if battleService is available
						const moveData = battleServiceRef.current?.getMoveData(
							move.id || move.move,
						);

						return (
							<button
								key={move.id || move.move}
								type="button"
								className={`p-2.5 rounded border text-left transition-colors ${
									move.disabled
										? "border-gray-300 bg-gray-100 opacity-70 cursor-not-allowed"
										: "border-green-500 bg-green-50 hover:bg-green-100"
								}`}
								onClick={() =>
									player === "p1"
										? handleP1MoveSelect(index + 1)
										: handleP2MoveSelect(index + 1)
								}
								disabled={move.disabled}
							>
								<div className="flex justify-between items-center mb-1">
									<span className="font-semibold">{move.move}</span>
									{moveData && (
										<span
											className={`px-1.5 py-0.5 rounded text-xs ${getTypeClass(moveData.type)}`}
										>
											{moveData.type}
										</span>
									)}
								</div>
								<div className="grid grid-cols-3 text-xs">
									<span>
										PP: {move.pp}/{move.maxpp}
									</span>
									{moveData && (
										<>
											<span>Power: {moveData.basePower || "-"}</span>
											<span>
												Acc:{" "}
												{moveData.accuracy === true ? "-" : moveData.accuracy}
											</span>
										</>
									)}
								</div>
							</button>
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
		<div className="flex flex-col w-full max-w-6xl mx-auto p-5 bg-gray-100 rounded-lg shadow-md">
			<div className="text-center mb-5">
				<h2 className="text-2xl font-bold">Pokémon Battle</h2>
				<div className="flex justify-center gap-5 mt-2.5">
					<span>Turn: {battleState.turn}</span>
					<span>{battleState.status}</span>
					{battleState.weather !== "none" && (
						<span>Weather: {battleState.weather}</span>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-5">
				<div className="bg-white p-4 rounded-lg shadow">
					<h3 className="text-xl font-semibold mb-3">{p1Name}</h3>
					{renderPokemonInfo("p1")}
					{renderMoves("p1")}
				</div>

				<div className="bg-white p-4 rounded-lg shadow">
					{renderBattleLogs()}
				</div>

				<div className="bg-white p-4 rounded-lg shadow">
					<h3 className="text-xl font-semibold mb-3">{p2Name}</h3>
					{renderPokemonInfo("p2")}
					{renderMoves("p2")}
				</div>
			</div>
		</div>
	);
}
