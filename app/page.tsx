"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Dices, Loader2, LogIn } from "lucide-react";
import { useSocketStore } from "@/store/socket";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { generation, getFormat } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
	const { isConnected, socket, userId, emit } = useSocketStore();
	
	const router = useRouter();
	const [isCreatingBattle, setIsCreatingBattle] = useState(false);
	const [isJoiningBattle, setIsJoiningBattle] = useState(false);
	const [joinBattleId, setJoinBattleId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const createTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (!socket) return;

		const cleanupTimeouts = () => {
			if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
			if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
		};

		const handleBattleCreated = (data: {
			battleId: string;
			playerRole: "p1" | "p2";
		}) => {
			console.log("Received server:battle_created", data);
			if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
			setIsCreatingBattle(false);
			router.push(`/battle/${data.battleId}`);
		};

		const handleError = (data: { message: string }) => {
			console.error("Received server error:", data.message);
			setError(`Operation failed: ${data.message}`);
			if (isCreatingBattle) {
				if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
				setIsCreatingBattle(false);
			}
			if (isJoiningBattle) {
				if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
				setIsJoiningBattle(false);
			}
		};

		socket.on("server:battle_created", handleBattleCreated);

		socket.on("server:error", handleError);

		return () => {
			cleanupTimeouts();
			socket.off("server:battle_created", handleBattleCreated);
			socket.off("server:error", handleError);
		};
	}, [socket, router, isCreatingBattle, isJoiningBattle]);

	const handleCreateRandomBattle = () => {
		if (
			!isConnected ||
			!userId ||
			!socket ||
			isCreatingBattle ||
			isJoiningBattle
		)
			return;

		setError(null);
		setIsCreatingBattle(true);
		console.log("Requesting random battle creation...");
		const format = getFormat(generation);
		console.log("Format:", format);
		emit("client:create_battle", { format, userId });

		if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
		createTimeoutRef.current = setTimeout(() => {
			setIsCreatingBattle((current) => {
				if (current) {
					setError("Server did not respond to battle creation request.");
					return false;
				}
				return current;
			});
		}, 15000);
	};

	const handleJoinBattle = () => {
		if (
			!isConnected ||
			!userId ||
			!socket ||
			!joinBattleId.trim() ||
			isCreatingBattle ||
			isJoiningBattle
		) {
			if (!joinBattleId.trim()) setError("Please enter a Battle ID to join.");
			else
				setError(
					"Cannot join battle now (check connection or ongoing actions).",
				);
			return;
		}

		setError(null);
		setIsJoiningBattle(true);
		const battleIdToJoin = joinBattleId.trim();
		console.log(`Requesting to join battle ${battleIdToJoin}...`);

		router.push(`/battle/${battleIdToJoin}`);
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
						<p className="text-yellow-600 animate-pulse">
							Connecting to server...
						</p>
					)}
					{error && <p className="text-destructive font-medium">{error}</p>}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
					<Card className="flex flex-col">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Dices className="w-6 h-6" />
								<h2 className="text-2xl font-semibold">New Random Battle</h2>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Create a new battle room and wait for an opponent to join.
							</p>
						</CardContent>
						<CardFooter className="mt-auto">
							<Button
								variant="default"
								className="w-full"
								size="lg"
								onClick={handleCreateRandomBattle}
								disabled={!isConnected || isCreatingBattle || isJoiningBattle}
							>
								{isCreatingBattle ? (
									<>
										{" "}
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
										Creating...{" "}
									</>
								) : (
									<>
										{" "}
										Create Battle <ArrowRight className="ml-2 w-4 h-4" />{" "}
									</>
								)}
							</Button>
						</CardFooter>
					</Card>

					<Card className="flex flex-col">
						<CardHeader>
							<div className="flex items-center gap-2">
								<LogIn className="w-6 h-6" />
								<h2 className="text-2xl font-semibold">Join Battle</h2>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-muted-foreground">
								Enter the ID of a battle created by someone else to join as
								Player 2.
							</p>
							<div>
								<Label
									htmlFor="battleIdInput"
									className="mb-1.5 block text-sm font-medium"
								>
									Battle ID
								</Label>
								<Input
									id="battleIdInput"
									type="text"
									placeholder="Enter Battle ID..."
									value={joinBattleId}
									onChange={(e) => setJoinBattleId(e.target.value)}
									disabled={isJoiningBattle || isCreatingBattle || !isConnected}
								/>
							</div>
						</CardContent>
						<CardFooter className="mt-auto">
							<Button
								variant="secondary"
								className="w-full"
								size="lg"
								onClick={handleJoinBattle}
								disabled={
									!isConnected ||
									!joinBattleId.trim() ||
									isJoiningBattle ||
									isCreatingBattle
								}
							>
								{isJoiningBattle ? (
									<>
										{" "}
										<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...{" "}
									</>
								) : (
									<>
										{" "}
										Join Battle <LogIn className="ml-2 w-4 h-4" />{" "}
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
						Built with @pkmn/sim. Made with ❤️ by{" "}
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
