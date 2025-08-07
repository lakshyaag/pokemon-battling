/**
 * Parser for Pokemon Showdown protocol messages
 * Extracts battle state information from raw protocol strings
 */

export interface ParsedBattleState {
    turn: number;
    weather?: string;
    players: {
        p1: ParsedPlayerState;
        p2: ParsedPlayerState;
    };
    lastAction?: string;
    lastActionSide?: 'p1' | 'p2'; // Track which side performed the last action
    winner?: string;
    ended?: boolean;
    currentRequest?: any; // Store current battle request data
}

export interface ParsedPlayerState {
    name: string;
    activePokemon?: ParsedPokemonState;
    team: ParsedPokemonState[];
}

export interface ParsedPokemonState {
    name: string;
    species: string;
    level: number;
    hp: number;
    maxhp: number;
    hpPercentage: number;
    status?: string;
    gender?: string;
    shiny?: boolean;
    position: string; // e.g., "p1a", "p2a"
}

export class BattleStateParser {
    private state: ParsedBattleState;

    constructor() {
        this.state = {
            turn: 0,
            players: {
                p1: { name: '', team: [] },
                p2: { name: '', team: [] }
            }
        };
    }

    /**
     * Parse a batch of protocol messages and update battle state
     */
    parseUpdate(update: string): ParsedBattleState {
        const lines = update.split('\n').filter(line => line.trim());

        for (const line of lines) {
            this.parseLine(line);
        }

        return { ...this.state };
    }

    /**
     * Parse a single protocol line
     */
    private parseLine(line: string): void {
        if (!line.startsWith('|') || line.trim() === '') return;

        const parts = line.split('|').slice(1); // Remove empty first element
        const command = parts[0];

        switch (command) {
            case 'player':
                this.parsePlayer(parts);
                break;
            case 'teamsize':
                this.parseTeamSize(parts);
                break;
            case 'start':
                this.parseStart();
                break;
            case 'turn':
                this.parseTurn(parts);
                break;
            case 'switch':
                this.parseSwitch(parts);
                break;
            case 'move':
                this.parseMove(parts);
                break;
            case '-damage':
                this.parseDamage(parts);
                break;
            case '-heal':
                this.parseHeal(parts);
                break;
            case '-status':
                this.parseStatus(parts);
                break;
            case '-curestatus':
                this.parseCureStatus(parts);
                break;
            case '-ability':
                this.parseAbility(parts);
                break;
            case '-boost':
            case '-unboost':
                this.parseStatChange(parts);
                break;
            case 'faint':
                this.parseFaint(parts);
                break;
            case 'win':
                this.parseWin(parts);
                break;
            case 'tie':
                this.parseTie();
                break;
            case 'weather':
                this.parseWeather(parts);
                break;
            case 'poke':
                this.parsePoke(parts);
                break;
            case 'teampreview':
                this.parseTeamPreview();
                break;
            case 'request':
                this.parseRequest(parts);
                break;
            case 'gen':
            case 'tier':
            case 'gametype':
            case 'clearpoke':
            case 't:':
            case 'start':
            case '':
                // Ignore these setup commands and empty lines
                break;
            default:
                // Log unknown commands for debugging
                console.log('Unknown battle command:', command, parts);
        }
    }

    private parsePlayer(parts: string[]): void {
        // |player|p1|PlayerName|avatar
        const side = parts[1] as 'p1' | 'p2';
        const name = parts[2];

        if (this.state.players[side]) {
            this.state.players[side].name = name;
        }
    }

    private parseTeamSize(parts: string[]): void {
        // |teamsize|p1|6
        const side = parts[1] as 'p1' | 'p2';
        const size = parseInt(parts[2]);

        // Initialize team array
        this.state.players[side].team = Array(size).fill(null).map(() => ({
            name: '',
            species: '',
            level: 50,
            hp: 100,
            maxhp: 100,
            hpPercentage: 100,
            position: ''
        }));
    }

    private parseStart(): void {
        this.state.turn = 0;
    }

    private parseTurn(parts: string[]): void {
        // |turn|2
        this.state.turn = parseInt(parts[1]);
    }

    private parseSwitch(parts: string[]): void {
        // |switch|p1a: Charizard|Charizard, L50, M|100/100
        const position = parts[1].split(':')[0]; // "p1a"
        const side = position.startsWith('p1') ? 'p1' : 'p2';
        const pokemonInfo = parts[2];
        const hpInfo = parts[3];

        const pokemon = this.parsePokemonInfo(pokemonInfo, position);
        if (hpInfo) {
            this.parseHPInfo(pokemon, hpInfo);
        } else {
            // Default to full HP if not specified
            pokemon.hp = pokemon.maxhp;
            pokemon.hpPercentage = 100;
        }

        // Update active pokemon
        this.state.players[side].activePokemon = pokemon;

        // Update in team array if we can find the slot
        const slotIndex = this.findPokemonSlot(side, pokemon.species);
        if (slotIndex >= 0) {
            this.state.players[side].team[slotIndex] = { ...this.state.players[side].team[slotIndex], ...pokemon };
        }

        const pokemonName = pokemon.name || pokemon.species;
        this.state.lastAction = `${pokemonName} switched in!`;
        this.state.lastActionSide = side; // Track which side the action came from

        console.log(`Pokemon switched: ${side} - ${pokemonName} (${pokemon.hp}/${pokemon.maxhp})`);
    }

    private parseMove(parts: string[]): void {
        // |move|p1a: Charizard|Flamethrower|p2a: Blastoise
        const attacker = parts[1];
        const moveName = parts[2];
        const target = parts[3];

        const side = attacker.startsWith('p1') ? 'p1' : 'p2';
        this.state.lastAction = `${attacker.split(':')[1]?.trim()} used ${moveName}!`;
        this.state.lastActionSide = side;
    }

    private parseDamage(parts: string[]): void {
        // |-damage|p2a: Blastoise|85/100
        const pokemonPos = parts[1];
        const hpInfo = parts[2];
        const side = pokemonPos.startsWith('p1') ? 'p1' : 'p2';

        if (this.state.players[side].activePokemon?.position === pokemonPos.split(':')[0]) {
            this.parseHPInfo(this.state.players[side].activePokemon!, hpInfo);
        }

        const pokemonName = pokemonPos.split(':')[1]?.trim();
        this.state.lastAction = `${pokemonName} took damage!`;
        this.state.lastActionSide = side;
    }

    private parseHeal(parts: string[]): void {
        // |-heal|p1a: Charizard|90/100
        const pokemonPos = parts[1];
        const hpInfo = parts[2];
        const side = pokemonPos.startsWith('p1') ? 'p1' : 'p2';

        if (this.state.players[side].activePokemon?.position === pokemonPos.split(':')[0]) {
            this.parseHPInfo(this.state.players[side].activePokemon!, hpInfo);
        }

        const pokemonName = pokemonPos.split(':')[1]?.trim();
        this.state.lastAction = `${pokemonName} was healed!`;
    }

    private parseStatus(parts: string[]): void {
        // |-status|p1a: Charizard|burn
        const pokemonPos = parts[1];
        const status = parts[2];
        const side = pokemonPos.startsWith('p1') ? 'p1' : 'p2';

        if (this.state.players[side].activePokemon?.position === pokemonPos.split(':')[0]) {
            this.state.players[side].activePokemon!.status = status;
        }

        const pokemonName = pokemonPos.split(':')[1]?.trim();
        this.state.lastAction = `${pokemonName} was ${status}ed!`;
    }

    private parseCureStatus(parts: string[]): void {
        // |-curestatus|p1a: Charizard|burn
        const pokemonPos = parts[1];
        const side = pokemonPos.startsWith('p1') ? 'p1' : 'p2';

        if (this.state.players[side].activePokemon?.position === pokemonPos.split(':')[0]) {
            this.state.players[side].activePokemon!.status = undefined;
        }

        const pokemonName = pokemonPos.split(':')[1]?.trim();
        this.state.lastAction = `${pokemonName} was cured of its status!`;
    }

    private parseFaint(parts: string[]): void {
        // |faint|p2a: Blastoise
        const pokemonPos = parts[1];
        const side = pokemonPos.startsWith('p1') ? 'p1' : 'p2';

        if (this.state.players[side].activePokemon?.position === pokemonPos.split(':')[0]) {
            this.state.players[side].activePokemon!.hp = 0;
            this.state.players[side].activePokemon!.hpPercentage = 0;
        }

        const pokemonName = pokemonPos.split(':')[1]?.trim();
        this.state.lastAction = `${pokemonName} fainted!`;
    }

    private parseWin(parts: string[]): void {
        // |win|PlayerName
        this.state.winner = parts[1];
        this.state.ended = true;
        this.state.lastAction = `${parts[1]} wins!`;
    }

    private parseTie(): void {
        this.state.ended = true;
        this.state.lastAction = 'The battle ended in a tie!';
    }

    private parseWeather(parts: string[]): void {
        // |weather|RainDance
        this.state.weather = parts[1];
    }

    private parsePoke(parts: string[]): void {
        // |poke|p1|Noctowl, L95, M|
        const side = parts[1] as 'p1' | 'p2';
        const pokemonInfo = parts[2];

        if (!pokemonInfo) return;

        const pokemon = this.parsePokemonInfo(pokemonInfo, `${side}a`);

        // Add to team if not already there
        if (this.state.players[side].team.length === 0) {
            this.state.players[side].team = [];
        }

        this.state.players[side].team.push(pokemon);
    }

    private parseTeamPreview(): void {
        this.state.lastAction = 'Team preview - choose your lead Pokemon!';
    }

    private parseRequest(parts: string[]): void {
        // |request|{"active":[...],"side":...} - battle requests for moves
        if (parts.length > 1) {
            try {
                const requestData = JSON.parse(parts[1]);
                console.log('Battle request received:', requestData);

                // Check if we have active Pokemon that need to make choices
                if (requestData.active && requestData.active.length > 0) {
                    this.state.lastAction = 'Choose your move!';

                    // Store request data for debugging
                    if (!this.state.currentRequest) {
                        this.state.currentRequest = requestData;
                    }
                } else if (requestData.side) {
                    // Team preview or similar
                    this.state.lastAction = 'Choose your team order!';
                }
            } catch (error) {
                console.error('Error parsing request:', error);
                this.state.lastAction = 'Battle request received';
            }
        }
    }

    private parseAbility(parts: string[]): void {
        // |-ability|p2a: Wyrdeer|Intimidate|boost
        const pokemonPos = parts[1];
        const abilityName = parts[2];
        const pokemonName = pokemonPos.split(':')[1]?.trim();

        this.state.lastAction = `${pokemonName}'s ${abilityName} activated!`;
    }

    private parseStatChange(parts: string[]): void {
        // |-unboost|p1a: Giratina|atk|1 or |-boost|p1a: Pokemon|def|2
        const pokemonPos = parts[1];
        const stat = parts[2];
        const amount = parts[3];
        const pokemonName = pokemonPos.split(':')[1]?.trim();
        const isBoost = parts[0] === '-boost';

        const statNames: { [key: string]: string } = {
            'atk': 'Attack',
            'def': 'Defense',
            'spa': 'Special Attack',
            'spd': 'Special Defense',
            'spe': 'Speed'
        };

        const statName = statNames[stat] || stat;
        const direction = isBoost ? 'rose' : 'fell';

        this.state.lastAction = `${pokemonName}'s ${statName} ${direction}!`;
    }

    private parsePokemonInfo(pokemonInfo: string, position: string): ParsedPokemonState {
        // "Charizard, L50, M" or "Charizard-Mega-X, L50, F"
        const parts = pokemonInfo.split(', ');
        const species = parts[0];
        const level = parts[1] ? parseInt(parts[1].substring(1)) : 50; // Remove 'L' prefix
        const gender = parts[2];

        return {
            name: species,
            species: species,
            level: level,
            hp: 100,
            maxhp: 100,
            hpPercentage: 100,
            gender: gender,
            position: position
        };
    }

    private parseHPInfo(pokemon: ParsedPokemonState, hpInfo: string): void {
        // "85/100" or "85/100 slp" (with status)
        const parts = hpInfo.split(' ');
        const hpPart = parts[0];
        const status = parts[1];

        if (hpPart.includes('/')) {
            const [current, max] = hpPart.split('/').map(x => parseInt(x));
            pokemon.hp = current;
            pokemon.maxhp = max;
            pokemon.hpPercentage = Math.round((current / max) * 100);
        } else if (hpPart === '0') {
            // Fainted Pokemon
            pokemon.hp = 0;
            pokemon.hpPercentage = 0;
        }

        if (status) {
            pokemon.status = status;
        }
    }

    private findPokemonSlot(side: 'p1' | 'p2', species: string): number {
        return this.state.players[side].team.findIndex(p => p.species === species);
    }

    /**
     * Get current battle state
     */
    getState(): ParsedBattleState {
        return { ...this.state };
    }

    /**
     * Reset battle state
     */
    reset(): void {
        this.state = {
            turn: 0,
            players: {
                p1: { name: '', team: [] },
                p2: { name: '', team: [] }
            }
        };
    }
}
