import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import type { AddressInfo } from "node:net";
import { setupSocketHandlers } from "./socket/handlers";
import { getRecentBattles } from "./db/battle-db";
import { getClientDetails, getConnectedClientCount } from "./handlers/client-manager";
import { getAllActiveBattles } from "./handlers/battle-manager";

// --- Express App Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		// Allow connections from your frontend's origin
		origin: process.env.CLIENT_ORIGIN || "*",
		methods: ["GET", "POST"],
	},
	pingInterval: 5000,
	pingTimeout: 10000,
});

const PORT = process.env.PORT || 8080;

// Set up Socket.IO handlers
setupSocketHandlers(io);

// --- HTTP Routes ---
app.get("/", async (req, res) => {
	// Get active battles from database
	const dbBattles = await getRecentBattles(50);
	
	res.status(200).json({
		message: "Pokemon Battle WebSocket Server is active.",
		connectedClients: getConnectedClientCount(),
		activeBattles: getAllActiveBattles().length,
		clientDetails: getClientDetails(),
		battleDetails: getAllActiveBattles(),
		recentBattles: dbBattles || [],
	});
});

// --- Start the HTTP Server ---
server.listen(PORT, () => {
	const address = server.address() as AddressInfo;
	console.log(`WebSocket server running on port ${address.port}.`);
	console.log("Server setup complete. Waiting for connections...");
}); 