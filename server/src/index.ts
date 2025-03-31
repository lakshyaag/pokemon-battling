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
	PlayerId,
} from "../services/battle-types";

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
	pingInterval: 5000,
	pingTimeout: 10000,
});

const PORT = process.env.PORT || 8080;

// --- Data Structures ---
interface ClientInfo {
	userId: string;
	currentBattleId?: string;
	playerRole?: PlayerId;
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
	started: boolean;
	p1Decision: PlayerDecision | null;
	p2Decision: PlayerDecision | null;
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

	socket.on(
		"client:create_battle",
		(data: { format: string; userId: string }) => {
			const clientInfo = getClientInfo(socket.id);
			if (!clientInfo || clientInfo.userId !== data.userId) {
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
					format,
					p1Name,
					p2Name,
					debug: process.env.NODE_ENV === "development",
				};

				const battleEngine = battleManager.createBattle(
					battleId,
					battleOptions,
				);

				// Wire up protocol events
				battleEngine.on("protocol", ({ type, lines }) => {
					const battleRoom = getBattleRoom(battleId);
					if (!battleRoom?.started) return;

					if (type === "omniscient") {
						io.to(battleId).emit("server:protocol", { battleId, lines });
					} else {
						const targetSocketId =
							type === "p1" ? battleRoom.p1?.socketId : battleRoom.p2?.socketId;
						if (targetSocketId) {
							io.to(targetSocketId).emit("server:protocol", {
								battleId,
								lines,
							});
						}
					}
				});

				// Wire up request events
				battleEngine.on("request", ({ player, request }) => {
					const battleRoom = getBattleRoom(battleId);
					if (!battleRoom?.started) return;

					const targetSocketId =
						player === "p1" ? battleRoom.p1?.socketId : battleRoom.p2?.socketId;
					if (targetSocketId) {
						const requestLine = `|request|${JSON.stringify(request)}`;
						io.to(targetSocketId).emit("server:protocol", {
							battleId,
							lines: [requestLine],
						});
						console.log(`[Battle ${battleId}] Sent request to ${player}`);
					}
				});

				// Wire up battle end
				battleEngine.on("battleEnd", ({ winner }) => {
					const battleRoom = getBattleRoom(battleId);
					if (!battleRoom) return;

					io.to(battleId).emit("server:battle_end", { battleId, winner });
					console.log(`[Battle ${battleId}] Battle ended. Winner: ${winner}`);

					battleRoom.started = false;
					// Cleanup handled by manager's timeout
				});

				const newBattleRoom: BattleRoom = {
					battleId,
					p1: { socketId: socket.id, userId: clientInfo.userId },
					p2: null,
					spectators: [],
					format,
					started: false,
					p1Decision: null,
					p2Decision: null,
				};
				activeBattles.set(battleId, newBattleRoom);

				clientInfo.currentBattleId = battleId;
				clientInfo.playerRole = "p1";

				socket.join(battleId);
				socket.emit("server:battle_created", { battleId, playerRole: "p1" });
				console.log(`[Battle ${battleId}] Waiting for P2 to join.`);
			} catch (error: unknown) {
				console.error(`[Socket ${socket.id}] Error creating battle:`, error);
				socket.emit("server:error", {
					message: `Failed to create battle: ${error instanceof Error ? error.message : String(error)}`,
				});
				battleManager.removeBattle(battleId);
			}
		},
	);

	socket.on(
		"client:join_battle",
		(data: { battleId: string; userId: string }) => {
			const clientInfo = getClientInfo(socket.id);
			const battleId = data.battleId;

			if (!clientInfo || clientInfo.userId !== data.userId) {
				socket.emit("server:error", {
					message: "Identify first or user ID mismatch.",
				});
				return;
			}

			const battleRoom = getBattleRoom(battleId);

			// --- Rejoin Logic ---
			if (clientInfo.currentBattleId === battleId && battleRoom) {
				console.log(
					`[Socket ${socket.id}] User ${clientInfo.userId} rejoining battle ${battleId}.`,
				);
				socket.join(battleId);

				// Add timeout to test race condition
				setTimeout(() => {
					socket.emit("server:battle_joined", {
						battleId,
						playerRole: clientInfo.playerRole,
						opponentUserId:
							clientInfo.playerRole === "p1"
								? battleRoom.p2?.userId
								: battleRoom.p1?.userId,
					});
				}, 1000);

				const engine = battleManager.getBattle(battleId);
				if (engine && battleRoom.started) {
					// Send current request if applicable
					const request =
						clientInfo.playerRole === "p1"
							? engine.getP1Request()
							: engine.getP2Request();
					if (request) {
						const requestLine = `|request|${JSON.stringify(request)}`;
						io.to(socket.id).emit("server:protocol", {
							battleId,
							lines: [requestLine],
						});
						console.log(
							`[Battle ${battleId}] Re-sent request to rejoining ${clientInfo.playerRole}`,
						);
					}
				} else if (!engine) {
					socket.emit("server:error", {
						message: "Battle ended or could not be found on rejoin.",
					});
					clientInfo.currentBattleId = undefined;
					clientInfo.playerRole = undefined;
					activeBattles.delete(battleId);
				}
				return;
			}

			// --- New Join Logic ---
			if (clientInfo.currentBattleId) {
				socket.emit("server:error", {
					message: "You are already in a battle.",
				});
				return;
			}
			if (!battleRoom) {
				socket.emit("server:error", {
					message: `Battle with ID ${battleId} not found.`,
				});
				return;
			}
			if (battleRoom.p2 !== null) {
				socket.emit("server:error", {
					message: "This battle is already full.",
				});
				return;
			}
			if (battleRoom.p1?.userId === clientInfo.userId) {
				socket.emit("server:error", {
					message: "You cannot join your own battle as Player 2.",
				});
				return;
			}

			// Assign P2
			console.log(
				`[Socket ${socket.id}] User ${clientInfo.userId} joining battle ${battleId} as P2.`,
			);
			battleRoom.p2 = { socketId: socket.id, userId: clientInfo.userId };
			clientInfo.currentBattleId = battleId;
			clientInfo.playerRole = "p2";
			const engine = battleManager.getBattle(battleId);
			engine?.updatePlayerName("p2", clientInfo.userId);
			socket.join(battleId);

			// Notify players
			socket.emit("server:battle_joined", {
				battleId,
				playerRole: "p2",
				opponentUserId: battleRoom.p1?.userId,
			});
			if (battleRoom.p1) {
				io.to(battleRoom.p1.socketId).emit("server:battle_joined", {
					battleId,
					playerRole: "p1",
					opponentUserId: clientInfo.userId,
				});
			}

			// Start the Battle
			console.log(
				`[Battle ${battleId}] Both players present. Starting battle simulation.`,
			);
			battleRoom.started = true;
			try {
				battleManager.startBattle(battleId);
			} catch (error) {
				console.error(
					`[Battle ${battleId}] Error starting battle simulation:`,
					error,
				);
				io.to(battleId).emit("server:error", {
					message: `Failed to start battle: ${error}`,
				});

				const engine = battleManager.getBattle(battleId);
				if (engine) engine.destroy();
				battleManager.removeBattle(battleId);
				activeBattles.delete(battleId);

				// Reset client states
				if (battleRoom.p1) {
					const p1Info = getClientInfo(battleRoom.p1.socketId);
					if (p1Info) {
						p1Info.currentBattleId = undefined;
						p1Info.playerRole = undefined;
					}
				}
				clientInfo.currentBattleId = undefined;
				clientInfo.playerRole = undefined;
			}
		},
	);

	socket.on("client:leave_battle", (data: { battleId: string }) => {
		const clientInfo = getClientInfo(socket.id);
		const battleId = data.battleId;

		if (!clientInfo || clientInfo.currentBattleId !== battleId) {
			console.warn(
				`[Socket ${socket.id}] Attempted to leave battle ${battleId} but not in it.`,
			);
			return;
		}

		const battleRoom = getBattleRoom(battleId);
		console.log(
			`[Socket ${socket.id}] User ${clientInfo.userId} leaving battle ${battleId}.`,
		);
		socket.leave(battleId);

		clientInfo.currentBattleId = undefined;
		clientInfo.playerRole = undefined;

		if (battleRoom) {
			let opponentSocketId: string | undefined = undefined;
			const leavingRole = clientInfo.playerRole;

			if (leavingRole === "p1" && battleRoom.p1?.socketId === socket.id) {
				battleRoom.p1 = null;
				opponentSocketId = battleRoom.p2?.socketId;
			} else if (
				leavingRole === "p2" &&
				battleRoom.p2?.socketId === socket.id
			) {
				battleRoom.p2 = null;
				opponentSocketId = battleRoom.p1?.socketId;
			}

			if (opponentSocketId) {
				io.to(opponentSocketId).emit("server:opponent_disconnected", {
					battleId: battleId,
					message: `Your opponent (${clientInfo.userId}) left the battle.`,
				});
				const opponentInfo = getClientInfo(opponentSocketId);
				if (opponentInfo) {
					opponentInfo.currentBattleId = undefined;
					opponentInfo.playerRole = undefined;
				}
				if (battleRoom.started) {
					console.log(
						`[Battle ${battleId}] Forfeiting battle due to disconnect.`,
					);
					battleManager.removeBattle(battleId);
					activeBattles.delete(battleId);
				}
			}

			if (!battleRoom.p1 && !battleRoom.p2) {
				console.log(
					`[Battle ${battleId}] Both players disconnected/left. Removing battle.`,
				);
				battleManager.removeBattle(battleId);
				activeBattles.delete(battleId);
			}
		}
	});

	socket.on(
		"client:decision",
		(data: { battleId: string; decision: PlayerDecision }) => {
			const clientInfo = getClientInfo(socket.id);
			const battleRoom = getBattleRoom(data.battleId);

			if (
				!clientInfo ||
				!battleRoom ||
				clientInfo.currentBattleId !== data.battleId ||
				!battleRoom.started
			) {
				console.warn(
					`[Socket ${socket.id}] Invalid decision request (not in battle/battle not started).`,
				);
				socket.emit("server:error", {
					message:
						"Cannot make decision: Not in this battle or battle not started.",
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
				if (playerRole === "p1") {
					battleRoom.p1Decision = data.decision;
				} else {
					battleRoom.p2Decision = data.decision;
				}

				if (battleRoom.p1Decision && battleRoom.p2Decision) {
					console.log(
						`[Battle ${data.battleId}] Both players have made their decisions.`,
					);

					// Both players have made their decisions, pass them to the engine
					battleManager.makePlayerMove(
						data.battleId,
						"p1",
						battleRoom.p1Decision,
					);
					battleManager.makePlayerMove(
						data.battleId,
						"p2",
						battleRoom.p2Decision,
					);

					// Reset decisions for next turn
					battleRoom.p1Decision = null;
					battleRoom.p2Decision = null;
				} else {
					console.log(
						`[Battle ${data.battleId}] Waiting for both players to make decisions.`,
					);
				}
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

				let opponentSocketId: string | undefined = undefined;
				const leavingRole = clientInfo.playerRole;

				if (leavingRole === "p1" && battleRoom.p1?.socketId === socket.id) {
					battleRoom.p1 = null;
					opponentSocketId = battleRoom.p2?.socketId;
				} else if (
					leavingRole === "p2" &&
					battleRoom.p2?.socketId === socket.id
				) {
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
					if (battleRoom.started) {
						console.log(
							`[Battle ${battleId}] Forfeiting battle due to disconnect.`,
						);
						battleManager.removeBattle(battleId);
						activeBattles.delete(battleId);
					}
				}

				if (!battleRoom.p1 && !battleRoom.p2) {
					console.log(
						`[Battle ${battleId}] Both players disconnected/left. Removing battle.`,
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
