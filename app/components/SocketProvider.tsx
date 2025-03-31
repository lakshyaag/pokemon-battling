// app/components/providers/SocketProvider.tsx
"use client";

import { useEffect } from "react";
import { useSocketStore } from "@/store/socket"; // Adjust path if needed

export function SocketProvider({ children }: { children: React.ReactNode }) {
	const connect = useSocketStore((state) => state.connect);
	const disconnect = useSocketStore((state) => state.disconnect);
	const isConnected = useSocketStore((state) => state.isConnected);
	const socketId = useSocketStore((state) => state.socketId);
	const userId = useSocketStore((state) => state.userId);

	useEffect(() => {
		// Function to get or set user ID (client-side only)
		function getOrSetUserIdClientSide(): string {
			const storedUserId = localStorage.getItem("pokemonBattleUserId");
			if (storedUserId) {
				return storedUserId;
			}

			// Lazy import uuid only on client
			import("uuid").then(({ v4: uuidv4 }) => {
				const newUserId = `user_${uuidv4().substring(0, 6)}`;
				localStorage.setItem("pokemonBattleUserId", newUserId);
				// If not connected yet after ID generation, attempt connection
				if (!isConnected && !userId) {
					console.log(
						"Attempting connection after generating new User ID:",
						newUserId,
					);
					connect(newUserId);
				}
				return newUserId; // Return though it might be slightly delayed
			});
			// Return a temporary or default value while waiting for async import/generation
			return localStorage.getItem("pokemonBattleUserId") || "pending_user_id";
		}

		if (!isConnected && !userId) {
			// Check if not connected AND userId isn't set yet
			const currentUserId = getOrSetUserIdClientSide();
			// If ID was already available synchronously, connect immediately
			if (currentUserId !== "pending_user_id") {
				console.log(
					"Attempting connection with existing/sync User ID:",
					currentUserId,
				);
				connect(currentUserId);
			}
		}

		// Optional: Cleanup on component unmount
		// return () => {
		//     console.log("SocketProvider unmounting - disconnecting socket.");
		//     disconnect();
		// };
		// Re-run effect if connect function reference changes (should be stable with Zustand)
	}, [connect, isConnected, userId]);

	// Display connection status (optional)
	console.log(
		`Socket Status: ${isConnected ? `Connected (${socketId}, User: ${userId})` : "Disconnected"}`,
	);

	return <>{children}</>;
}
