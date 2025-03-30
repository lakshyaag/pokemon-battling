"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
	BattleState,
	PlayerDecision,
	PlayerRequest,
} from "@/services/battle-types";
import type { Battle } from "@pkmn/client";
import { Badge } from "./ui/badge";
import { useSettings } from "@/store/settings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import PlayerDisplay from "./PlayerDisplay";

interface BattleViewProps {
	battleId: string;
	battleState: BattleState;
	playerRequest: PlayerRequest | null;
	playerRole: "p1" | "p2";
	onDecision: (decision: PlayerDecision | null) => void;
	winner: string | null | undefined;
}

/**
 * Component for displaying a Pokémon battle based on server state.
 */
export default function BattleView({
	battleId,
	battleState,
	playerRequest,
	playerRole,
	onDecision,
	winner,
}: BattleViewProps) {
	const { generation } = useSettings();
	const logScrollAreaRef = useRef<HTMLDivElement>(null);

	// Local state for UI selection feedback
	const [selectedDecision, setSelectedDecision] =
		useState<PlayerDecision | null>(null);

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
	}, [battleState?.logs]);

	// Handle internal decision selection and pass up
	const handleLocalDecision = (decision: PlayerDecision | null) => {
		setSelectedDecision(decision);
		onDecision(decision);
	};

	// Reset local selection when a new request comes in or state updates significantly
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setSelectedDecision(null);
	}, [playerRequest, battleState?.battle?.turn]);

	// Render battle logs
	const renderBattleLogs = () => {
		if (!battleState?.logs) return null;
		const turn = battleState.battle?.turn ?? 0;

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
						{battleState.logs.length === 0 && (
							<p className="text-center text-muted-foreground italic mt-4">
								Battle starting...
							</p>
						)}
						{battleState.logs.map((log, index) => {
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

	if (!battleState?.battle) {
		return <div>Waiting for battle data...</div>;
	}

	const battle = battleState.battle as Battle & {
		winner?: string | null;
		ended?: boolean;
	};
	const isEnded = winner !== undefined;

	const opponentRole = playerRole === "p1" ? "p2" : "p1";

	return (
		<div className="flex flex-col w-full max-w-7xl mx-auto space-y-4">
			{/* Battle End State Banner */}
			{isEnded && (
				<Card className="bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
					<CardContent className="flex items-center justify-center p-3">
						{winner &&
						winner !== "Opponent disconnected" &&
						winner !== "error" ? (
							<Badge
								variant="default"
								className="text-base px-4 py-1 bg-green-600 hover:bg-green-700 text-white"
							>
								Winner: {winner}
							</Badge>
						) : winner === "Opponent disconnected" ? (
							<Badge variant="destructive" className="text-base px-4 py-1">
								Opponent Disconnected
							</Badge>
						) : (
							<Badge variant="secondary" className="text-base px-4 py-1">
								Result: {winner === "error" ? "Error" : "Tie"}
							</Badge>
						)}
					</CardContent>
				</Card>
			)}

			{/* Main Battle Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
				{/* Player Display (Client's Player) */}
				<div className="col-span-1">
					<PlayerDisplay
						player={playerRole}
						battle={battle}
						request={playerRequest}
						generation={generation}
						selectedDecision={selectedDecision}
						onDecision={handleLocalDecision}
						isSelf={true}
					/>
				</div>

				{/* Battle Log */}
				<div className="col-span-1 h-full">{renderBattleLogs()}</div>

				{/* Opponent Display */}
				<div className="col-span-1">
					<PlayerDisplay
						player={opponentRole}
						battle={battle}
						request={
							opponentRole === "p1"
								? battleState.p1Request
								: battleState.p2Request
						}
						generation={generation}
						selectedDecision={null}
						onDecision={() => {}}
						isSelf={false}
					/>
				</div>
			</div>
		</div>
	);
}
