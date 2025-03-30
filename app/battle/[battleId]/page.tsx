"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import BattleView from "@/components/BattleView";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { useSocketStore } from "@/store/socket";
import { useSettings } from "@/store/settings";
import type {
	PlayerDecision,
	PlayerId,
	PlayerRequest,
} from "@/lib/battle-types";
import { Card, CardContent } from "@/components/ui/card";

// Import @pkmn/client and related packages
import { Battle } from "@pkmn/client";
import { Protocol } from "@pkmn/protocol";
import { LogFormatter } from "@pkmn/view";
import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/sim";

export default function BattlePage() {
	const router = useRouter();
	const params = useParams();
	const battleId = params.battleId as string;

	const { generation } = useSettings();
	const { socket, userId, emit, isConnected } = useSocketStore();

	// Client-side Battle State
	const battleRef = useRef<Battle | null>(null);
	const formatterRef = useRef<LogFormatter | null>(null);
	const [clientBattleState, setClientBattleState] = useState<Battle | null>(
		null,
	);
	const [formattedLogs, setFormattedLogs] = useState<string[]>([]);
	const [playerRequest, setPlayerRequest] = useState<PlayerRequest | null>(
		null,
	);
	const [playerRole, setPlayerRole] = useState<"p1" | "p2" | null>(null);
	const [winner, setWinner] = useState<string | null | undefined>(undefined);
	const [error, setError] = useState<string | null>(null);
	const [loadingMessage, setLoadingMessage] = useState<string>(
		"Connecting to battle...",
	);

	// Initialize client-side battle object
	useEffect(() => {
		if (!battleRef.current) {
			// @ts-ignore Need to initialize Generations/Dex for client Battle options
			const gens = new Generations(Dex);
			battleRef.current = new Battle(gens);
			formatterRef.current = new LogFormatter("p1", battleRef.current);
			console.log("Initialized client-side Battle object and LogFormatter.");
		}
	}, []);

	// Update formatter side when playerRole is known
	useEffect(() => {
		if (playerRole && formatterRef.current && battleRef.current) {
			formatterRef.current = new LogFormatter(playerRole, battleRef.current);
			console.log(`LogFormatter perspective set to: ${playerRole}`);
		}
	}, [playerRole]);

	// Function to process incoming protocol lines
	const processProtocolLines = useCallback(
		(lines: string[]) => {
			if (!battleRef.current || !formatterRef.current) return;

			const currentLogs: string[] = [];
			let latestRequest: PlayerRequest | null = null;

			for (const line of lines) {
				if (!line) continue;
				try {
					const { args, kwArgs } = Protocol.parseBattleLine(line);
					// Format log line
					const html = formatterRef.current.formatHTML(args, kwArgs);
					if (html) {
						currentLogs.push(html);
					}

					// Add to client battle state
					battleRef.current.add(args, kwArgs);

					// Check if this line is a request for *this* player
					if (args[0] === "request" && playerRole) {
						const requestData = JSON.parse(args[1] as string) as PlayerRequest;
						// Check if the request ID matches our side
						if (requestData.side && requestData.side.id === playerRole) {
							latestRequest = requestData;
						}
					}
					// Check for error lines directed at this player
					if (args[0] === "error") {
						setError(`Battle Error: ${args[1]}`);
					}
				} catch (e) {
					console.error(`Error processing protocol line: "${line}"`, e);
					currentLogs.push(
						`<div class="text-destructive">Error processing: ${line}</div>`,
					);
				}
			}

			// Update battle state after processing all lines in the batch
			battleRef.current.update();

			// Update React state
			setFormattedLogs((prev) => [...prev, ...(currentLogs as string[])]);
			if (latestRequest !== null) {
				setPlayerRequest(latestRequest);
			} else if (battleRef.current[playerRole!]?.request?.active === null) {
				setPlayerRequest(null);
			}

			// Force update of the battle state object for reactivity
			setClientBattleState(
				Object.assign(
					Object.create(Object.getPrototypeOf(battleRef.current)),
					battleRef.current,
				),
			);
		},
		[playerRole],
	);

	// Socket Listeners Effect
	useEffect(() => {
		if (!socket || !isConnected || !battleId || !userId) {
			if (!isConnected) setLoadingMessage("Connecting to server...");
			else if (!userId) setLoadingMessage("Identifying user...");
			else setLoadingMessage("Waiting for connection details...");
			return;
		}

		setLoadingMessage(`Joining battle ${battleId}...`);
		emit("client:join_battle", { battleId, userId });

		const handleProtocol = (data: { battleId: string; lines: string[] }) => {
			if (data.battleId === battleId) {
				processProtocolLines(data.lines);
				setLoadingMessage("");
				setError(null);
			}
		};

		const handleBattleJoined = (data: {
			battleId: string;
			playerRole: PlayerId;
			opponentUserId?: string;
		}) => {
			if (data.battleId === battleId) {
				console.log(
					`[Battle ${battleId}] Joined as ${data.playerRole}. Opponent: ${data.opponentUserId || "Waiting..."}`,
				);
				setPlayerRole(data.playerRole);
				setLoadingMessage(
					data.opponentUserId
						? "Opponent joined! Starting..."
						: "Waiting for opponent...",
				);
			}
		};

		const handleBattleEnd = (data: {
			battleId: string;
			winner: string | null;
		}) => {
			if (data.battleId === battleId) {
				console.log(
					`[Battle ${battleId}] Battle ended. Winner: ${data.winner}`,
				);
				setPlayerRequest(null);
				setWinner(data.winner);
				setLoadingMessage("");
			}
		};

		const handleOpponentDisconnect = (data: {
			battleId: string;
			message: string;
		}) => {
			if (data.battleId === battleId) {
				console.log(`[Battle ${battleId}] Opponent disconnected.`);
				setError(data.message);
				setWinner("Opponent disconnected");
				setLoadingMessage("");
			}
		};

		const handleError = (data: { message: string }) => {
			console.error(`[Battle ${battleId}] Server error:`, data.message);
			setError(data.message);
			setLoadingMessage("");
		};

		socket.on("server:protocol", handleProtocol);
		socket.on("server:battle_joined", handleBattleJoined);
		socket.on("server:battle_end", handleBattleEnd);
		socket.on("server:opponent_disconnected", handleOpponentDisconnect);
		socket.on("server:error", handleError);

		return () => {
			console.log(`[Battle ${battleId}] Leaving page. Cleaning up listeners.`);
			socket.off("server:protocol", handleProtocol);
			socket.off("server:battle_joined", handleBattleJoined);
			socket.off("server:battle_end", handleBattleEnd);
			socket.off("server:opponent_disconnected", handleOpponentDisconnect);
			socket.off("server:error", handleError);
		};
	}, [socket, isConnected, battleId, userId, emit, processProtocolLines]);

	const handlePlayerDecision = (decision: PlayerDecision | null) => {
		if (!battleId || !playerRole || winner !== undefined) return;

		console.log(`[Battle ${battleId}] Sending decision:`, decision);
		emit("client:decision", { battleId, decision });
	};

	const handleReturnHome = () => {
		if (battleId && isConnected) {
			emit("client:leave_battle", { battleId });
		}
		router.push("/");
	};

	if (error) {
		return (
			<div className="container mx-auto py-8 text-center">
				<h1 className="text-3xl font-bold mb-4">Battle Error</h1>
				<Card className="mx-auto max-w-md mt-10">
					<CardContent className="p-6 text-destructive">{error}</CardContent>
				</Card>
				<Button variant="outline" onClick={handleReturnHome} className="mt-6">
					Return to Home
				</Button>
			</div>
		);
	}

	if (loadingMessage || !clientBattleState || !playerRole) {
		return (
			<div className="container mx-auto py-8 text-center">
				<h1 className="text-3xl font-bold mb-4">Pokémon Battle</h1>
				<Card className="mx-auto max-w-xs mt-10">
					<CardContent className="p-6">
						<div className="text-center text-muted-foreground animate-pulse">
							{loadingMessage || "Loading Battle..."}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex justify-between items-center">
				<h1 className="text-3xl font-bold">
					Pokémon Battle ({battleId.substring(0, 6)})
				</h1>
				<p className="text-sm text-muted-foreground">
					Playing as {playerRole.toUpperCase()}
				</p>
				<div className="flex gap-4">
					<Button variant="outline" onClick={handleReturnHome}>
						Return to Home
					</Button>
				</div>
			</div>

			<BattleView
				battleId={battleId}
				clientBattle={clientBattleState}
				formattedLogs={formattedLogs}
				playerRequest={playerRequest}
				playerRole={playerRole}
				onDecision={handlePlayerDecision}
				winner={winner}
			/>
		</div>
	);
}
