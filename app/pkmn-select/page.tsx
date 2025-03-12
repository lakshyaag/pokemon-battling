"use client";
import PokemonSelector from "../components/PokemonSelector";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FORMAT } from "@/lib/constants";

/**
 * Page for selecting a Pokemon to battle with
 */
export default function SelectPokemonPage() {
	return (
		<main className="container mx-auto py-8 px-4">
			<Card>
				<CardHeader>
					<CardTitle className="text-3xl">Select Your Pokemon</CardTitle>
					<CardDescription>
						Choose one Pokemon to use in your battle. You'll get 4 random moves
						from its moveset. The format is <pre>{FORMAT}</pre>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PokemonSelector />
				</CardContent>
			</Card>
		</main>
	);
}
