import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { battleManager } from "../../services/battle-manager-instance";
import type { BattleOptions, PlayerDecision } from "../../services/battle-types";
import { 
	getClientInfo, 
	addClient, 
	removeClient, 
	getClientByUserId,
	updateClientInfo
} from "../handlers/client-manager";
import {
	getBattleRoom,
	addBattleToCache,
	removeBattleFromCache,
	handlePlayerReconnect,
	clearDisconnectTimer,
	setupDisconnectTimer,
	handlePlayerDecision
} from "../handlers/battle-manager";
import { 
	createBattleInDB, 
	updateBattleInDB, 
	deleteBattleFromDB,
	getBattleFromDB
} from "../db/battle-db";
import type { BattleRoom } from "../types";

/**
 * Sets up socket event handlers
 */
export function setupSocketHandlers(io: Server): void {
	io.on("connection", (socket: Socket) => {
		console.log(`[Socket ${socket.id}] Client connected.`);

		// --- Client Identification ---
		socket.on("client:identify", (data: { userId: string }) => {
			const userId = data?.userId?.trim();
			const existingClient = getClientByUserId(userId);

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

			addClient(socket.id, userId);
			console.log(`[Socket ${socket.id}] Identified as User ID: ${userId}`);
			socket.emit("server:identified", {
				socketId: socket.id,
				userId: userId,
				message: `Welcome, ${userId}!`,
			});
		});

		// --- Battle Creation ---
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
					const success = await createBattleInDB(
						battleId,
						format,
						clientInfo.userId,
						socket.id,
						p1Name,
						p2Name
					);
					
					if (!success) {
						throw new Error("Database error: Failed to create battle");
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

					// Wire up battle start
					battleEngine.on("battleStart", async ({ battleId, initialLines }) => {
						console.log(`[Battle ${battleId}] Battle started. Saving initial protocol lines.`);
						
						// Save initial protocol lines to database
						await updateBattleInDB(battleId, {
							initial_protocol_lines: initialLines,
						});
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
					addBattleToCache(newBattleRoom);

					updateClientInfo(socket.id, {
						currentBattleId: battleId,
						playerRole: "p1",
					});

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
					await deleteBattleFromDB(battleId);
				}
			},
		);

		// --- Battle Join ---
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
				const battleData = await getBattleFromDB(battleId);
				
				if (!battleData) {
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
					// User is reconnecting to an existing battle
					console.log(
						`[Socket ${socket.id}] User ${clientInfo.userId} reconnecting to battle ${battleId} as ${isP1 ? 'p1' : 'p2'}.`,
					);
					
					// Update client info & join socket room
					await handlePlayerReconnect(socket, clientInfo, battleId, battleRoom, battleData, isP1);
					
					// Clear any pending disconnect timer
					if (battleRoom) {
						clearDisconnectTimer(battleRoom, isP1, battleId);
					}
					
					// Notify opponent about reconnection if they're connected
					const opponentSocketId = isP1
						? battleRoom?.p2?.socketId
						: battleRoom?.p1?.socketId;
					
					if (opponentSocketId) {
						// Notify opponent more explicitly about reconnection and send it to the entire room
						io.to(opponentSocketId).emit("server:opponent_reconnected", {
							battleId,
							userId: clientInfo.userId,
							message: `Your opponent (${clientInfo.userId}) has reconnected.`,
							temporary: false  // Indicate this is a permanent reconnection
						});
					}
					
					// Instead of just notifying the client, broadcast the battle_joined event to all in the room
					socket.emit("server:battle_joined", {
						battleId,
						playerRole: isP1 ? "p1" : "p2",
						opponentUserId: isP1 ? battleData.p2_user_id : battleData.p1_user_id,
						reconnected: true,
					});
					
					// Get battle engine or recreate if needed
					const engine = battleManager.getBattle(battleId);
					
					if (engine && battleData.status === "active") {
						// Send initial protocol lines first if available
						if (battleData.initial_protocol_lines && battleData.initial_protocol_lines.length > 0) {
							console.log(`[Battle ${battleId}] Sending initial protocol data to reconnecting player ${isP1 ? 'p1' : 'p2'}`);
							io.to(socket.id).emit("server:protocol", {
								battleId,
								lines: battleData.initial_protocol_lines,
							});
						} else {
							// Fallback if no initial lines in DB - get from engine if available
							const initialLines = engine.getInitialProtocolLines();
							if (initialLines.length > 0) {
								console.log(`[Battle ${battleId}] Sending engine's initial protocol data to reconnecting player ${isP1 ? 'p1' : 'p2'}`);
								io.to(socket.id).emit("server:protocol", {
									battleId,
									lines: initialLines,
								});
							}
						}
						
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
								`[Battle ${battleId}] Re-sent request to reconnected ${isP1 ? "p1" : "p2"}`,
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
						updateClientInfo(socket.id, {
							currentBattleId: undefined,
							playerRole: undefined,
						});
					} else if (battleData.status === "finished") {
						// Battle is already finished
						socket.emit("server:battle_end", {
							battleId,
							winner: battleData.winner,
							message: "This battle has already ended.",
						});
						
						// Reset client state
						updateClientInfo(socket.id, {
							currentBattleId: undefined,
							playerRole: undefined,
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
				updateClientInfo(socket.id, {
					currentBattleId: battleId,
					playerRole: "p2",
				});
				
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
					removeBattleFromCache(battleId);
					
					// Update database battle status
					await updateBattleInDB(battleId, { status: "finished" });

					// Reset client states
					if (battleRoom.p1) {
						const p1Info = getClientInfo(battleRoom.p1.socketId);
						if (p1Info) {
							updateClientInfo(battleRoom.p1.socketId, {
								currentBattleId: undefined,
								playerRole: undefined,
							});
						}
					}
					updateClientInfo(socket.id, {
						currentBattleId: undefined,
						playerRole: undefined,
					});
				}
			},
		);

		// --- Leave Battle ---
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

			updateClientInfo(socket.id, {
				currentBattleId: undefined,
				playerRole: undefined,
			});

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
						temporary: false  // This is a permanent leave, not a temporary disconnect
					});
					const opponentInfo = getClientInfo(opponentSocketId);
					if (opponentInfo) {
						updateClientInfo(opponentSocketId, {
							currentBattleId: undefined,
							playerRole: undefined,
						});
					}
					if (battleRoom.started) {
						console.log(
							`[Battle ${battleId}] Forfeiting battle due to manual leave.`,
						);
						battleManager.removeBattle(battleId);
						removeBattleFromCache(battleId);
						
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
					removeBattleFromCache(battleId);
					
					// Mark as finished in database if not already
					await updateBattleInDB(battleId, { status: "finished" });
				}
			}
		});

		// --- Player Decision ---
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
					await handlePlayerDecision(
						data.battleId, 
						playerRole, 
						data.decision, 
						battleRoom,
						data.forceSwitch
					);
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

		// --- Disconnection ---
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
						
						// Set a reconnection timer
						setupDisconnectTimer(
							battleRoom,
							battleId,
							"p1",
							userId,
							opponentSocketId,
							async () => {
								// Check if battle is still active first
								const battleData = await getBattleFromDB(battleId);
								
								// Only forfeit if battle is still active and player hasn't reconnected
								if (battleData && battleData.status === "active" && !battleData.p1_socket_id) {
									// Forfeit the battle
									battleManager.removeBattle(battleId);
									removeBattleFromCache(battleId);
									
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
												temporary: false  // No longer a temporary disconnect
											},
										);
									}
								}
							}
						);
					} else if (
						leavingRole === "p2" &&
						battleRoom.p2?.socketId === socket.id
					) {
						battleRoom.p2 = null;
						opponentSocketId = battleRoom.p1?.socketId;
						
						// Update database - just mark socket as null but keep battle active
						await updateBattleInDB(battleId, { p2_socket_id: null });
						
						// Set a reconnection timer
						setupDisconnectTimer(
							battleRoom,
							battleId,
							"p2",
							userId,
							opponentSocketId,
							async () => {
								// Check if battle is still active first
								const battleData = await getBattleFromDB(battleId);
								
								// Only forfeit if battle is still active and player hasn't reconnected
								if (battleData && battleData.status === "active" && !battleData.p2_socket_id) {
									// Forfeit the battle
									battleManager.removeBattle(battleId);
									removeBattleFromCache(battleId);
									
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
												temporary: false  // No longer a temporary disconnect
											},
										);
									}
								}
							}
						);
					}

					// Notify the opponent that this player disconnected but don't end battle yet
					if (opponentSocketId) {
						io.to(opponentSocketId).emit("server:opponent_disconnected", {
							battleId: battleId,
							message: `Your opponent (${userId}) disconnected. Waiting for them to reconnect...`,
							temporary: true  // Mark disconnect as temporary, expecting reconnect
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
						removeBattleFromCache(battleId);
						
						// Mark as finished in database
						await updateBattleInDB(battleId, { status: "finished" });
					}
				}
			}

			removeClient(socket.id);
		});

		// --- Error Handling ---
		socket.on("error", (err) => {
			console.error(`[Socket ${socket.id}] Socket error:`, err);
		});
	});
} 