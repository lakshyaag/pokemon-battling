import { Generations, type PokemonSet } from "@pkmn/data";
import {
	BattleStreams,
	Teams as DTeams,
	PRNG,
	Dex,
	RandomPlayerAI,
} from "@pkmn/sim";
import { Protocol } from "@pkmn/protocol";
import { GENERATION } from "@/lib/constants";
import { TeamGenerators } from "@pkmn/randoms";
import type { PokemonWithMoves } from "./pokemonUtils";

// Initialize team generators - this is required for proper battle simulation
DTeams.setGeneratorFactory(TeamGenerators);

export type BattleResult = {
	move: string;
	user: string;
	target: string;
	damage?: number;
	effectiveness?: "super" | "resisted" | "immune" | "neutral";
	critical?: boolean;
	message: string;
};

export type BattleState = {
	inProgress: boolean;
	turn: number;
	playerPokemon: {
		name: string;
		hp: number;
		maxHp: number;
		status?: string;
	};
	opponentPokemon: {
		name: string;
		hp: number;
		maxHp: number;
		status?: string;
	};
	lastResults: BattleResult[];
	winner: "player" | "opponent" | null;
};

// Type guard for KWArgs to check properties
function hasProperty<K extends string>(
	obj: Record<string, unknown>,
	prop: K,
): obj is Record<K, unknown> {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Service to handle battle creation and progression using Pokemon Showdown's Battle Simulator
 * Follows the protocol described in https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
 */
export class BattleService {
	private stream: ReturnType<typeof BattleStreams.getPlayerStreams>;
	private state: BattleState;
	private battleStarted = false;
	private resolveUpdate: ((value: BattleState) => void) | null = null;
	private readonly prng: PRNG;

	/**
	 * Creates a new battle service
	 */
	constructor(
		userPokemon: PokemonWithMoves,
		opponentPokemon: PokemonWithMoves,
	) {
		this.stream = BattleStreams.getPlayerStreams(
			new BattleStreams.BattleStream(),
		);

		this.prng = new PRNG(); // Create a new PRNG for more realistic randomness

		// We don't need to create RandomPlayerAI instances since we'll be controlling moves manually
		// const p1 = new RandomPlayerAI(this.stream.p1);
		// const p2 = new RandomPlayerAI(this.stream.p2);

		this.state = {
			inProgress: false,
			turn: 0,
			playerPokemon: {
				name: userPokemon.name,
				hp: 0,
				maxHp: 0,
			},
			opponentPokemon: {
				name: opponentPokemon.name,
				hp: 0,
				maxHp: 0,
			},
			lastResults: [],
			winner: null,
		};

		// Process the battle output
		void this.processBattleStream();
	}

	/**
	 * Process the battle stream output
	 */
	private async processBattleStream() {
		try {
			for await (const chunk of this.stream.omniscient) {
				console.log("Battle stream chunk:", chunk); // Debug logging
				this.processBattleMessage(chunk);
			}
		} catch (error) {
			console.error("Error processing battle stream:", error);
			// Ensure we resolve any pending updates on error
			if (this.resolveUpdate) {
				this.resolveUpdate({ ...this.state });
				this.resolveUpdate = null;
			}
		}
	}

	/**
	 * Process battle message from the stream
	 */
	private processBattleMessage(chunk: string) {
		const lines = chunk.split("\n");

		for (const line of lines) {
			if (!line.trim()) continue;

			console.log("Processing line:", line); // Debug logging

			try {
				const { args, kwArgs } = Protocol.parseBattleLine(line);

				if (!args) continue;

				const command = args[0];

				switch (command) {
					case "turn": {
						const turn = Number.parseInt(args[1], 10);
						this.state.turn = turn;
						this.state.inProgress = true;
						console.log(`Turn ${turn} started`); // Debug logging
						break;
					}
					case "win": {
						const winner = args[1];
						this.state.winner = winner === "Player" ? "player" : "opponent";
						this.state.inProgress = false;
						console.log(`Winner: ${winner}`); // Debug logging
						break;
					}
					case "move": {
						const [_, pokemon, move] = args;
						const isPlayer = pokemon.startsWith("p1");

						const result: BattleResult = {
							move,
							user: isPlayer ? "player" : "opponent",
							target: isPlayer ? "opponent" : "player",
							message: `${pokemon.split(": ")[1]} used ${move}!`,
						};

						// Use type guards for kwArgs properties
						if (hasProperty(kwArgs, "crit")) {
							result.critical = true;
							result.message += " A critical hit!";
						}

						if (hasProperty(kwArgs, "supereffective")) {
							result.effectiveness = "super";
							result.message += " It's super effective!";
						} else if (hasProperty(kwArgs, "resisted")) {
							result.effectiveness = "resisted";
							result.message += " It's not very effective...";
						} else if (hasProperty(kwArgs, "immune")) {
							result.effectiveness = "immune";
							result.message += " It doesn't affect the opponent...";
						} else {
							result.effectiveness = "neutral";
						}

						this.state.lastResults.push(result);
						console.log(`Move used: ${move}`); // Debug logging
						break;
					}
					case "-damage": {
						const [_, pokemon, hpInfo] = args;
						const isPlayer = pokemon.startsWith("p1");
						const [hp, maxHp] = this.parseHPString(hpInfo);

						if (isPlayer) {
							this.state.playerPokemon.hp = hp;
							this.state.playerPokemon.maxHp = maxHp;
						} else {
							this.state.opponentPokemon.hp = hp;
							this.state.opponentPokemon.maxHp = maxHp;
						}

						if (this.state.lastResults.length > 0) {
							const lastResult =
								this.state.lastResults[this.state.lastResults.length - 1];
							if (lastResult.target === (isPlayer ? "player" : "opponent")) {
								lastResult.damage = Math.max(0, lastResult.damage ?? 0);
							}
						}
						console.log(
							`Damage to ${isPlayer ? "player" : "opponent"}: HP = ${hp}/${maxHp}`,
						); // Debug logging
						break;
					}
					case "faint": {
						const [_, pokemon] = args;
						const isPlayer = pokemon.startsWith("p1");

						if (isPlayer) {
							this.state.playerPokemon.hp = 0;
						} else {
							this.state.opponentPokemon.hp = 0;
						}
						console.log(`${isPlayer ? "Player" : "Opponent"} fainted`); // Debug logging
						break;
					}
					case "poke": {
						const [_, player, pokemonStr] = args;
						const isPlayer = player === "p1";
						const name = pokemonStr.split(",")[0];

						if (isPlayer) {
							this.state.playerPokemon.name = name;
						} else {
							this.state.opponentPokemon.name = name;
						}
						console.log(
							`Pokemon added: ${name} for ${isPlayer ? "player" : "opponent"}`,
						); // Debug logging
						break;
					}
					case "-heal": {
						const [_, pokemon, hpInfo] = args;
						const isPlayer = pokemon.startsWith("p1");
						const [hp, maxHp] = this.parseHPString(hpInfo);

						if (isPlayer) {
							this.state.playerPokemon.hp = hp;
							this.state.playerPokemon.maxHp = maxHp;
						} else {
							this.state.opponentPokemon.hp = hp;
							this.state.opponentPokemon.maxHp = maxHp;
						}
						console.log(
							`Heal to ${isPlayer ? "player" : "opponent"}: HP = ${hp}/${maxHp}`,
						); // Debug logging
						break;
					}
					case "swap":
					case "switch":
					case "drag": {
						const [_, pokemon] = args;
						const isPlayer = pokemon.startsWith("p1");
						console.log(`Switch/Drag/Swap: ${pokemon}`); // Debug logging
						break;
					}
					case "start": {
						console.log("Battle started"); // Debug logging
						break;
					}
					case "request": {
						console.log("Request received"); // Debug logging
						// Resolve any pending updates when receiving a new request
						if (this.resolveUpdate) {
							console.log("Resolving update after request"); // Debug logging
							this.resolveUpdate({ ...this.state });
							this.resolveUpdate = null;
						}
						break;
					}
					case "-end": // Use "-end" instead of "end" to match protocol specs
					case "done": {
						// Battle or turn ended
						console.log("Battle or turn ended"); // Debug logging
						this.state.inProgress = false;
						// Resolve any pending updates
						if (this.resolveUpdate) {
							console.log("Resolving update after battle end/done"); // Debug logging
							this.resolveUpdate({ ...this.state });
							this.resolveUpdate = null;
						}
						break;
					}
					default: {
						// For debugging unhandled commands
						console.log(`Unhandled command: ${command}`); // Debug logging
						break;
					}
				}
			} catch (error) {
				console.error("Error processing battle line:", error, line);
			}
		}

		// Resolve at the end of processing all lines if not already resolved
		if (this.resolveUpdate) {
			console.log("Resolving update at end of chunk"); // Debug logging
			this.resolveUpdate({ ...this.state });
			this.resolveUpdate = null;
		}
	}

	/**
	 * Parse HP string to get current HP and max HP
	 */
	private parseHPString(hpString: string): [number, number] {
		if (hpString.includes("/")) {
			const [currentHP, maxHP] = hpString.split("/");
			return [Number.parseInt(currentHP, 10), Number.parseInt(maxHP, 10)];
		}
		return [0, 100]; // Default values
	}

	/**
	 * Create a new battle with a player and opponent Pokemon
	 * Follows the protocol in https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
	 */
	async createBattle(
		playerPokemon: { id: string; moves: string[] },
		opponentPokemon: { id: string; moves: string[] },
	): Promise<BattleState> {
		this.resetBattle();
		console.log("Creating new battle"); // Debug logging

		// Create player Pokemon set
		const playerSet: PokemonSet = {
			name: playerPokemon.id,
			species: playerPokemon.id,
			item: "",
			ability: "",
			moves: playerPokemon.moves,
			nature: "",
			gender: "",
			evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 }, // Full EVs for demo
			ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
			level: 100,
		};

		// Create opponent Pokemon set
		const opponentSet: PokemonSet = {
			name: opponentPokemon.id,
			species: opponentPokemon.id,
			item: "",
			ability: "",
			moves: opponentPokemon.moves,
			nature: "",
			gender: "",
			evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 }, // Full EVs for demo
			ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
			level: 100,
		};

		// Pack teams
		const playerTeam = DTeams.pack([playerSet]);
		const opponentTeam = DTeams.pack([opponentSet]);

		console.log("Player team:", playerTeam); // Debug logging
		console.log("Opponent team:", opponentTeam); // Debug logging

		// Define battle format
		const battleSpec = {
			formatid: `gen${GENERATION}customgame`,
			seed: this.prng.seed, // Add a seed for consistent results
		};

		// Define player options
		const p1spec = {
			name: "Player",
			team: playerTeam,
		};

		// Define opponent options
		const p2spec = {
			name: "Opponent",
			team: opponentTeam,
		};

		// Following the exact protocol format from the documentation
		const startCommand = `>start ${JSON.stringify(battleSpec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`;

		console.log("Start command:", startCommand); // Debug logging

		try {
			// Set battleStarted before writing to stream
			this.battleStarted = true;

			// Write to stream and wait for response
			await this.stream.omniscient.write(startCommand);

			// Wait for battle to initialize
			const result = await this.waitForUpdate();
			console.log("Battle created with result:", result); // Debug logging
			return result;
		} catch (error) {
			console.error("Error creating battle:", error);
			this.battleStarted = false;
			throw error;
		}
	}

	/**
	 * Make a move for both player and opponent
	 * Follows the protocol in https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
	 */
	async makeMove(
		playerMove: string,
		opponentMove: string,
	): Promise<BattleState> {
		if (!this.battleStarted) {
			throw new Error("Battle has not been started yet");
		}

		if (this.state.winner) {
			throw new Error("Battle is already over");
		}

		console.log(
			`Making moves: Player: ${playerMove}, Opponent: ${opponentMove}`,
		); // Debug logging

		// Clear previous results
		this.state.lastResults = [];
		this.state.inProgress = true;

		// Format move command according to the protocol
		// The protocol expects move indices or move names, so we need to use the actual move name
		const moveCommand = `>p1 move ${playerMove}
>p2 move ${opponentMove}`;

		console.log("Move command:", moveCommand); // Debug logging

		try {
			// Write to stream and wait for response
			await this.stream.omniscient.write(moveCommand);

			// Wait for update with timeout
			const result = await this.waitForUpdate(5000); // 5 second timeout
			console.log("Move completed with result:", result); // Debug logging
			return result;
		} catch (error) {
			console.error("Error making move:", error);
			// Update state to not be in progress anymore in case of error
			this.state.inProgress = false;
			throw error;
		}
	}

	/**
	 * Reset the battle state
	 */
	private resetBattle() {
		this.state = {
			inProgress: false,
			turn: 0,
			playerPokemon: {
				name: "",
				hp: 0,
				maxHp: 0,
			},
			opponentPokemon: {
				name: "",
				hp: 0,
				maxHp: 0,
			},
			lastResults: [],
			winner: null,
		};
		this.battleStarted = false;
	}

	/**
	 * Wait for the battle state to update with optional timeout
	 */
	private waitForUpdate(timeout?: number): Promise<BattleState> {
		return new Promise((resolve, reject) => {
			// Set timeout if provided
			let timeoutId: NodeJS.Timeout | undefined;
			if (timeout) {
				timeoutId = setTimeout(() => {
					// If timeout occurs and update hasn't resolved yet
					if (this.resolveUpdate === resolve) {
						this.resolveUpdate = null;
						console.log("Update timed out after", timeout, "ms"); // Debug logging
						this.state.inProgress = false; // Ensure we're not stuck
						reject(new Error(`Battle update timed out after ${timeout}ms`));
					}
				}, timeout);
			}

			// Set resolve function
			this.resolveUpdate = (value: BattleState) => {
				if (timeoutId) clearTimeout(timeoutId);
				resolve(value);
			};
		});
	}

	/**
	 * Get the current battle state
	 */
	getBattleState(): BattleState {
		return { ...this.state };
	}
}
