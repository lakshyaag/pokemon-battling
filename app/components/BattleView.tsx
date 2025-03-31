"use client";

import React, { useState, useEffect, useRef } from "react";
import type { PlayerDecision, PlayerRequest } from "@/lib/battle-types";
import type { Battle } from "@pkmn/client";
import { Badge } from "@/components/ui/badge";
import { generation } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerDisplay from "@/components/PlayerDisplay";

interface BattleViewProps {
	battleId: string;
	clientBattle: Battle;
	formattedLogs: string[];
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
	clientBattle,
	formattedLogs,
	playerRequest,
	playerRole,
	onDecision,
	winner,
}: BattleViewProps) {
	const logScrollAreaRef = useRef<HTMLDivElement>(null);
	const [selectedDecision, setSelectedDecision] =
		useState<PlayerDecision | null>(null);

	// Scroll logs to bottom when they update
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (logScrollAreaRef.current) {
			const scrollElement = logScrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollElement) {
				scrollElement.scrollTop = scrollElement.scrollHeight;
			}
		}
	}, [formattedLogs]);

	// Handle internal decision selection and pass up
	const handleLocalDecision = (decision: PlayerDecision | null) => {
		setSelectedDecision(decision);
		onDecision(decision);
	};

	// Reset local selection when a new request comes in or turn changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setSelectedDecision(null);
	}, [playerRequest, clientBattle?.turn]);

	// Render battle logs from formatted logs prop
	const renderBattleLogs = () => {
		const turn = clientBattle?.turn ?? 0;

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
						{formattedLogs.length === 0 && (
							<p className="text-center text-muted-foreground italic mt-4">
								Battle starting...
							</p>
						)}
						{formattedLogs.map((log, index) => {
							const key = `${turn}-${index}-${log.substring(0, 10)}`;
							return (
								<div
									key={key}
									className="mb-1 last:mb-0 protocol-line text-sm leading-normal [&_b]:font-semibold"
									// Logs are pre-formatted HTML from LogFormatter
									dangerouslySetInnerHTML={{ __html: log }}
								/>
							);
						})}
					</ScrollArea>
				</CardContent>
			</Card>
		);
	};

	if (!clientBattle) {
		return <div>Waiting for battle data...</div>;
	}

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
				{/* Player Display (Self) */}
				<div className="col-span-1">
					<PlayerDisplay
						player={playerRole}
						battle={clientBattle}
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
						battle={clientBattle}
						request={null} // Opponent requests not needed
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
