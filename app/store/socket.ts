// app/store/socket.ts
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type { PlayerDecision, PlayerId } from "@/lib/battle-types";

// Define the shape of the server events data
interface ServerToClientEvents {
	"server:identified": (data: {
		socketId: string;
		userId: string;
		message: string;
	}) => void;
	"server:error": (data: { message: string }) => void;
	"server:battle_created": (data: {
		battleId: string;
		playerRole: PlayerId;
	}) => void;
	"server:battle_joined": (data: {
		battleId: string;
		playerRole: PlayerId;
		opponentUserId?: string;
	}) => void;
	"server:protocol": (data: { battleId: string; lines: string[] }) => void;
	"server:battle_end": (data: {
		battleId: string;
		winner: string | null;
	}) => void;
	"server:opponent_disconnected": (data: {
		battleId: string;
		message: string;
	}) => void;
	"server:opponent_reconnected": (data: {
		battleId: string;
		message: string;
		userId: string;
	}) => void;
}

// Define the shape of the client events data (adjust as needed)
interface ClientToServerEvents {
	"client:identify": (data: { userId: string }) => void;
	"client:create_battle": (data: { format: string; userId: string }) => void;
	"client:join_battle": (data: { battleId: string; userId: string }) => void;
	"client:decision": (data: {
		battleId: string;
		decision: PlayerDecision | null;
		forceSwitch?: boolean;
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
	currentBattleId: string | null;
	playerRole: PlayerId | null;
	connect: (userId: string) => void;
	disconnect: () => void;
	identify: () => void;
	emit: <Event extends keyof ClientToServerEvents>(
		event: Event,
		...args: Parameters<ClientToServerEvents[Event]>
	) => void; // Helper for type-safe emits
	// Add battle-specific actions
	createBattle: (format: string) => void;
	joinBattle: (battleId: string) => void;
	leaveBattle: () => void;
	makeDecision: (decision: PlayerDecision) => void;
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
	currentBattleId: null,
	playerRole: null,

	connect: (userId) => {
		if (get().socket) {
			console.log("Socket already exists. Disconnecting first.");
			get().disconnect();
		}

		console.log(`Connecting to ${SERVER_URL} as ${userId}...`);
		set({ userId, error: null });

		const newSocket = io(SERVER_URL, {
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
			get().identify();
		});

		newSocket.on("disconnect", (reason) => {
			console.log(`Socket disconnected. Reason: ${reason}`);
			set({
				socket: null,
				isConnected: false,
				socketId: null,
				error: `Disconnected: ${reason}`,
				currentBattleId: null,
				playerRole: null,
			});
		});

		newSocket.on("connect_error", (err) => {
			console.error("Socket connection error:", err);
			set({
				socket: null,
				isConnected: false,
				socketId: null,
				error: `Connection failed: ${err.message}`,
				currentBattleId: null,
				playerRole: null,
			});
		});

		// Battle-specific event handlers
		newSocket.on("server:battle_created", (data) => {
			console.log("Battle created:", data);
			set({ currentBattleId: data.battleId, playerRole: data.playerRole });
		});

		newSocket.on("server:battle_joined", (data) => {
			console.log("Battle joined:", data);
			set({ currentBattleId: data.battleId, playerRole: data.playerRole });
		});

		newSocket.on("server:battle_end", (data) => {
			console.log("Battle ended:", data);
			// Don't clear battle ID immediately to allow for end-game UI
			// Component should call leaveBattle when ready
		});

		newSocket.on("server:opponent_disconnected", (data) => {
			console.log("Opponent disconnected:", data);
			set({ error: data.message });
			// Don't clear battle state here, let the battle_end event handle it
		});

		// Global event handlers
		newSocket.on("server:identified", (data) => {
			console.log("Server identified client:", data);
		});

		newSocket.on("server:error", (data) => {
			console.error("Server error:", data.message);
			set({ error: data.message });
		});
	},

	disconnect: () => {
		const socket = get().socket;
		if (socket) {
			console.log("Disconnecting socket...");
			socket.disconnect();
		}
		set({
			socket: null,
			isConnected: false,
			socketId: null,
			error: null,
			currentBattleId: null,
			playerRole: null,
		});
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

	emit: (event, ...args) => {
		const { socket } = get();
		if (socket?.connected) {
			socket.emit(event, ...args);
			console.log(`Emitted ${event} with args:`, args);
		} else {
			console.error(`Cannot emit ${event}: Socket not connected.`);
			set({ error: `Cannot emit ${event}: Socket not connected.` });
		}
	},

	// Battle-specific actions
	createBattle: (format: string) => {
		const { userId } = get();
		if (!userId) {
			set({ error: "Cannot create battle: User ID not set." });
			return;
		}
		get().emit("client:create_battle", { format, userId });
	},

	joinBattle: (battleId: string) => {
		const { userId } = get();
		if (!userId) {
			set({ error: "Cannot join battle: User ID not set." });
			return;
		}
		get().emit("client:join_battle", { battleId, userId });
	},

	leaveBattle: () => {
		const { currentBattleId } = get();
		if (currentBattleId) {
			get().emit("client:leave_battle", { battleId: currentBattleId });
			set({ currentBattleId: null, playerRole: null });
		}
	},

	makeDecision: (decision: PlayerDecision) => {
		const { currentBattleId } = get();
		if (!currentBattleId) {
			set({ error: "Cannot make decision: Not in a battle." });
			return;
		}
		get().emit("client:decision", { battleId: currentBattleId, decision });
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
