"use client";

import BattleComponent from "../components/BattleView";
import Link from "next/link";
import { useBattleStore } from "../store/battle-store";
import { Button } from "@/components/ui/button";

import BackgroundMusic from "../components/BackgroundMusic";
export default function BattlePage() {
	const { p1Team, p2Team } = useBattleStore();

	return (
		<div className="container mx-auto py-8">
			<BackgroundMusic />
			<div className="mb-6 flex justify-between items-center">
				<Button variant="outline" asChild>
					<Link href="/">← Back to Home</Link>
				</Button>
				<h3 className="text-3xl font-bold">Pokémon Battle</h3>
				<div className="w-[100px]" />
			</div>

			<BattleComponent p1Team={p1Team} p2Team={p2Team} />
		</div>
	);
}
