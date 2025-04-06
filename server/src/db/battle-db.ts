import { supabase } from "../../lib/supabase";
import type { BattleRecord, BattleRoom, PlayerRequest } from "../types";

/**
 * Retrieves a battle from the database by its ID
 */
export async function getBattleFromDB(battleId: string): Promise<BattleRecord | null> {
	const { data, error } = await supabase
		.from("battles")
		.select("*")
		.eq("id", battleId)
		.single();

	if (error || !data) return null;
	return data as BattleRecord;
}

/**
 * Converts a database battle record to a BattleRoom object
 */
export function convertDBBattleToRoom(data: BattleRecord): BattleRoom {
	const battleRoom: BattleRoom = {
		battleId: data.id,
		p1: data.p1_socket_id
			? { socketId: data.p1_socket_id, userId: data.p1_user_id }
			: null,
		p2: data.p2_socket_id
			? { socketId: data.p2_socket_id, userId: data.p2_user_id || "" }
			: null,
		spectators: [],
		format: data.format,
		started: data.status === "active",
		p1Decision: null,
		p2Decision: null,
	};

	return battleRoom;
}

/**
 * Creates a new battle in the database
 */
export async function createBattleInDB(
	battleId: string,
	format: string,
	p1UserId: string,
	p1SocketId: string,
	p1Name: string,
	p2Name = "Waiting for Player..."
): Promise<boolean> {
	const { error } = await supabase.from("battles").insert({
		id: battleId,
		format: format,
		p1_user_id: p1UserId,
		p1_socket_id: p1SocketId,
		p1_name: p1Name,
		p2_name: p2Name,
		status: "waiting",
	});

	return !error;
}

/**
 * Updates a battle in the database
 */
export async function updateBattleInDB(
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
	}>
): Promise<boolean> {
	// Always update the last_activity_at timestamp
	updates.last_activity_at = new Date().toISOString();

	const { error } = await supabase
		.from("battles")
		.update(updates)
		.eq("id", battleId);

	if (error) {
		console.error(`[DB] Error updating battle ${battleId}:`, error);
		return false;
	}

	return true;
}

/**
 * Deletes a battle from the database
 */
export async function deleteBattleFromDB(battleId: string): Promise<boolean> {
	const { error } = await supabase.from("battles").delete().eq("id", battleId);
	return !error;
}

/**
 * Retrieves recent battles from the database
 */
export async function getRecentBattles(limit = 50): Promise<BattleRecord[]> {
	const { data, error } = await supabase
		.from("battles")
		.select("*")
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error) return [];
	return data as BattleRecord[];
} 