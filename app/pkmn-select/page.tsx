"use client";

import { useRouter } from "next/navigation";
import PokemonSelector from "../components/PokemonSelector";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/**
 * Page for selecting a Pokemon to battle with
 */
export default function SelectPokemonPage() {
	const router = useRouter();

	return (
		<main className="container mx-auto py-8 px-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-3xl">Select Your Pokemon</CardTitle>
					<CardDescription>
						Choose one Pokemon from Generation 1 to use in your battle. You'll
						get 4 random moves from its moveset.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PokemonSelector />
				</CardContent>
			</Card>
		</main>
	);
}
