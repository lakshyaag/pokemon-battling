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
	PlayerRequest,
} from "../services/battle-types";

// --- Import Supabase client ---
import { supabase } from "../lib/supabase";

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
	// Add disconnect timers
	p1DisconnectTimer?: NodeJS.Timeout;
	p2DisconnectTimer?: NodeJS.Timeout;
}

const connectedClients = new Map<string, ClientInfo>();
// We'll still keep this in-memory cache for quick access, but source of truth is Supabase
const activeBattles = new Map<string, BattleRoom>();

console.log("Initializing WebSocket Server with Battle Logic...");

// --- Helper Functions ---
function getClientInfo(socketId: string): ClientInfo | undefined {
	return connectedClients.get(socketId);
}

async function getBattleRoomFromDB(
	battleId: string,
): Promise<BattleRoom | undefined> {
	const { data, error } = await supabase
		.from("battles")
		.select("*")
		.eq("id", battleId)
		.single();

	if (error || !data) return undefined;

	// Convert DB record to BattleRoom
	const battleRoom: BattleRoom = {
		battleId: data.id,
		p1: data.p1_socket_id
			? { socketId: data.p1_socket_id, userId: data.p1_user_id }
			: null,
		p2: data.p2_socket_id
			? { socketId: data.p2_socket_id, userId: data.p2_user_id }
			: null,
		spectators: [],
		format: data.format,
		started: data.status === "active",
		p1Decision: null,
		p2Decision: null,
	};

	return battleRoom;
}

async function getBattleRoom(
	battleId: string,
): Promise<BattleRoom | undefined> {
	// First try in-memory cache
	let battle = activeBattles.get(battleId);

	// If not in memory, try to fetch from database
	if (!battle) {
		battle = await getBattleRoomFromDB(battleId);
		// Cache it if found
		if (battle) {
			activeBattles.set(battleId, battle);
		}
	}

	return battle;
}

async function updateBattleInDB(
	battleId: string,
	updates: Partial<{
		p1_user_id: string;
		p2_user_id: string;
		p1_socket_id: string | null;
		p2_socket_id: string | null;
		p1_name: string;
		p2_name: string;
		status: "waiting" | "active" | "finished";
		winner: string | null;
		last_activity_at: string;
		p1_last_request: PlayerRequest | null;
		p2_last_request: PlayerRequest | null;
	}>,
) {
	// Always update the last_activity_at timestamp
	updates.last_activity_at = new Date().toISOString();

	const { error } = await supabase
		.from("battles")
		.update(updates)
		.eq("id", battleId);

	if (error) {
		console.error(`[DB] Error updating battle ${battleId}:`, error);
	}
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
		async (data: { format: string; userId: string }) => {
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
				// Create battle in database first
				const { error: dbError } = await supabase.from("battles").insert({
					id: battleId,
					format: format,
					p1_user_id: clientInfo.userId,
					p1_socket_id: socket.id,
					p1_name: p1Name,
					p2_name: p2Name,
					status: "waiting",
				});

				if (dbError) {
					throw new Error(`Database error: ${dbError.message}`);
				}

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
				battleEngine.on("protocol", async ({ type, lines }) => {
					const battleRoom = await getBattleRoom(battleId);
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
				battleEngine.on("request", async ({ player, request }) => {
					const battleRoom = await getBattleRoom(battleId);
					if (!battleRoom?.started) return;

					// Save request to database
					await updateBattleInDB(battleId, {
						[player === "p1" ? "p1_last_request" : "p2_last_request"]: request,
					});

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
				battleEngine.on("battleEnd", async ({ winner }) => {
					const battleRoom = await getBattleRoom(battleId);
					if (!battleRoom) return;

					io.to(battleId).emit("server:battle_end", { battleId, winner });
					console.log(`[Battle ${battleId}] Battle ended. Winner: ${winner}`);

					battleRoom.started = false;

					// Update database
					await updateBattleInDB(battleId, {
						status: "finished",
						winner: winner,
					});

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

				// Also remove from database if there was an error
				await supabase.from("battles").delete().eq("id", battleId);
			}
		},
	);

	socket.on(
		"client:join_battle",
		async (data: { battleId: string; userId: string }) => {
			const clientInfo = getClientInfo(socket.id);
			const battleId = data.battleId;

			if (!clientInfo || clientInfo.userId !== data.userId) {
				socket.emit("server:error", {
					message: "Identify first or user ID mismatch.",
				});
				return;
			}

			// Get battle info first from database directly to handle reconnections properly
			const { data: battleData, error } = await supabase
				.from("battles")
				.select("*")
				.eq("id", battleId)
				.single();

			if (error || !battleData) {
				socket.emit("server:error", {
					message: `Battle with ID ${battleId} not found.`,
				});
				return;
			}

			const battleRoom = await getBattleRoom(battleId);

			// --- Handle Reconnection Logic ---
			// Check if user is one of the players in this battle based on database record
			const isP1 = battleData.p1_user_id === clientInfo.userId;
			const isP2 = battleData.p2_user_id === clientInfo.userId;

			if (isP1 || isP2) {
				const playerRole = isP1 ? "p1" : "p2";
				console.log(
					`[Socket ${socket.id}] User ${clientInfo.userId} reconnecting to battle ${battleId} as ${playerRole}.`,
				);

				// Update client info
				clientInfo.currentBattleId = battleId;
				clientInfo.playerRole = playerRole;

				// Join socket room
				socket.join(battleId);

				// Update socket ID in database and memory
				if (isP1) {
					await updateBattleInDB(battleId, { p1_socket_id: socket.id });
					if (battleRoom?.p1) {
						battleRoom.p1.socketId = socket.id;
					} else if (battleRoom) {
						battleRoom.p1 = { socketId: socket.id, userId: clientInfo.userId };
					}
				} else {
					await updateBattleInDB(battleId, { p2_socket_id: socket.id });
					if (battleRoom?.p2) {
						battleRoom.p2.socketId = socket.id;
					} else if (battleRoom) {
						battleRoom.p2 = { socketId: socket.id, userId: clientInfo.userId };
					}
				}

				// Notify client about successful reconnection
				socket.emit("server:battle_joined", {
					battleId,
					playerRole,
					opponentUserId: isP1 ? battleData.p2_user_id : battleData.p1_user_id,
					reconnected: true,
				});

				// Get battle engine or recreate if needed
				const engine = battleManager.getBattle(battleId);

				if (engine && battleData.status === "active") {
					// Battle is active, send current game state
					const lastRequest = isP1
						? battleData.p1_last_request
							? battleData.p1_last_request
							: engine.getP1Request()
						: battleData.p2_last_request
							? battleData.p2_last_request
							: engine.getP2Request();

					if (lastRequest) {
						const requestLine = `|request|${JSON.stringify(lastRequest)}`;
						io.to(socket.id).emit("server:protocol", {
							battleId,
							lines: [requestLine],
						});
						console.log(
							`[Battle ${battleId}] Re-sent request to reconnected ${playerRole}`,
						);
					}

					// If battle exists in memory but not started, make sure it's marked as started
					if (
						battleRoom &&
						!battleRoom.started &&
						battleData.status === "active"
					) {
						battleRoom.started = true;
					}
				} else if (battleData.status === "active" && !engine) {
					// Battle is marked active in DB but engine not found
					// This is a case where server restarted but battle data exists
					// We could potentially recreate the battle state here from DB

					socket.emit("server:error", {
						message:
							"Battle state could not be fully recovered. Please start a new battle.",
					});

					// Mark battle as finished since we can't recover it
					await updateBattleInDB(battleId, {
						status: "finished",
						winner: null,
					});

					// Reset client state
					clientInfo.currentBattleId = undefined;
					clientInfo.playerRole = undefined;
				} else if (battleData.status === "finished") {
					// Battle is already finished
					socket.emit("server:battle_end", {
						battleId,
						winner: battleData.winner,
						message: "This battle has already ended.",
					});

					// Reset client state
					clientInfo.currentBattleId = undefined;
					clientInfo.playerRole = undefined;
				}

				// Clear any pending disconnect timer
				if (isP1 && battleRoom?.p1DisconnectTimer) {
					clearTimeout(battleRoom.p1DisconnectTimer);
					battleRoom.p1DisconnectTimer = undefined;
					console.log(
						`[Battle ${battleId}] P1 reconnected, cleared disconnect timer.`,
					);
				} else if (!isP1 && battleRoom?.p2DisconnectTimer) {
					clearTimeout(battleRoom.p2DisconnectTimer);
					battleRoom.p2DisconnectTimer = undefined;
					console.log(
						`[Battle ${battleId}] P2 reconnected, cleared disconnect timer.`,
					);
				}

				// Notify opponent about reconnection if they're connected
				const opponentSocketId = isP1
					? battleRoom?.p2?.socketId
					: battleRoom?.p1?.socketId;

				if (opponentSocketId) {
					io.to(opponentSocketId).emit("server:opponent_reconnected", {
						battleId,
						userId: clientInfo.userId,
						message: `Your opponent (${clientInfo.userId}) has reconnected.`,
					});
				}

				return;
			}

			// --- Handle New Join Logic ---
			if (clientInfo.currentBattleId) {
				socket.emit("server:error", {
					message: "You are already in a battle.",
				});
				return;
			}

			if (!battleRoom) {
				socket.emit("server:error", {
					message: `Battle with ID ${battleId} not found or could not be loaded.`,
				});
				return;
			}

			if (battleData.status !== "waiting") {
				socket.emit("server:error", {
					message: "This battle is no longer accepting new players.",
				});
				return;
			}

			if (battleRoom.p2 !== null || battleData.p2_user_id !== null) {
				socket.emit("server:error", {
					message: "This battle is already full.",
				});
				return;
			}

			if (
				battleRoom.p1?.userId === clientInfo.userId ||
				battleData.p1_user_id === clientInfo.userId
			) {
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

			// Update database
			await updateBattleInDB(battleId, {
				p2_user_id: clientInfo.userId,
				p2_socket_id: socket.id,
				p2_name: clientInfo.userId,
				status: "active",
			});

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

				// Update database battle status
				await updateBattleInDB(battleId, { status: "finished" });

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

	socket.on("client:leave_battle", async (data: { battleId: string }) => {
		const clientInfo = getClientInfo(socket.id);
		const battleId = data.battleId;

		if (!clientInfo || clientInfo.currentBattleId !== battleId) {
			console.warn(
				`[Socket ${socket.id}] Attempted to leave battle ${battleId} but not in it.`,
			);
			return;
		}

		const battleRoom = await getBattleRoom(battleId);
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

				// Update database
				await updateBattleInDB(battleId, { p1_socket_id: null });
			} else if (
				leavingRole === "p2" &&
				battleRoom.p2?.socketId === socket.id
			) {
				battleRoom.p2 = null;
				opponentSocketId = battleRoom.p1?.socketId;

				// Update database
				await updateBattleInDB(battleId, { p2_socket_id: null });
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

					// Update database
					await updateBattleInDB(battleId, {
						status: "finished",
						winner: leavingRole === "p1" ? "p2" : "p1",
					});
				}
			}

			if (!battleRoom.p1 && !battleRoom.p2) {
				console.log(
					`[Battle ${battleId}] Both players disconnected/left. Removing battle.`,
				);
				battleManager.removeBattle(battleId);
				activeBattles.delete(battleId);

				// Mark as finished in database if not already
				await updateBattleInDB(battleId, { status: "finished" });
			}
		}
	});

	socket.on(
		"client:decision",
		async (data: {
			battleId: string;
			decision: PlayerDecision;
			forceSwitch?: boolean;
		}) => {
			const clientInfo = getClientInfo(socket.id);
			const battleRoom = await getBattleRoom(data.battleId);

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

				// Update last activity timestamp
				await updateBattleInDB(data.battleId, {});

				if (data.forceSwitch) {
					console.log(
						`[Battle ${data.battleId}] Force switching due to forceSwitch flag.`,
					);

					if (battleRoom.p1Decision) {
						battleManager.makePlayerMove(
							data.battleId,
							"p1",
							battleRoom.p1Decision,
						);
					}
					if (battleRoom.p2Decision) {
						battleManager.makePlayerMove(
							data.battleId,
							"p2",
							battleRoom.p2Decision,
						);
					}

					// Reset decisions for next turn
					battleRoom.p1Decision = null;
					battleRoom.p2Decision = null;
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

	socket.on("disconnect", async (reason: string) => {
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
			const battleRoom = await getBattleRoom(battleId);
			if (battleRoom) {
				console.log(
					`[Battle ${battleId}] Player ${userId} (${clientInfo.playerRole}) disconnected.`,
				);

				let opponentSocketId: string | undefined = undefined;
				const leavingRole = clientInfo.playerRole;

				// Set socket ID to null in database but don't mark as finished immediately
				if (leavingRole === "p1" && battleRoom.p1?.socketId === socket.id) {
					battleRoom.p1 = null;
					opponentSocketId = battleRoom.p2?.socketId;

					// Update database - just mark socket as null but keep battle active
					await updateBattleInDB(battleId, { p1_socket_id: null });

					// Set a reconnection timer (2 minutes) before forfeiting the battle
					if (battleRoom.started && !battleRoom.p1DisconnectTimer) {
						battleRoom.p1DisconnectTimer = setTimeout(
							async () => {
								console.log(
									`[Battle ${battleId}] P1 reconnection grace period ended, forfeiting.`,
								);

								// Check if battle is still active first
								const { data } = await supabase
									.from("battles")
									.select("status, p1_socket_id")
									.eq("id", battleId)
									.single();

								// Only forfeit if battle is still active and player hasn't reconnected
								if (data && data.status === "active" && !data.p1_socket_id) {
									// Forfeit the battle
									battleManager.removeBattle(battleId);
									activeBattles.delete(battleId);

									// Update database
									await updateBattleInDB(battleId, {
										status: "finished",
										winner: "p2",
									});

									// Notify opponent if still connected
									if (opponentSocketId) {
										io.to(opponentSocketId).emit(
											"server:opponent_disconnected",
											{
												battleId: battleId,
												message: `Your opponent (${userId}) did not reconnect within the time limit.`,
												winner: "p2",
											},
										);
									}
								}

								battleRoom.p1DisconnectTimer = undefined;
							},
							2 * 60 * 1000,
						); // 2 minutes reconnection window
					}
				} else if (
					leavingRole === "p2" &&
					battleRoom.p2?.socketId === socket.id
				) {
					battleRoom.p2 = null;
					opponentSocketId = battleRoom.p1?.socketId;

					// Update database - just mark socket as null but keep battle active
					await updateBattleInDB(battleId, { p2_socket_id: null });

					// Set a reconnection timer (2 minutes) before forfeiting the battle
					if (battleRoom.started && !battleRoom.p2DisconnectTimer) {
						battleRoom.p2DisconnectTimer = setTimeout(
							async () => {
								console.log(
									`[Battle ${battleId}] P2 reconnection grace period ended, forfeiting.`,
								);

								// Check if battle is still active first
								const { data } = await supabase
									.from("battles")
									.select("status, p2_socket_id")
									.eq("id", battleId)
									.single();

								// Only forfeit if battle is still active and player hasn't reconnected
								if (data && data.status === "active" && !data.p2_socket_id) {
									// Forfeit the battle
									battleManager.removeBattle(battleId);
									activeBattles.delete(battleId);

									// Update database
									await updateBattleInDB(battleId, {
										status: "finished",
										winner: "p1",
									});

									// Notify opponent if still connected
									if (opponentSocketId) {
										io.to(opponentSocketId).emit(
											"server:opponent_disconnected",
											{
												battleId: battleId,
												message: `Your opponent (${userId}) did not reconnect within the time limit.`,
												winner: "p1",
											},
										);
									}
								}

								battleRoom.p2DisconnectTimer = undefined;
							},
							2 * 60 * 1000,
						); // 2 minutes reconnection window
					}
				}

				// Notify the opponent that this player disconnected but don't end battle yet
				if (opponentSocketId) {
					io.to(opponentSocketId).emit("server:opponent_disconnected", {
						battleId: battleId,
						message: `Your opponent (${userId}) disconnected. Waiting for them to reconnect...`,
						temporary: true,
					});
				}

				// If both players are disconnected, cancel any pending timers and end the battle
				if (!battleRoom.p1 && !battleRoom.p2) {
					console.log(
						`[Battle ${battleId}] Both players disconnected. Removing battle.`,
					);

					// Clear any reconnection timers
					if (battleRoom.p1DisconnectTimer) {
						clearTimeout(battleRoom.p1DisconnectTimer);
						battleRoom.p1DisconnectTimer = undefined;
					}
					if (battleRoom.p2DisconnectTimer) {
						clearTimeout(battleRoom.p2DisconnectTimer);
						battleRoom.p2DisconnectTimer = undefined;
					}

					battleManager.removeBattle(battleId);
					activeBattles.delete(battleId);

					// Mark as finished in database
					await updateBattleInDB(battleId, { status: "finished" });
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
app.get("/", async (req, res) => {
	// Get active battles from database
	const { data: dbBattles, error } = await supabase
		.from("battles")
		.select("*")
		.order("created_at", { ascending: false })
		.limit(50);

	res.status(200).json({
		message: "Pokemon Battle WebSocket Server is active.",
		connectedClients: connectedClients.size,
		activeBattles: activeBattles.size,
		clientDetails: Array.from(connectedClients.entries()).map(([id, info]) => ({
			socketId: id,
			...info,
		})),
		battleDetails: Array.from(activeBattles.values()),
		recentBattles: dbBattles || [],
	});
});

console.log("Server setup complete. Waiting for connections...");
