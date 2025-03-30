"use client";

import React, { useState, useEffect } from "react";
import BattleView from "@/components/BattleView";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { useSocketStore } from "@/store/socket";
import { useSettings } from "@/store/settings";
import type {
	BattleState,
	PlayerDecision,
	PlayerRequest,
} from "@/services/battle-types";
import { Card, CardContent } from "@/components/ui/card";

export default function BattlePage() {
	const router = useRouter();
	const params = useParams();
	const battleId = params.battleId as string;

	const { generation } = useSettings();
	const { socket, userId, emit, isConnected } = useSocketStore();

	const [battleState, setBattleState] = useState<BattleState | null>(null);
	const [playerRequest, setPlayerRequest] = useState<PlayerRequest | null>(
		null,
	);
	const [playerRole, setPlayerRole] = useState<"p1" | "p2" | null>(null);
	const [winner, setWinner] = useState<string | null | undefined>(undefined);
	const [error, setError] = useState<string | null>(null);
	const [loadingMessage, setLoadingMessage] = useState<string>(
		"Connecting to battle...",
	);

	useEffect(() => {
		if (!socket || !isConnected || !battleId || !userId) {
			if (!isConnected) setLoadingMessage("Connecting to server...");
			else if (!userId) setLoadingMessage("Identifying user...");
			else setLoadingMessage("Waiting for connection details...");
			return;
		}

		setLoadingMessage(`Joining battle ${battleId}...`);
		console.log(
			`Socket connected (${socket.id}), joining battle ${battleId} as ${userId}`,
		);

		const handleBattleUpdate = (data: {
			battleId: string;
			state: BattleState;
		}) => {
			if (data.battleId === battleId) {
				console.log(`[Battle ${battleId}] Received state update`);
				setBattleState(data.state);
				if (playerRole === "p1" && !data.state.p1Request)
					setPlayerRequest(null);
				if (playerRole === "p2" && !data.state.p2Request)
					setPlayerRequest(null);
				setLoadingMessage("");
				setError(null);
			}
		};

		const handleBattleRequest = (data: {
			battleId: string;
			request: PlayerRequest;
		}) => {
			if (data.battleId === battleId) {
				console.log(`[Battle ${battleId}] Received player request`);
				setPlayerRequest(data.request);
				setLoadingMessage("");
				setError(null);
			}
		};

		const handleBattleJoined = (data: {
			battleId: string;
			playerRole: "p1" | "p2";
			opponentUserId?: string;
		}) => {
			if (data.battleId === battleId) {
				console.log(
					`[Battle ${battleId}] Successfully joined as ${data.playerRole}. Opponent: ${data.opponentUserId || "Waiting..."}`,
				);
				setPlayerRole(data.playerRole);
				setLoadingMessage(
					data.opponentUserId
						? "Opponent joined! Starting battle..."
						: "Waiting for opponent...",
				);
			}
		};

		const handleBattleEnd = (data: {
			battleId: string;
			winner: string | null;
			state: BattleState;
		}) => {
			if (data.battleId === battleId) {
				console.log(
					`[Battle ${battleId}] Battle ended. Winner: ${data.winner}`,
				);
				setBattleState(data.state);
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
			console.error(
				`[Battle ${battleId}] Received server error:`,
				data.message,
			);
			setError(data.message);
			setLoadingMessage("");
		};

		socket.on("server:battle_update", handleBattleUpdate);
		socket.on("server:battle_request", handleBattleRequest);
		socket.on("server:battle_joined", handleBattleJoined);
		socket.on("server:battle_end", handleBattleEnd);
		socket.on("server:opponent_disconnected", handleOpponentDisconnect);
		socket.on("server:error", handleError);

		emit("client:join_battle", { battleId, userId });

		return () => {
			console.log(
				`[Battle ${battleId}] Leaving battle page. Cleaning up listeners.`,
			);
			socket.off("server:battle_update", handleBattleUpdate);
			socket.off("server:battle_request", handleBattleRequest);
			socket.off("server:battle_joined", handleBattleJoined);
			socket.off("server:battle_end", handleBattleEnd);
			socket.off("server:opponent_disconnected", handleOpponentDisconnect);
			socket.off("server:error", handleError);
		};
	}, [socket, isConnected, battleId, userId, emit, playerRole]);

	const handlePlayerDecision = (decision: PlayerDecision | null) => {
		if (!battleId || !playerRole || winner !== undefined) return;

		if (decision === null) {
			console.log(`[Battle ${battleId}] Decision cancelled locally.`);
		} else {
			console.log(`[Battle ${battleId}] Sending decision:`, decision);
			emit("client:decision", { battleId, decision });
		}
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

	if (loadingMessage || !battleState || !playerRole) {
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

	const currentRequest =
		playerRole === "p1" ? battleState.p1Request : battleState.p2Request;
	const displayRequest = playerRequest || currentRequest;

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex justify-between items-center">
				<h1 className="text-3xl font-bold">
					Pokémon Battle ({battleId.substring(0, 6)})
				</h1>
				<p className="text-sm text-muted-foreground">
					Playing as {playerRole?.toUpperCase()}
				</p>
				<div className="flex gap-4">
					<Button variant="outline" onClick={handleReturnHome}>
						Return to Home
					</Button>
				</div>
			</div>

			<BattleView
				battleId={battleId}
				battleState={battleState}
				playerRequest={displayRequest}
				playerRole={playerRole}
				onDecision={handlePlayerDecision}
				winner={winner}
			/>
		</div>
	);
}
