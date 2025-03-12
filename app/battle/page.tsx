"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import BattleComponent from "../components/BattleView";
import Link from "next/link";
import { useBattleStore } from "../store/battle-store";
/**
 * Battle page component
 */
export default function BattlePage() {
	const { p1Team, p2Team } = useBattleStore();

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex justify-between items-center">
				<Link
					href="/"
					className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
				>
					← Back to Home
				</Link>
				<h1 className="text-3xl font-bold text-center">Pokémon Battle</h1>
				<div className="w-[100px]" />
			</div>

			<BattleComponent p1Team={p1Team} p2Team={p2Team} />
		</div>
	);
}
