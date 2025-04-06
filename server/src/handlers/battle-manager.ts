import type { Socket } from "socket.io";
import { battleManager } from "../../services/battle-manager-instance";
import type { BattleRoom, ClientInfo, PlayerDecision, PlayerId } from "../types";
import { getBattleFromDB, updateBattleInDB, convertDBBattleToRoom } from "../db/battle-db";

// In-memory battle cache
const activeBattles = new Map<string, BattleRoom>();

/**
 * Gets a battle room from memory or database
 */
export async function getBattleRoom(
	battleId: string
): Promise<BattleRoom | undefined> {
	// First try in-memory cache
	let battle = activeBattles.get(battleId);

	// If not in memory, try to fetch from database
	if (!battle) {
		const battleData = await getBattleFromDB(battleId);
		// Cache it if found
		if (battleData) {
			battle = convertDBBattleToRoom(battleData);
			activeBattles.set(battleId, battle);
		}
	}

	return battle;
}

/**
 * Adds a battle to the in-memory cache
 */
export function addBattleToCache(battleRoom: BattleRoom): void {
	activeBattles.set(battleRoom.battleId, battleRoom);
}

/**
 * Removes a battle from the in-memory cache
 */
export function removeBattleFromCache(battleId: string): void {
	activeBattles.delete(battleId);
}

/**
 * Gets all active battles from the cache
 */
export function getAllActiveBattles(): BattleRoom[] {
	return Array.from(activeBattles.values());
}

/**
 * Handles a player reconnecting to a battle
 */
export async function handlePlayerReconnect(
	socket: Socket, 
	clientInfo: ClientInfo,
	battleId: string, 
	battleRoom: BattleRoom | undefined,
	battleData: unknown,
	isP1: boolean
): Promise<void> {
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
}

/**
 * Clears a player's disconnect timer
 */
export function clearDisconnectTimer(battleRoom: BattleRoom, isP1: boolean, battleId: string): void {
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
}

/**
 * Sets up a disconnect timer for a player
 */
export function setupDisconnectTimer(
	battleRoom: BattleRoom,
	battleId: string,
	playerId: PlayerId,
	userId: string,
	opponentSocketId: string | undefined,
	timeoutCallback: () => Promise<void>
): void {
	const timerKey = playerId === "p1" ? "p1DisconnectTimer" : "p2DisconnectTimer";
	
	if (battleRoom.started && !battleRoom[timerKey]) {
		battleRoom[timerKey] = setTimeout(
			async () => {
				console.log(
					`[Battle ${battleId}] ${playerId.toUpperCase()} reconnection grace period ended, forfeiting.`,
				);
				
				await timeoutCallback();
				
				battleRoom[timerKey] = undefined;
			},
			2 * 60 * 1000, // 2 minutes reconnection window
		);
	}
}

/**
 * Handles a player making a decision
 */
export async function handlePlayerDecision(
	battleId: string,
	playerRole: PlayerId,
	decision: PlayerDecision,
	battleRoom: BattleRoom,
	forceSwitch = false
): Promise<void> {
	if (playerRole === "p1") {
		battleRoom.p1Decision = decision;
	} else {
		battleRoom.p2Decision = decision;
	}
	
	// Update last activity timestamp
	await updateBattleInDB(battleId, {});

	if (forceSwitch) {
		console.log(
			`[Battle ${battleId}] Force switching due to forceSwitch flag.`,
		);

		if (battleRoom.p1Decision) {
			battleManager.makePlayerMove(
				battleId,
				"p1",
				battleRoom.p1Decision,
			);
		}
		if (battleRoom.p2Decision) {
			battleManager.makePlayerMove(
				battleId,
				"p2",
				battleRoom.p2Decision,
			);
		}

		// Reset decisions for next turn
		battleRoom.p1Decision = null;
		battleRoom.p2Decision = null;
		return;
	}

	if (battleRoom.p1Decision && battleRoom.p2Decision) {
		console.log(
			`[Battle ${battleId}] Both players have made their decisions.`,
		);

		// Both players have made their decisions, pass them to the engine
		battleManager.makePlayerMove(
			battleId,
			"p1",
			battleRoom.p1Decision,
		);
		battleManager.makePlayerMove(
			battleId,
			"p2",
			battleRoom.p2Decision,
		);

		// Reset decisions for next turn
		battleRoom.p1Decision = null;
		battleRoom.p2Decision = null;
	} else {
		console.log(
			`[Battle ${battleId}] Waiting for both players to make decisions.`,
		);
	}
} 