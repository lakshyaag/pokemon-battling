import { Battle, type Pokemon } from "@pkmn/client";
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
import type { BattleRequest } from "./player";

/**
 * Interface for battle options
 */
interface BattleOptions {
    format: string;
    p1Name: string;
    p2Name: string;
    p1Team?: string;
    p2Team?: string;
    onBattleUpdate?: (state: BattleState) => void;
}

/**
 * Interface for battle state
 */
interface BattleState {
    turn: number;
    p1: {
        active: Pokemon | null;
        team: Pokemon[];
        request: BattleRequest | null;
        selectedMove: number | null;
    };
    p2: {
        active: Pokemon | null;
        team: Pokemon[];
        request: BattleRequest | null;
        selectedMove: number | null;
    };
    weather: string;
    status: string;
    logs: string[];
}

/**
 * Class representing a manual player in a Pokémon battle
 */
class ManualPlayer {
    stream: ObjectReadWriteStream<string>;
    log: string[] = [];
    debug: boolean;
    currentRequest: BattleRequest | null = null;
    playerName: string;
    onRequestReceived: (request: BattleRequest) => void;

    /**
     * Create a manual player
     * @param playerStream - The player's stream
     * @param debug - Whether to enable debug logging
     * @param playerName - The player's name
     * @param onRequestReceived - Callback for when a request is received
     */
    constructor(
        playerStream: ObjectReadWriteStream<string>,
        debug = false,
        playerName = "Unknown",
        onRequestReceived: (request: BattleRequest) => void = () => { },
    ) {
        this.stream = playerStream;
        this.debug = debug;
        this.playerName = playerName;
        this.onRequestReceived = onRequestReceived;

        void this.startListening();
    }

    /**
     * Start listening to the stream
     */
    async startListening(): Promise<void> {
        try {
            for await (const chunk of this.stream) {
                this.receive(chunk);
            }
        } catch (error) {
            console.error(`${this.playerName} stream error:`, error);
        }
    }

    /**
     * Receive a chunk of data from the stream
     * @param chunk - The data chunk
     */
    receive(chunk: string): void {
        if (this.debug) console.log(`${this.playerName} received:`, chunk);

        for (const line of chunk.split("\n")) {
            this.receiveLine(line);
        }
    }

    /**
     * Receive a line of data
     * @param line - The data line
     */
    receiveLine(line: string): void {
        if (this.debug) console.log(`${this.playerName} line:`, line);
        if (!line.startsWith("|")) return;

        const [cmd, rest] =
            line.slice(1).split("|", 1)[0] === ""
                ? ["", line.slice(1)]
                : [
                    line.slice(1).split("|", 1)[0],
                    line.slice(line.indexOf("|", 1) + 1),
                ];

        if (cmd === "request") {
            try {
                const request = JSON.parse(rest);
                this.receiveRequest(request);
            } catch (e) {
                console.error(`${this.playerName} error parsing request:`, e, rest);
            }
            return;
        }

        if (cmd === "error") {
            this.receiveError(new Error(rest));
            return;
        }

        this.log.push(line);
    }

    /**
     * Handle an error
     * @param error - The error
     */
    receiveError(error: Error): void {
        console.error(`${this.playerName} battle error:`, error);

        // If we made an unavailable choice we will receive a followup request to
        // allow us the opportunity to correct our decision.
        if (error.message.startsWith("[Unavailable choice]")) return;
    }

    /**
     * Handle a request
     * @param request - The request
     */
    receiveRequest(request: BattleRequest): void {
        this.currentRequest = request;
        if (this.debug)
            console.log(`${this.playerName} received request:`, request);
        this.onRequestReceived(request);
    }

    /**
     * Make a move
     * @param moveIndex - The move index (1-based)
     */
    makeMove(moveIndex: number): void {
        this.makeChoice(`move ${moveIndex}`);
    }

    /**
     * Make a choice
     * @param choice - The choice string
     */
    makeChoice(choice: string): void {
        console.log(`${this.playerName} making choice: ${choice}`);
        try {
            void this.stream.write(choice);
        } catch (error) {
            console.error(`${this.playerName} error making choice:`, error);
        }
    }
}

/**
 * Class for handling Pokémon battles
 */
export class BattleService {
    private battle: Battle;
    private streams: ReturnType<typeof BattleStreams.getPlayerStreams>;
    private p1: ManualPlayer;
    private p2: ManualPlayer;
    private formatter: LogFormatter;
    private prng: PRNG;
    private dex: ModdedDex;
    private gens: Generations;
    private format: string;
    private battleState: BattleState;
    private onBattleUpdate: (state: BattleState) => void;

    /**
     * Create a battle service
     * @param options - The battle options
     */
    constructor(options: BattleOptions) {
        this.format = options.format || "gen3randombattle";
        this.prng = new PRNG();
        this.dex = Dex.forFormat(this.format);
        // @ts-ignore
        this.gens = new Generations(Dex);
        this.onBattleUpdate = options.onBattleUpdate || (() => { });

        // Set up team generators
        DTeams.setGeneratorFactory(TeamGenerators);

        // Initialize battle state
        this.battleState = {
            turn: 0,
            p1: { active: null, team: [], request: null, selectedMove: null },
            p2: { active: null, team: [], request: null, selectedMove: null },
            weather: "none",
            status: "Initializing battle...",
            logs: [],
        };

        // Create battle streams
        this.streams = BattleStreams.getPlayerStreams(
            new BattleStreams.BattleStream(),
        );

        // Create battle instance
        this.battle = new Battle(this.gens);

        // Create formatter
        this.formatter = new LogFormatter("p1", this.battle);

        // Create players
        this.p1 = new ManualPlayer(
            this.streams.p1,
            true,
            options.p1Name || "Player 1",
            (request) => this.handlePlayerRequest("p1", request),
        );

        this.p2 = new ManualPlayer(
            this.streams.p2,
            true,
            options.p2Name || "Player 2",
            (request) => this.handlePlayerRequest("p2", request),
        );

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
                    const key = Protocol.key(args);

                    // Pre-processing
                    this.preProcess(key, args, kwArgs);

                    // Update battle state
                    this.battle.add(args, kwArgs);

                    // Post-processing
                    this.postProcess(key, args, kwArgs);

                    if (html) {
                        this.battleState.logs.push(html);
                    }
                }

                // Update battle
                this.battle.update();

                // Notify listeners
                this.onBattleUpdate({ ...this.battleState });
            }
        } catch (error) {
            console.error("Battle stream error:", error);
        }
    }

    /**
     * Pre-process battle events
     * @param key - The event key
     * @param args - The event arguments
     * @param kwArgs - The event keyword arguments
     */
    private preProcess(
        key: ArgName | undefined,
        args: ArgType,
        kwArgs: BattleArgsKWArgType,
    ): void {
        if (key === "|faint|") {
            const pokemonId = args[1] as string;
            this.handleFaint(pokemonId);
        }
    }

    /**
     * Post-process battle events
     * @param key - The event key
     * @param args - The event arguments
     * @param kwArgs - The event keyword arguments
     */
    private postProcess(
        key: ArgName | undefined,
        args: ArgType,
        kwArgs: BattleArgsKWArgType,
    ): void {
        if (key === "|teampreview|") {
            this.battleState.p1.team = [...this.battle.p1.team];
            this.battleState.p2.team = [...this.battle.p2.team];
            this.battleState.status = "Team preview";
        } else if (key === "|turn|") {
            this.battleState.turn = Number(args[1]);
            this.battleState.status = `Current Turn: ${this.battleState.turn}`;

            // Update active Pokémon
            this.battleState.p1.active = this.battle.p1.active[0] || null;
            this.battleState.p2.active = this.battle.p2.active[0] || null;
        } else if (key === "|-weather|") {
            const weather = args[1] as string;
            this.battleState.weather = weather;

            // Update status message based on weather
            let weatherText = "";
            switch (weather) {
                case "RainDance":
                    weatherText = "It's raining!";
                    break;
                case "Sandstorm":
                    weatherText = "A sandstorm is raging!";
                    break;
                case "SunnyDay":
                    weatherText = "The sunlight is strong!";
                    break;
                case "Hail":
                    weatherText = "It's hailing!";
                    break;
                case "none":
                    weatherText = "The weather cleared up!";
                    break;
                default:
                    weatherText = `Weather: ${weather}`;
            }
            this.battleState.status = weatherText;
        }
    }

    /**
     * Handle a fainted Pokémon
     * @param pokemonId - The Pokémon ID
     */
    private handleFaint(pokemonId: string): void {
        console.log(`${pokemonId} has fainted!`);

        // Determine the winner
        const winner = pokemonId.startsWith("p1") ? "p2" : "p1";
        const winnerName =
            winner === "p1" ? this.p1.playerName : this.p2.playerName;

        // Update battle status
        this.battleState.status = `${winnerName} has won the battle!`;
    }

    /**
     * Handle a player request
     * @param player - The player ID
     * @param request - The request
     */
    private handlePlayerRequest(
        player: "p1" | "p2",
        request: BattleRequest,
    ): void {
        // Store the request in battle state
        this.battleState[player].request = request;

        // Update active Pokémon if available
        if (request.active && request.side && request.side.pokemon) {
            const activePokemon = this.battle[player].active[0];
            if (activePokemon) {
                this.battleState[player].active = activePokemon;
            }
        }

        // Notify listeners
        this.onBattleUpdate({ ...this.battleState });
    }

    /**
     * Start the battle
     * @param p1Team - Optional team for player 1
     * @param p2Team - Optional team for player 2
     */
    startBattle(p1Team?: string, p2Team?: string): void {
        const spec = { formatid: this.format };
        const p1spec = {
            name: this.p1.playerName,
            team: p1Team ? DTeams.import(p1Team) : null,
        };
        const p2spec = {
            name: this.p2.playerName,
            team: p2Team ? DTeams.import(p2Team) : null,
        };

        // Start the battle
        void this.streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);
    }

    /**
     * Make a move for player 1
     * @param moveIndex - The move index (1-based)
     */
    makeP1Move(moveIndex: number): void {
        this.p1.makeMove(moveIndex);
    }

    /**
     * Make a move for player 2
     * @param moveIndex - The move index (1-based)
     */
    makeP2Move(moveIndex: number): void {
        this.p2.makeMove(moveIndex);
    }

    /**
     * Get the current battle state
     * @returns The battle state
     */
    getBattleState(): BattleState {
        return { ...this.battleState };
    }

    /**
     * Get move data for a Pokémon
     * @param moveId - The move ID
     * @returns The move data
     */
    getMoveData(moveId: string) {
        return this.dex.moves.get(moveId);
    }

    getItem(itemId: string) {
        return this.dex.items.get(itemId);
    }

    getAbility(abilityId: string) {
        return this.dex.abilities.get(abilityId);
    }
}
