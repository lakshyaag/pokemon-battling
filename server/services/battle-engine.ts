import { Battle, type ID } from "@pkmn/sim";
import { Generations } from "@pkmn/data";
import { Protocol } from "@pkmn/protocol";
import { TeamGenerators } from "@pkmn/randoms";
import {
	BattleStreams,
	Teams as DTeams,
	Dex,
	type ModdedDex,
	PRNG,
} from "@pkmn/sim";
import type { ObjectReadWriteStream } from "@pkmn/streams";
import {
	BattleEventEmitter,
	type BattleEventMap,
} from "./battle-event-emitter";
import type {
	BattleOptions,
	PlayerDecision,
	PlayerRequest,
} from "./battle-types";
import { ManualPlayer } from "./player";

export interface BattleProtocolEventMap extends Record<string, unknown> {
	protocol: { type: "omniscient" | "p1" | "p2"; lines: string[] };
	request: { player: "p1" | "p2"; request: PlayerRequest };
	battleEnd: { winner: string | null };
	battleStart: { battleId: string; initialLines: string[] };
}

/**
 * Core battle engine that manages the battle state and logic, emitting protocol lines.
 */
export class BattleEngine {
	private battle: Battle;
	private streams: ReturnType<typeof BattleStreams.getPlayerStreams>;
	private p1Stream: ObjectReadWriteStream<string>;
	private p2Stream: ObjectReadWriteStream<string>;
	private prng: PRNG;
	private dex: ModdedDex;
	private gens: Generations;
	private format: ID;
	private eventEmitter: BattleEventEmitter<BattleProtocolEventMap>;
	private p1: ManualPlayer;
	private p2: ManualPlayer;
	private p1Request: PlayerRequest | null = null;
	private p2Request: PlayerRequest | null = null;
	private battleId: string;
	private debug: boolean;
	private initialProtocolLines: string[] = [];
	private battleStarted = false;

	constructor(battleId: string, options: BattleOptions) {
		this.battleId = battleId;
		this.format = (options.format as ID) || ("gen3randombattle" as ID);
		this.debug = options.debug ?? false;
		this.prng = new PRNG();
		this.dex = Dex.forFormat(this.format);
		// @ts-ignore
		this.gens = new Generations(Dex);
		this.eventEmitter = new BattleEventEmitter<BattleProtocolEventMap>();

		DTeams.setGeneratorFactory(TeamGenerators);
		this.streams = BattleStreams.getPlayerStreams(
			new BattleStreams.BattleStream({ debug: this.debug }),
		);
		this.p1Stream = this.streams.p1;
		this.p2Stream = this.streams.p2;
		this.battle = new Battle({ formatid: this.format });

		this.p1 = new ManualPlayer(
			this.p1Stream,
			this.debug,
			options.p1Name,
			(request: PlayerRequest) => this.handlePlayerRequest("p1", request),
			(lines: string[]) => this.handlePlayerProtocol("p1", lines),
		);
		this.p2 = new ManualPlayer(
			this.p2Stream,
			this.debug,
			options.p2Name,
			(request: PlayerRequest) => this.handlePlayerRequest("p2", request),
			(lines: string[]) => this.handlePlayerProtocol("p2", lines),
		);

		void this.startOmniscientStream();
	}

	private async startOmniscientStream(): Promise<void> {
		try {
			for await (const chunk of this.streams.omniscient) {
				const lines = chunk.split("\n").filter((line) => line.length > 0);
				if (lines.length === 0) continue;

				const containsStartLine = lines.some(line => line === "|start");
				if (containsStartLine && !this.battleStarted) {
					this.initialProtocolLines.push(...lines);
					this.battleStarted = true;
					
					this.eventEmitter.emit("battleStart", { 
						battleId: this.battleId,
						initialLines: this.initialProtocolLines
					});
				}

				for (const line of lines) {
					try {
						const { args, kwArgs } = Protocol.parseBattleLine(line);
						// @ts-ignore
						this.battle.add(args, kwArgs);
					} catch (e) {
						console.error(
							`[BattleEngine ${this.battleId}] Error parsing omni line: "${line}"`,
							e,
						);
						this.eventEmitter.emit("protocol", {
							type: "omniscient",
							lines: [
								`|error|[ProtocolParseError] ${e instanceof Error ? e.message : String(e)}`,
							],
						});
					}
				}

				this.eventEmitter.emit("protocol", { type: "omniscient", lines });

				if (this.battle.ended) {
					if (this.debug) {
						console.log(
							`[BattleEngine ${this.battleId}] Battle ended internally. Winner: ${this.battle.winner}`,
						);
					}
					this.eventEmitter.emit("battleEnd", {
						winner: this.battle.winner || null,
					});
					break;
				}
			}
			if (this.debug) {
				console.log(
					`[BattleEngine ${this.battleId}] Omniscient stream finished.`,
				);
			}
		} catch (error) {
			console.error(
				`[BattleEngine ${this.battleId}] Omniscient stream error:`,
				error,
			);
			this.eventEmitter.emit("battleEnd", {
				winner: null,
			});
		} finally {
			this.destroy();
		}
	}

	private handlePlayerProtocol(player: "p1" | "p2", lines: string[]): void {
		this.eventEmitter.emit("protocol", { type: player, lines });
	}

	private handlePlayerRequest(
		player: "p1" | "p2",
		request: PlayerRequest,
	): void {
		if (player === "p1") this.p1Request = request;
		else this.p2Request = request;

		this.eventEmitter.emit("request", { player, request });
	}

	startBattle(p1Team?: string, p2Team?: string): void {
		const spec = { formatid: this.format };

		const createTeam = () => {
			try {
				const generator = TeamGenerators.getTeamGenerator(
					this.format,
					this.prng,
				);
				return DTeams.export(generator.getTeam());
			} catch (error) {
				console.error(
					`[BattleEngine ${this.battleId}] Error generating random team:`,
					error,
				);
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

		void this.streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);

		this.eventEmitter.emit("battleStart", { battleId: this.battleId, initialLines: this.initialProtocolLines });
	}

	processPlayerDecision(player: "p1" | "p2", decision: PlayerDecision): void {
		const playerStream = player === "p1" ? this.p1Stream : this.p2Stream;
		let choice = "";

		if (decision.type === "move") choice = `move ${decision.moveIndex}`;
		else if (decision.type === "switch")
			choice = `switch ${decision.pokemonIndex}`;

		if (choice) {
			if (player === "p1") this.p1Request = null;
			else this.p2Request = null;

			try {
				void playerStream.write(choice);
			} catch (error) {
				console.error(
					`[BattleEngine ${this.battleId}] Error writing choice for ${player}:`,
					error,
				);
				const errorLine = `|error|[ChoiceError] Failed to process decision: ${error instanceof Error ? error.message : String(error)}`;
				this.eventEmitter.emit("protocol", {
					type: player,
					lines: [errorLine],
				});
			}
		} else {
			console.warn(
				`[BattleEngine ${this.battleId}] Invalid decision type received for ${player}:`,
				decision,
			);
		}
	}

	on<K extends keyof BattleProtocolEventMap>(
		event: K,
		listener: (data: BattleProtocolEventMap[K]) => void,
	): () => void {
		return this.eventEmitter.on(event, listener);
	}

	getP1Request(): Readonly<PlayerRequest> | null {
		return this.p1Request;
	}

	getP2Request(): Readonly<PlayerRequest> | null {
		return this.p2Request;
	}

	updatePlayerName(player: "p1" | "p2", name: string): void {
		if (player === "p1") this.p1.playerName = name;
		else this.p2.playerName = name;
	}

	destroy(): void {
		if (this.debug) {
			console.log(`[BattleEngine ${this.battleId}] Destroying battle...`);
		}
		try {
			this.streams.omniscient.destroy();
		} catch (e) {
			/* ignore */
		}
		try {
			this.streams.p1.destroy();
		} catch (e) {
			/* ignore */
		}
		try {
			this.streams.p2.destroy();
		} catch (e) {
			/* ignore */
		}
		this.eventEmitter.removeAllListeners();
	}

	getInitialProtocolLines(): string[] {
		return [...this.initialProtocolLines];
	}
}
