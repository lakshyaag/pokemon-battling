import { Battle } from "@pkmn/client";
import { Generations } from "@pkmn/data";
import {
	type ArgName,
	type ArgType,
	type BattleArgsKWArgType,
	Protocol,
} from "@pkmn/protocol";
import { TeamGenerators } from "@pkmn/randoms";
import {
	BattleStreams,
	Teams as DTeams,
	Dex,
	type ModdedDex,
	PRNG,
} from "@pkmn/sim";
import type { ObjectReadWriteStream } from "@pkmn/streams";
import { LogFormatter } from "@pkmn/view";
import {
	BattleEventEmitter,
	type BattleEventMap,
} from "./battle-event-emitter";
import type {
	BattleState,
	BattleOptions,
	PlayerDecision,
	PlayerRequest,
} from "./battle-types";
import { ManualPlayer } from "./player";

/**
 * Core battle engine that manages the battle state and logic
 */
export class BattleEngine {
	private battle: Battle;
	private streams: ReturnType<typeof BattleStreams.getPlayerStreams>;
	private p1Stream: ObjectReadWriteStream<string>;
	private p2Stream: ObjectReadWriteStream<string>;
	private formatter: LogFormatter;
	private prng: PRNG;
	private dex: ModdedDex;
	private gens: Generations;
	private format: string;
	private eventEmitter: BattleEventEmitter;
	private p1: ManualPlayer;
	private p2: ManualPlayer;
	private logs: string[] = [];
	private p1Request: PlayerRequest | null = null;
	private p2Request: PlayerRequest | null = null;

	/**
	 * Create a battle engine
	 * @param options - The battle options
	 */
	constructor(options: BattleOptions) {
		this.format = options.format || "gen3randombattle";
		this.prng = new PRNG();
		this.dex = Dex.forFormat(this.format);
		// @ts-ignore
		this.gens = new Generations(Dex);
		this.eventEmitter = new BattleEventEmitter();

		// Set up team generators
		DTeams.setGeneratorFactory(TeamGenerators);

		// Create battle streams
		this.streams = BattleStreams.getPlayerStreams(
			new BattleStreams.BattleStream(),
		);
		this.p1Stream = this.streams.p1;
		this.p2Stream = this.streams.p2;

		// Create battle instance
		this.battle = new Battle(this.gens);

		// Create formatter
		this.formatter = new LogFormatter("p1", this.battle);

		// Initialize players
		this.p1 = new ManualPlayer(
			this.p1Stream,
			false,
			options.p1Name,
			(request: PlayerRequest) => this.handlePlayerRequest("p1", request),
		);

		this.p2 = new ManualPlayer(
			this.p2Stream,
			false,
			options.p2Name,
			(request) => this.handlePlayerRequest("p2", request),
		);

		// Set up onBattleUpdate callback if provided
		if (options.onBattleUpdate) {
			this.on("stateUpdate", (state) => {
				if (options.onBattleUpdate) {
					options.onBattleUpdate(state);
				}
			});
		}

		// Start listening to the omniscient stream
		this.startBattleStream();
	}

	/**
	 * Start the battle stream
	 */
	private async startBattleStream(): Promise<void> {
		try {
			for await (const chunk of this.streams.omniscient) {
				for (const line of chunk.split("\n")) {
					const { args, kwArgs } = Protocol.parseBattleLine(line);
					const html = this.formatter.formatHTML(args, kwArgs);
					
					// Update battle state
					this.battle.add(args, kwArgs);

					if (html) {
						this.logs.push(html);
					}
				}

				// Update battle
				this.battle.update();

				// Emit state update event
				this.eventEmitter.emit("stateUpdate", {
					battle: this.battle,
					logs: [...this.logs],
					p1Request: this.p1Request,
					p2Request: this.p2Request
				});
			}
		} catch (error) {
			console.error("Battle stream error:", error);
			this.eventEmitter.emit("battleEnd", { winner: 'error', state: this.battle });
		}
	}

	/**
	 * Handle a player request
	 * @param player - The player ID
	 * @param request - The request
	 */
	private handlePlayerRequest(
		player: "p1" | "p2",
		request: PlayerRequest,
	): void {
		if (player === "p1") {
			this.p1Request = request;
		} else {
			this.p2Request = request;
		}

		this.eventEmitter.emit("playerRequest", { player, request });
		this.eventEmitter.emit("stateUpdate", {
			battle: this.battle,
			logs: [...this.logs],
			p1Request: this.p1Request,
			p2Request: this.p2Request
		});
	}

	/**
	 * Start the battle
	 * @param p1Team - Optional team for player 1
	 * @param p2Team - Optional team for player 2
	 */
	startBattle(p1Team?: string, p2Team?: string): void {
		const spec = { formatid: this.format };

		// Generate random teams if needed
		const createTeam = () => {
			// Use the built-in team generator
			try {
				const generator = TeamGenerators.getTeamGenerator(
					this.format,
					this.prng,
				);
				return DTeams.export(generator.getTeam());
			} catch (error) {
				console.error("Error generating random team:", error);
				return null;
			}
		};

		const p1TeamFinal = p1Team || createTeam();
		const p2TeamFinal = p2Team || createTeam();

		const p1spec = {
			name: this.p1.playerName,
			team: p1TeamFinal ? DTeams.import(p1TeamFinal) : null,
		};
		const p2spec = {
			name: this.p2.playerName,
			team: p2TeamFinal ? DTeams.import(p2TeamFinal) : null,
		};

		// Start the battle
		void this.streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);

		// Emit battle start event
		this.eventEmitter.emit("battleStart", this.battle);
	}

	/**
	 * Process a player's move decision
	 * @param player - The player ID
	 * @param decision - The player's decision
	 */
	processPlayerDecision(player: "p1" | "p2", decision: PlayerDecision): void {
		// Clear the request as the player has made a choice
		if (player === 'p1') this.p1Request = null;
		else this.p2Request = null;

		if (decision.type === "move") {
			const choice = `move ${decision.moveIndex}`;
			if (player === "p1") {
				void this.p1Stream.write(choice);
			} else {
				void this.p2Stream.write(choice);
			}
			this.eventEmitter.emit("playerMove", { player, moveIndex: decision.moveIndex });
		}

		this.eventEmitter.emit("stateUpdate", {
			battle: this.battle,
			logs: [...this.logs],
			p1Request: this.p1Request,
			p2Request: this.p2Request
		});
	}

	/**
	 * Get data for a move
	 * @param moveId - The move ID
	 * @returns The move data
	 */
	getMoveData(moveId: string) {
		return this.dex.moves.get(moveId);
	}

	/**
	 * Get data for an item
	 * @param itemId - The item ID
	 * @returns The item data
	 */
	getItem(itemId: string) {
		return this.dex.items.get(itemId);
	}

	/**
	 * Get data for an ability
	 * @param abilityId - The ability ID
	 * @returns The ability data
	 */
	getAbility(abilityId: string) {
		return this.dex.abilities.get(abilityId);
	}

	/**
	 * Subscribe to battle events with type safety
	 * @param event - The event name
	 * @param listener - The event listener function
	 * @returns A function to unsubscribe
	 */
	on<K extends keyof BattleEventMap>(
		event: K,
		listener: (data: BattleEventMap[K]) => void,
	): () => void {
		return this.eventEmitter.on(event, listener);
	}

	getBattle(): Readonly<Battle> {
		return this.battle;
	}

	getLogs(): ReadonlyArray<string> {
		return this.logs;
	}

	getP1Request(): Readonly<PlayerRequest> | null {
		return this.p1Request;
	}

	getP2Request(): Readonly<PlayerRequest> | null {
		return this.p2Request;
	}
}
