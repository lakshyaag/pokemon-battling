"use client";

import React, { useState, useEffect, useRef } from "react";
import type { BattleState, PlayerDecision } from "../services/battle-types";
import type { Battle } from "@pkmn/client";
import type { BattleEngine } from "../services/battle-engine";
import { Badge } from "./ui/badge";
import { battleManager } from "@/services/battle-manager-instance";
import { useSettings } from "@/store/settings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import PlayerDisplay from "./PlayerDisplay";

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
	const [selectedDecisions, setSelectedDecisions] = useState<{
		p1: PlayerDecision | null;
		p2: PlayerDecision | null;
	}>({
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: Trigger scroll on log changes
	useEffect(() => {
		if (logScrollAreaRef.current) {
			const scrollElement = logScrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollElement) {
				scrollElement.scrollTop = scrollElement.scrollHeight;
			}
		}
	}, [viewState?.logs]);

	// Handle player decisions (forward to engine)
	const handlePlayerDecision = (
		player: "p1" | "p2",
		decision: PlayerDecision | null,
	) => {
		if (!battleEngineRef.current || viewState?.battle?.ended) return;

		const otherPlayer = player === "p1" ? "p2" : "p1";
		const currentDecision = decision;
		const otherDecision = selectedDecisions[otherPlayer];

		// Update the local state for visual feedback first
		setSelectedDecisions((prev) => ({
			...prev,
			[player]: currentDecision,
		}));

		// Check if the other player has an active request needing a decision
		const otherPlayerNeedsDecision =
			otherPlayer === "p1"
				? viewState?.p1Request && !viewState.p1Request.wait
				: viewState?.p2Request && !viewState.p2Request.wait;

		// Case 1: Current player made a decision, and the other player DOES NOT need to decide
		if (currentDecision !== null && !otherPlayerNeedsDecision) {
			console.log(`Sending immediate decision for ${player}:`, currentDecision);
			battleEngineRef.current.processPlayerDecision(player, currentDecision);
			// Clear this player's selection immediately after sending
			setSelectedDecisions((prev) => ({ ...prev, [player]: null }));
			// The other player's selection should already be null if they didn't need to decide
			if (otherDecision !== null) {
				console.warn(
					`Cleared unexpected stored decision for ${otherPlayer} during immediate send.`,
				);
				setSelectedDecisions((prev) => ({ ...prev, [otherPlayer]: null }));
			}
		}
		// Case 2: Current player made a decision, AND the other player ALSO needs to decide (and has already decided)
		else if (
			currentDecision !== null &&
			otherPlayerNeedsDecision &&
			otherDecision !== null
		) {
			console.log(
				`Sending simultaneous decisions: P1=${
					player === "p1" ? currentDecision : otherDecision
				}, P2=${player === "p2" ? currentDecision : otherDecision}`,
			);
			// Send decisions (order might matter slightly depending on speed ties, but engine handles it)
			if (player === "p1") {
				battleEngineRef.current.processPlayerDecision("p1", currentDecision);
				battleEngineRef.current.processPlayerDecision("p2", otherDecision);
			} else {
				battleEngineRef.current.processPlayerDecision("p1", otherDecision);
				battleEngineRef.current.processPlayerDecision("p2", currentDecision);
			}
			// Reset selections after sending both
			setSelectedDecisions({ p1: null, p2: null });
		}
		// Case 3: Current player made a decision, but the other player still needs to decide (and hasn't)
		// Do nothing here, just wait for the other player's decision (which will trigger Case 2)

		// Case 4: Player cancelled their decision (decision is null)
		// The state is already updated via setSelectedDecisions above. No engine call needed.
		else if (currentDecision === null) {
			console.log(`Player ${player} cancelled selection.`);
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
						selectedDecision={selectedDecisions.p1}
						onDecision={handlePlayerDecision}
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
						selectedDecision={selectedDecisions.p2}
						onDecision={handlePlayerDecision}
					/>
				</div>
			</div>
		</div>
	);
}
