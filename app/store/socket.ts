// app/store/socket.ts
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type {
	BattleState,
	PlayerDecision,
	PlayerRequest,
} from "@/services/battle-types"; // Assuming types are shared or copied
import { useEffect } from "react";

// Define the shape of the server events data (adjust as needed)
interface ServerToClientEvents {
	"server:identified": (data: {
		socketId: string;
		userId: string;
		message: string;
	}) => void;
	"server:error": (data: { message: string }) => void;
	"server:battle_created": (data: {
		battleId: string;
		playerRole: "p1" | "p2";
	}) => void;
	"server:battle_joined": (data: {
		battleId: string;
		playerRole: "p1" | "p2";
		opponentUserId?: string;
	}) => void;
	"server:battle_update": (data: {
		battleId: string;
		state: BattleState;
	}) => void; // Server sends the whole state
	"server:battle_request": (data: {
		battleId: string;
		request: PlayerRequest;
	}) => void; // Server sends specific request
	"server:battle_end": (data: {
		battleId: string;
		winner: string | null;
		state: BattleState;
	}) => void;
	"server:opponent_disconnected": (data: {
		battleId: string;
		message: string;
	}) => void;
	// Add other events as needed
}

// Define the shape of the client events data (adjust as needed)
interface ClientToServerEvents {
	"client:identify": (data: { userId: string }) => void;
	"client:create_battle": (data: { format: string; userId: string }) => void;
	"client:join_battle": (data: { battleId: string; userId: string }) => void;
	"client:decision": (data: {
		battleId: string;
		decision: PlayerDecision;
	}) => void;
	"client:leave_battle": (data: { battleId: string }) => void;
	// Add other events as needed
}

interface SocketState {
	socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
	isConnected: boolean;
	userId: string | null;
	socketId: string | null;
	error: string | null;
	connect: (userId: string) => void;
	disconnect: () => void;
	identify: () => void;
	emit: <Event extends keyof ClientToServerEvents>(
		event: Event,
		...args: Parameters<ClientToServerEvents[Event]>
	) => void; // Helper for type-safe emits
	// Add specific listeners setup if needed, or handle in components
}

// Ensure this URL points to your running WebSocket server
const SERVER_URL =
	process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";

export const useSocketStore = create<SocketState>((set, get) => ({
	socket: null,
	isConnected: false,
	userId: null,
	socketId: null,
	error: null,

	connect: (userId) => {
		if (get().socket) {
			console.log("Socket already exists. Disconnecting first.");
			get().disconnect(); // Ensure clean state if reconnecting
		}

		console.log(`Attempting to connect to ${SERVER_URL} as user ${userId}...`);
		set({ userId: userId, error: null }); // Set userId immediately

		// Explicitly specify WebSocket transport
		const newSocket = io(SERVER_URL, {
			transports: ["websocket"],
			reconnectionAttempts: 5,
			timeout: 10000,
		});

		newSocket.on("connect", () => {
			console.log(`Socket connected: ${newSocket.id}`);
			set({
				socket: newSocket,
				isConnected: true,
				socketId: newSocket.id,
				error: null,
			});
			get().identify(); // Automatically identify upon connection
		});

		newSocket.on("disconnect", (reason) => {
			console.log(`Socket disconnected. Reason: ${reason}`);
			set({
				socket: null,
				isConnected: false,
				socketId: null,
				error: `Disconnected: ${reason}`,
			});
		});

		newSocket.on("connect_error", (err) => {
			console.error("Socket connection error:", err);
			set({
				socket: null, // Ensure socket is null on error
				isConnected: false,
				socketId: null,
				error: `Connection failed: ${err.message}`,
			});
		});

		// --- Centralized Server Event Listeners (Optional but Recommended) ---
		// You can register listeners here that update the store directly,
		// or let components register their own specific listeners.
		// For now, we'll keep it simple and add specific listeners later.

		newSocket.on("server:identified", (data) => {
			console.log("Server identified client:", data);
			// socketId is already set on 'connect', userId is set in connect()
			// You could add extra checks here if needed
		});

		newSocket.on("server:error", (data) => {
			console.error("Server error:", data.message);
			set({ error: `Server error: ${data.message}` });
			// Potentially disconnect or show UI feedback based on error type
		});

		// --- End Centralized Listeners ---

		// Note: We don't set the socket in the store *until* 'connect' fires.
	},

	disconnect: () => {
		const socket = get().socket;
		if (socket) {
			console.log("Disconnecting socket...");
			socket.disconnect();
		}
		set({ socket: null, isConnected: false, socketId: null, error: null });
	},

	identify: () => {
		const { socket, userId } = get();
		if (socket && userId && socket.connected) {
			console.log(`Sending client:identify with userId: ${userId}`);
			socket.emit("client:identify", { userId });
		} else {
			console.warn("Cannot identify: Socket not connected or userId not set.");
		}
	},

	// Generic emit function for type safety
	emit: (event, ...args) => {
		const { socket } = get();
		if (socket?.connected) {
			socket.emit(event, ...args);
			console.log(`Emitted ${event} with args:`, args);
		} else {
			console.error(`Cannot emit ${event}: Socket not connected.`);
			set({ error: `Cannot emit ${event}: Socket not connected.` });
			// Potentially queue the event or show an error
		}
	},
}));

// Helper function (client-side only)
export function getOrSetUserId(): string {
	if (typeof window === "undefined") {
		// Should not happen if called correctly, but safeguard
		return "server_user";
	}
	const storedUserId = localStorage.getItem("pokemonBattleUserId");
	if (storedUserId) {
		return storedUserId;
	}
	// Generate a slightly more readable ID
	const newUserId = `user_${uuidv4().substring(0, 6)}`;
	localStorage.setItem("pokemonBattleUserId", newUserId);
	return newUserId;
}
