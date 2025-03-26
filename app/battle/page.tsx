"use client";

import React from "react";
import BattleComponent from "@/components/BattleView";
import { useBattleStore } from "@/store/battle-store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function BattlePage() {
	const { p1Team, p2Team } = useBattleStore();
	const router = useRouter();

	// No redirect - we'll use random teams if none are provided

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex justify-between items-center">
				<h1 className="text-3xl font-bold">Pokémon Battle</h1>
				<div className="flex gap-4">
					<Button
						variant="outline"
						onClick={() => router.push("/")}
					>
						Return to Home
					</Button>
				</div>
			</div>
			<BattleComponent 
				format="gen3randombattle"
				p1Name="Player 1"
				p2Name="Player 2"
				p1Team={p1Team || undefined}
				p2Team={p2Team || undefined}
			/>
		</div>
	);
}
