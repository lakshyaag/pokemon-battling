import type { ObjectReadWriteStream } from "@pkmn/streams";
import type { PlayerRequest } from "./battle-types";
/**
 * Class representing a manual player in a Pokémon battle
 */
export class ManualPlayer {
    stream: ObjectReadWriteStream<string>;
    log: string[] = [];
    debug: boolean;
    playerName: string;
    onRequestReceived: (request: PlayerRequest) => void;

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
        onRequestReceived: (request: PlayerRequest) => void = () => { },
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
    receiveRequest(request: PlayerRequest): void {
        if (this.debug) console.log(`${this.playerName} received request:`, request);
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