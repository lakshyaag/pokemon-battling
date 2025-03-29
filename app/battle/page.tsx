"use client";

import React, { useState, useEffect } from "react";
import BattleView from "@/components/BattleView";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { battleManager } from "@/services/battle-manager-instance";
import { useSettings } from "@/store/settings";
import { getFormat } from "@/lib/constants";

export default function BattlePage() {
	const { generation } = useSettings();
	const router = useRouter();
	const [battleId, setBattleId] = useState<string | null>(null);

	useEffect(() => {
		// Only create a new battle if we don't have one
		if (!battleId) {
			const id = crypto.randomUUID();
			const format = getFormat(generation);
			const p1Name = "Player 1";
			const p2Name = "Player 2";

			try {
				const battle = battleManager.createBattle(id, {
					format,
					p1Name,
					p2Name,
				});

				// Subscribe to battle end to handle cleanup
				battle.on("battleEnd", () => {
					// Keep the battle around for a minute to allow for viewing results
					setTimeout(() => {
						battleManager.removeBattle(id);
					}, 60000);
				});

				battleManager.startBattle(id);
				setBattleId(id);
			} catch (error) {
				console.error("Error creating battle:", error);
				router.push("/");
			}
		}

		// Cleanup only when explicitly navigating away
		return () => {
			if (battleId) {
				const battle = battleManager.getBattle(battleId);
				if (battle) {
					battleManager.removeBattle(battleId);
				}
			}
		};
	}, [generation, router, battleId]);

	const handleReturnHome = () => {
		if (battleId) {
			battleManager.removeBattle(battleId);
		}
		router.push("/");
	};

	if (!battleId) {
		return <div>Loading Battle...</div>;
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex justify-between items-center">
				<h1 className="text-3xl font-bold">Pokémon Battle</h1>
				<div className="flex gap-4">
					<Button
						variant="outline"
						onClick={handleReturnHome}
					>
						Return to Home
					</Button>
				</div>
			</div>
			<BattleView battleId={battleId} />
		</div>
	);
}
