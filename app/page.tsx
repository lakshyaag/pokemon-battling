import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Home() {
	return (
		<div className="grid grid-rows-[20px_1fr_20px] min-h-screen p-8 pb-20 gap-16 sm:p-20">
			<main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
				<h1 className="text-4xl font-bold">Pokemon Battling</h1>
				<p className="text-xl text-center sm:text-left text-muted-foreground">
					Welcome to the Pokemon Battling App! Choose your Pokemon, select
					moves, and battle against a randomly selected opponent.
				</p>

				<div className="flex gap-4 items-center flex-col sm:flex-row">
					<Button asChild size="lg">
						<Link href="/pkmn-select">Start a Battle</Link>
					</Button>
					<Button variant="outline" size="lg" asChild>
						<Link href="/battle">
							Quick Random Battle
						</Link>
					</Button>
				</div>

				<Card>
					<CardHeader>
						<h2 className="text-lg font-semibold">How It Works</h2>
					</CardHeader>
					<CardContent>
						<ol className="list-decimal pl-5 space-y-2">
							<li>Select your Pokemon from the Pokedex</li>
							<li>Get assigned 4 random moves from that Pokemon's learnset</li>
							<li>
								The app will randomly select an opponent Pokemon with its own
								random moves
							</li>
							<li>Select moves for your Pokemon during the battle</li>
							<li>Watch the battle play out with detailed mechanics</li>
						</ol>
					</CardContent>
				</Card>
			</main>
			<footer className="row-start-3 flex gap-6 items-center justify-center">
				<span className="text-sm text-muted-foreground">
					Built with @pkmn/ps libraries
				</span>
			</footer>
		</div>
	);
}
