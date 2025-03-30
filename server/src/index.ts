// src/server.ts
import express from "express";
import http from "node:http";
import { Server, type Socket } from "socket.io";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";

// --- Import Battle Logic ---
import { battleManager } from "../services/battle-manager-instance";
import type {
	BattleOptions,
	PlayerDecision,
	PlayerRequest,
	BattleState,
} from "../services/battle-types";
import type { Battle } from "@pkmn/client";

// --- Basic Server Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		// Allow connections from your frontend's origin
		// Use "*" for development, but restrict in production!
		origin: process.env.CLIENT_ORIGIN || "*",
		methods: ["GET", "POST"],
	},
});

const PORT = process.env.PORT || 8080;

// --- Data Structures ---
interface ClientInfo {
	userId: string;
	currentBattleId?: string;
	playerRole?: "p1" | "p2";
}

interface SocketInfo {
	socketId: string;
	userId: string;
}

interface BattleRoom {
	battleId: string;
	p1: SocketInfo | null;
	p2: SocketInfo | null;
	spectators: string[];
	format: string;
}

const connectedClients = new Map<string, ClientInfo>();
const activeBattles = new Map<string, BattleRoom>();

console.log("Initializing WebSocket Server with Battle Logic...");

// --- Helper Functions ---
function getClientInfo(socketId: string): ClientInfo | undefined {
	return connectedClients.get(socketId);
}

function getBattleRoom(battleId: string): BattleRoom | undefined {
	return activeBattles.get(battleId);
}

// --- Socket.IO Connection Logic ---
io.on("connection", (socket: Socket) => {
	console.log(`[Socket ${socket.id}] Client connected.`);

	// --- Handle Client Identification ---
	socket.on("client:identify", (data: { userId: string }) => {
		const userId = data?.userId?.trim();
		const existingClient = Array.from(connectedClients.entries()).find(
			([, info]) => info.userId === userId,
		);

		if (!userId || typeof userId !== "string") {
			socket.emit("server:error", { message: "Invalid user ID provided." });
			return;
		}

		if (existingClient) {
			console.warn(
				`[Socket ${socket.id}] User ID ${userId} is already connected (Socket ${existingClient[0]}). Disconnecting new connection.`,
			);
			socket.emit("server:error", {
				message: `User ID ${userId} is already connected. Please close other tabs or wait.`,
			});
			socket.disconnect(true);
			return;
		}

		connectedClients.set(socket.id, { userId });
		console.log(`[Socket ${socket.id}] Identified as User ID: ${userId}`);
		socket.emit("server:identified", {
			socketId: socket.id,
			userId: userId,
			message: `Welcome, ${userId}!`,
		});
	});

	// --- Handle Battle Creation ---
	socket.on(
		"client:create_battle",
		(data: { format: string; userId: string }) => {
			const clientInfo = getClientInfo(socket.id);
			if (!clientInfo || clientInfo.userId !== data.userId) {
				console.warn(
					`[Socket ${socket.id}] Create battle request from unidentified or mismatched user.`,
				);
				socket.emit("server:error", {
					message: "Identify first or user ID mismatch.",
				});
				return;
			}
			if (clientInfo.currentBattleId) {
				socket.emit("server:error", {
					message: "You are already in a battle.",
				});
				return;
			}

			const battleId = randomUUID();
			const format = data.format || "gen3randombattle";
			const p1Name = clientInfo.userId;
			const p2Name = "Waiting for Player...";

			console.log(
				`[Socket ${socket.id}] User ${clientInfo.userId} creating battle ${battleId} (Format: ${format})`,
			);

			try {
				const battleOptions: BattleOptions = {
					format: format,
					p1Name: p1Name,
					p2Name: p2Name,
					onBattleUpdate: (state: BattleState) => {
						io.to(battleId).emit("server:battle_update", { battleId, state });
					},
				};

				const battleEngine = battleManager.createBattle(
					battleId,
					battleOptions,
				);

				battleEngine.on("playerRequest", ({ player, request }) => {
					const battleRoom = getBattleRoom(battleId);
					if (!battleRoom) return;

					const targetSocketId =
						player === "p1" ? battleRoom.p1?.socketId : battleRoom.p2?.socketId;
					if (targetSocketId) {
						io.to(targetSocketId).emit("server:battle_request", {
							battleId,
							request,
						});
						console.log(
							`[Battle ${battleId}] Sent request to ${player} (${targetSocketId})`,
						);
					} else {
						console.warn(
							`[Battle ${battleId}] Could not find socket ID for ${player} to send request.`,
						);
					}
				});

				battleEngine.on("battleEnd", ({ winner, state }) => {
					io.to(battleId).emit("server:battle_end", {
						battleId,
						winner,
						state,
					});
					console.log(
						`[Battle ${battleId}] Ended. Winner: ${winner}. Notifying room.`,
					);
					setTimeout(() => {
						activeBattles.delete(battleId);
						console.log(`[Battle ${battleId}] Removed battle room state.`);
					}, 61000);
				});

				const newBattleRoom: BattleRoom = {
					battleId: battleId,
					p1: { socketId: socket.id, userId: clientInfo.userId },
					p2: null,
					spectators: [],
					format: format,
				};
				activeBattles.set(battleId, newBattleRoom);

				clientInfo.currentBattleId = battleId;
				clientInfo.playerRole = "p1";

				socket.join(battleId);
				console.log(
					`[Socket ${socket.id}] User ${clientInfo.userId} joined room ${battleId} as P1.`,
				);

				socket.emit("server:battle_created", {
					battleId: battleId,
					playerRole: "p1",
				});

				console.log(`[Battle ${battleId}] Waiting for P2 to join.`);
			} catch (error) {
				console.error(`[Socket ${socket.id}] Error creating battle:`, error);
				socket.emit("server:error", {
					message: `Failed to create battle: ${error}`,
				});
				if (battleManager.getBattle(battleId)) {
					battleManager.removeBattle(battleId);
				}
			}
		},
	);

	// --- Handle Player Decisions ---
	socket.on(
		"client:decision",
		(data: { battleId: string; decision: PlayerDecision }) => {
			const clientInfo = getClientInfo(socket.id);
			const battleRoom = getBattleRoom(data.battleId);

			if (
				!clientInfo ||
				!battleRoom ||
				clientInfo.currentBattleId !== data.battleId
			) {
				console.warn(
					`[Socket ${socket.id}] Invalid decision request (not in battle?).`,
				);
				socket.emit("server:error", {
					message: "Cannot make decision: Not in this battle.",
				});
				return;
			}

			const playerRole = clientInfo.playerRole;
			if (!playerRole) {
				console.warn(
					`[Socket ${socket.id}] Invalid decision request (no player role?).`,
				);
				socket.emit("server:error", {
					message: "Cannot make decision: Role not assigned.",
				});
				return;
			}

			console.log(
				`[Battle ${data.battleId}] Received decision from ${playerRole} (${clientInfo.userId}):`,
				data.decision,
			);
			try {
				battleManager.makePlayerMove(data.battleId, playerRole, data.decision);
			} catch (error) {
				console.error(
					`[Battle ${data.battleId}] Error processing decision for ${playerRole}:`,
					error,
				);
				socket.emit("server:error", {
					message: `Error processing decision: ${error}`,
				});
			}
		},
	);

	// --- Handle Client Disconnection ---
	socket.on("disconnect", (reason: string) => {
		const clientInfo = getClientInfo(socket.id);
		if (!clientInfo) {
			console.log(
				`[Socket ${socket.id}] Disconnected (was not identified). Reason: ${reason}`,
			);
			return;
		}

		const userId = clientInfo.userId;
		const battleId = clientInfo.currentBattleId;
		console.log(
			`[Socket ${socket.id}] Client disconnected (User: ${userId}). Reason: ${reason}`,
		);

		if (battleId) {
			const battleRoom = getBattleRoom(battleId);
			if (battleRoom) {
				console.log(
					`[Battle ${battleId}] Player ${userId} (${clientInfo.playerRole}) disconnected.`,
				);
				socket.leave(battleId);

				let opponentSocketId: string | undefined = undefined;

				if (clientInfo.playerRole === "p1") {
					battleRoom.p1 = null;
					opponentSocketId = battleRoom.p2?.socketId;
				} else if (clientInfo.playerRole === "p2") {
					battleRoom.p2 = null;
					opponentSocketId = battleRoom.p1?.socketId;
				}

				if (opponentSocketId) {
					io.to(opponentSocketId).emit("server:opponent_disconnected", {
						battleId: battleId,
						message: `Your opponent (${userId}) disconnected.`,
					});
					const opponentInfo = getClientInfo(opponentSocketId);
					if (opponentInfo) {
						opponentInfo.currentBattleId = undefined;
						opponentInfo.playerRole = undefined;
					}
				}

				if (!battleRoom.p1 && !battleRoom.p2) {
					console.log(
						`[Battle ${battleId}] Both players disconnected. Removing battle.`,
					);
					battleManager.removeBattle(battleId);
					activeBattles.delete(battleId);
				}
			}
		}

		connectedClients.delete(socket.id);
	});

	socket.on("error", (err) => {
		console.error(`[Socket ${socket.id}] Socket error:`, err);
	});
});

// --- Start the HTTP Server ---
server.listen(PORT, () => {
	const address = server.address() as AddressInfo;
	console.log(`WebSocket server running on port ${address.port}.`);
});

// --- Basic HTTP Route ---
app.get("/", (req, res) => {
	res.status(200).json({
		message: "Pokemon Battle WebSocket Server is active.",
		connectedClients: connectedClients.size,
		activeBattles: activeBattles.size,
		clientDetails: Array.from(connectedClients.entries()).map(([id, info]) => ({
			socketId: id,
			...info,
		})),
		battleDetails: Array.from(activeBattles.values()),
	});
});

console.log("Server setup complete. Waiting for connections...");
