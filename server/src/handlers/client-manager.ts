import type { ClientInfo } from "../types";

// In-memory client cache
const connectedClients = new Map<string, ClientInfo>();

/**
 * Gets all connected clients
 */
export function getAllConnectedClients(): Map<string, ClientInfo> {
	return connectedClients;
}

/**
 * Gets client info by socket ID
 */
export function getClientInfo(socketId: string): ClientInfo | undefined {
	return connectedClients.get(socketId);
}

/**
 * Adds a client to the connected clients cache
 */
export function addClient(socketId: string, userId: string): void {
	connectedClients.set(socketId, { userId });
}

/**
 * Removes a client from the connected clients cache
 */
export function removeClient(socketId: string): void {
	connectedClients.delete(socketId);
}

/**
 * Gets a client by user ID
 */
export function getClientByUserId(userId: string): [string, ClientInfo] | undefined {
	return Array.from(connectedClients.entries()).find(
		([, info]) => info.userId === userId,
	);
}

/**
 * Updates client info
 */
export function updateClientInfo(socketId: string, updates: Partial<ClientInfo>): void {
	const clientInfo = connectedClients.get(socketId);
	if (clientInfo) {
		connectedClients.set(socketId, { ...clientInfo, ...updates });
	}
}

/**
 * Gets connected client count
 */
export function getConnectedClientCount(): number {
	return connectedClients.size;
}

/**
 * Gets client details for API responses
 */
export function getClientDetails(): Array<{ socketId: string } & ClientInfo> {
	return Array.from(connectedClients.entries()).map(([id, info]) => ({
		socketId: id,
		...info,
	}));
} 