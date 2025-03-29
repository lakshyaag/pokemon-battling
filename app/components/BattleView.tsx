"use client";

import React, { useState, useEffect, useRef } from "react";
import type { BattleState, PlayerRequest } from "../services/battle-types";
import type { Battle } from "@pkmn/client";
import type { BattleEngine } from "../services/battle-engine";
import { Badge } from "./ui/badge";
import { battleManager } from "@/services/battle-manager-instance";
import { useSettings } from "@/store/settings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import PlayerDisplay from "./PlayerDisplay";

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
	const logScrollAreaRef = useRef<HTMLDivElement>(null);
	const [selectedMoves, setSelectedMoves] = useState<{ p1: number | null; p2: number | null }>({
		p1: null,
		p2: null,
	});

	// Effect for initializing battle and subscribing to updates
	useEffect(() => {
		let retryTimeout: NodeJS.Timeout;
		let mounted = true;

		const initializeBattle = () => {
			const engine = battleManager.getBattle(battleId);
			if (!engine) {
				if (retryCount < maxRetries) {
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

			// Initial state fetch
			setViewState({
				battle: engine.getBattle(),
				logs: [...engine.getLogs()],
				p1Request: engine.getP1Request(),
				p2Request: engine.getP2Request(),
			});
			setError(null);
			setRetryCount(0);

			const unsubscribe = engine.on("stateUpdate", (state) => {
				if (mounted) {
					setViewState(state);
				}
			});
			const unsubscribeEnd = engine.on("battleEnd", ({ winner, state }) => {
				if (mounted) {
					console.log(`Battle ${battleId} ended. Winner: ${winner}`);
					// Ensure the final state with winner/ended status is set
					setViewState((prev) => ({
						...(prev ?? {
							battle: null,
							logs: [],
							p1Request: null,
							p2Request: null,
						}),
						battle: state,
					}));
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
			if (retryTimeout) clearTimeout(retryTimeout);
			if (cleanup) cleanup();
		};
	}, [battleId, retryCount]);

	// Effect for auto-scrolling logs
	useEffect(() => {
		if (logScrollAreaRef.current) {
			const scrollElement = logScrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollElement) {
				scrollElement.scrollTop = scrollElement.scrollHeight;
			}
		}
	}, [viewState?.logs]); // Trigger scroll on log changes

	// Handle player decisions (forward to engine)
	const handlePlayerDecision = (player: "p1" | "p2", moveIndex: number | null) => {
		if (!battleEngineRef.current || viewState?.battle?.ended) return;

		setSelectedMoves((prev) => ({
			...prev,
			[player]: moveIndex,
		}));

		// Only execute the turn if both players have selected their moves
		if (moveIndex !== null && player === "p2" && selectedMoves.p1 !== null) {
			// Execute both moves
			battleEngineRef.current.processPlayerDecision("p1", {
				type: "move",
				moveIndex: selectedMoves.p1,
			});
			battleEngineRef.current.processPlayerDecision("p2", {
				type: "move",
				moveIndex: moveIndex,
			});
			// Reset selections
			setSelectedMoves({ p1: null, p2: null });
		} else if (moveIndex !== null && player === "p1" && selectedMoves.p2 !== null) {
			// Execute both moves
			battleEngineRef.current.processPlayerDecision("p1", {
				type: "move",
				moveIndex: moveIndex,
			});
			battleEngineRef.current.processPlayerDecision("p2", {
				type: "move",
				moveIndex: selectedMoves.p2,
			});
			// Reset selections
			setSelectedMoves({ p1: null, p2: null });
		}
	};

	// Render battle logs
	const renderBattleLogs = () => {
		if (!viewState?.logs) return null;

		// Try to get turn from battle object, default to 0
		const turn = viewState.battle?.turn ?? 0;

		return (
			<Card className="h-full flex flex-col">
				<CardHeader className="py-3 px-4 border-b">
					<CardTitle className="text-lg font-semibold">Battle Log</CardTitle>
				</CardHeader>
				<CardContent className="p-0 flex-grow overflow-hidden">
					<ScrollArea
						className="h-[calc(100vh-250px)] p-4"
						ref={logScrollAreaRef}
					>
						{viewState.logs.length === 0 && (
							<p className="text-center text-muted-foreground italic mt-4">
								Battle starting...
							</p>
						)}
						{viewState.logs.map((log, index) => {
							// Use turn and index for a more stable key during re-renders
							const key = `${turn}-${index}-${log.substring(0, 10)}`;
							return (
								<div
									key={key}
									className="mb-1 last:mb-0 protocol-line text-sm leading-normal [&_b]:font-semibold"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized by LogFormatter
									dangerouslySetInnerHTML={{ __html: log }}
								/>
							);
						})}
					</ScrollArea>
				</CardContent>
			</Card>
		);
	};

	// Error and Loading States
	if (error) {
		return (
			<Card className="mx-auto max-w-md mt-10">
				<CardContent className="p-6">
					<div className="text-destructive text-center font-medium">
						{error}
						{retryCount < maxRetries && (
							<div className="mt-2 text-sm text-muted-foreground">
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
			<Card className="mx-auto max-w-xs mt-10">
				<CardContent className="p-6">
					<div className="text-center text-muted-foreground animate-pulse">
						Loading Battle...
					</div>
				</CardContent>
			</Card>
		);
	}

	// Get the battle object with extended type assertion for winner/ended
	const battle = viewState.battle as Battle & {
		winner?: string | null;
		ended?: boolean;
	};

	return (
		<div className="flex flex-col w-full max-w-7xl mx-auto space-y-4">
			{/* Battle End State Banner */}
			{(battle.winner || battle.ended) && !battle.winner && (
				<Card className="bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
					<CardContent className="flex items-center justify-center p-3">
						{battle.winner ? (
							<Badge
								variant="default"
								className="text-base px-4 py-1 bg-green-600 hover:bg-green-700 text-white"
							>
								Winner: {battle.winner}
							</Badge>
						) : (
							<Badge variant="secondary" className="text-base px-4 py-1">
								Result: Tie
							</Badge>
						)}
					</CardContent>
				</Card>
			)}

			{/* Main Battle Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
				{/* Player 1 */}
				<div className="col-span-1">
					<PlayerDisplay
						player="p1"
						battle={battle}
						request={viewState.p1Request}
						generation={generation}
						engine={battleEngineRef.current}
						selectedMove={selectedMoves.p1}
						onMoveSelect={handlePlayerDecision}
					/>
				</div>

				{/* Battle Log */}
				<div className="col-span-1 h-full">{renderBattleLogs()}</div>

				{/* Player 2 */}
				<div className="col-span-1">
					<PlayerDisplay
						player="p2"
						battle={battle}
						request={viewState.p2Request}
						generation={generation}
						engine={battleEngineRef.current}
						selectedMove={selectedMoves.p2}
						onMoveSelect={handlePlayerDecision}
					/>
				</div>
			</div>
		</div>
	);
}
