"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Dices, Loader2 } from "lucide-react";
import { useSocketStore } from "@/store/socket";
import { useSettings } from "@/store/settings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFormat } from "@/lib/constants";

export default function Home() {
	const { isConnected, socket, userId, emit } = useSocketStore();
	const { generation } = useSettings();
	const router = useRouter();
	const [isCreatingBattle, setIsCreatingBattle] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!socket) return;

		const handleBattleCreated = (data: {
			battleId: string;
			playerRole: "p1" | "p2";
		}) => {
			console.log("Received server:battle_created", data);
			setIsCreatingBattle(false);
			router.push(`/battle/${data.battleId}`);
		};

		const handleError = (data: { message: string }) => {
			console.error(
				"Received server error during battle creation:",
				data.message,
			);
			setError(`Failed to create battle: ${data.message}`);
			setIsCreatingBattle(false);
		};

		socket.on("server:battle_created", handleBattleCreated);
		socket.on("server:error", handleError);

		return () => {
			socket.off("server:battle_created", handleBattleCreated);
			socket.off("server:error", handleError);
		};
	}, [socket, router]);

	const handleCreateRandomBattle = () => {
		if (!isConnected || !userId || !socket) {
			setError("Not connected to the server. Please wait or refresh.");
			console.error("Cannot create battle: Not connected.");
			return;
		}
		if (isCreatingBattle) return;

		setError(null);
		setIsCreatingBattle(true);
		console.log("Requesting random battle creation...");

		const format = getFormat(generation);

		emit("client:create_battle", { format, userId });

		const timeoutId = setTimeout(() => {
			if (isCreatingBattle) {
				setError("Server did not respond to battle creation request.");
				setIsCreatingBattle(false);
			}
		}, 15000);

		return () => clearTimeout(timeoutId);
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-16">
				<div className="flex flex-col items-center text-center space-y-6 mb-12">
					<h1 className="text-5xl font-bold tracking-tight">
						Pokemon Battling
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl">
						Experience thrilling Pokemon battles!
					</p>
					{!isConnected && (
						<p className="text-yellow-600">Connecting to server...</p>
					)}
					{error && <p className="text-destructive">{error}</p>}
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
								Jump straight into action with randomly selected Pokemon! Find
								an opponent and battle it out.
							</p>
						</CardContent>
						<CardFooter className="mt-auto">
							<Button
								variant="default"
								className="w-full"
								size="lg"
								onClick={handleCreateRandomBattle}
								disabled={!isConnected || isCreatingBattle}
							>
								{isCreatingBattle ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating Battle...
									</>
								) : (
									<>
										Find Random Battle <ArrowRight className="ml-2 w-4 h-4" />
									</>
								)}
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
