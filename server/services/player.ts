import type { ObjectReadWriteStream } from "@pkmn/streams";
import type { PlayerRequest } from "./battle-types";
/**
 * Class representing a manual player in a Pokémon battle
 */
export class ManualPlayer {
	stream: ObjectReadWriteStream<string>;
	debug: boolean;
	playerName: string;
	onRequestReceived: (request: PlayerRequest) => void;
	onProtocolLine: (lines: string[]) => void;

	/**
	 * Create a manual player
	 * @param playerStream - The player's stream
	 * @param debug - Whether to enable debug logging
	 * @param playerName - The player's name
	 * @param onRequestReceived - Callback for when a request is received
	 * @param onProtocolLine - Callback for protocol lines
	 */
	constructor(
		playerStream: ObjectReadWriteStream<string>,
		debug = false,
		playerName = "Unknown",
		onRequestReceived: (request: PlayerRequest) => void = () => {},
		onProtocolLine: (lines: string[]) => void = () => {},
	) {
		this.stream = playerStream;
		this.debug = debug;
		this.playerName = playerName;
		this.onRequestReceived = onRequestReceived;
		this.onProtocolLine = onProtocolLine;

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
			// Emit an error line if the stream fails
			this.onProtocolLine([
				`|error|[StreamError] Player stream failed: ${error instanceof Error ? error.message : String(error)}`,
			]);
		}
	}

	/**
	 * Receive a chunk of data from the stream
	 * @param chunk - The data chunk
	 */
	receive(chunk: string): void {
		if (this.debug) console.log(`${this.playerName} received:`, chunk);
		const playerSpecificLines: string[] = [];

		for (const line of chunk.split("\n")) {
			if (!line) continue;

			if (line.startsWith("|request|")) {
				playerSpecificLines.push(line);
				try {
					const requestJson = line.substring(9);
					const request = JSON.parse(requestJson);
					this.receiveRequest(request);
				} catch (e) {
					console.error(`${this.playerName} error parsing request JSON:`, e, line);
					if (!playerSpecificLines.includes(line)) playerSpecificLines.push(line);
				}
			} else if (line.startsWith("|error|")) {
				const errorMsg = line.substring(7);
				if (errorMsg.startsWith("[Unavailable choice]") || errorMsg.startsWith("[Invalid choice]")) {
					playerSpecificLines.push(line);
				}
				this.receiveError(new Error(errorMsg));
			}
		}

		if (playerSpecificLines.length > 0) {
			this.onProtocolLine(playerSpecificLines);
		}
	}

	/**
	 * Handle an error
	 * @param error - The error
	 */
	receiveError(error: Error): void {
		console.error(`${this.playerName} received error line:`, error.message);
	}

	/**
	 * Handle a request
	 * @param request - The request object
	 */
	receiveRequest(request: PlayerRequest): void {
		if (this.debug) console.log(`${this.playerName} parsed request:`, request);
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
		if (this.debug) console.log(`${this.playerName} making choice: ${choice}`);
		try {
			void this.stream.write(choice);
		} catch (error) {
			console.error(`${this.playerName} error making choice:`, error);
			// Error will be emitted back through the stream if it fails
		}
	}
}
