"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Swords, Dices } from "lucide-react";

export default function Home() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-16">
				<div className="flex flex-col items-center text-center space-y-6 mb-12">
					<h1 className="text-5xl font-bold tracking-tight">
						Pokemon Battling
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl">
						Experience thrilling Pokemon battles! Choose your Pokemon and moves,
						or jump straight into a random battle for quick action.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
					<Card className="flex flex-col">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Dices className="w-6 h-6" />
								<h2 className="text-2xl font-semibold">Quick Random Battle</h2>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Jump straight into action with randomly selected Pokemon and
								moves for both you and your opponent.
							</p>
						</CardContent>
						<CardFooter className="mt-auto">
							<Button variant="default" className="w-full" size="lg" asChild>
								<Link
									href="/battle"
									className="flex items-center justify-center gap-2"
								>
									Random Battle <ArrowRight className="w-4 h-4" />
								</Link>
							</Button>
						</CardFooter>
					</Card>
				</div>
			</div>

			<footer className="fixed bottom-0 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 items-center justify-center text-sm">
					<p className="text-muted-foreground">
						Built with @pkmn/ps libraries. Made with ❤️ by{" "}
						<Link
							href="https://github.com/lakshyaag"
							className="underline hover:text-primary"
						>
							Lakshya Agarwal
						</Link>
					</p>
				</div>
			</footer>
		</div>
	);
}
