import { Dex, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';
import type { PokemonSet } from '@pkmn/sets';

export class TeamGenerator {
  constructor() {
    // Set up the team generator factory
    Teams.setGeneratorFactory(TeamGenerators);
  }

  /**
   * Generate a random team for the specified format
   */
  generateRandomTeam(format: string = 'gen9randombattle'): PokemonSet[] {
    try {
      // Generate a random team using @pkmn/randoms
      const team = Teams.generate(format);
      
      // Convert to PokemonSet format for easier handling
      return team.map(pokemon => ({
        name: pokemon.name,
        species: pokemon.species,
        item: pokemon.item || '',
        ability: pokemon.ability || '',
        moves: pokemon.moves || [],
        nature: pokemon.nature || 'Hardy',
        evs: pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        level: pokemon.level || 50,
        gender: pokemon.gender || '',
        shiny: pokemon.shiny || false
      }));
    } catch (error) {
      console.error('Error generating random team:', error);
      // Fallback to a basic team if generation fails
      return this.generateFallbackTeam();
    }
  }

  /**
   * Generate a fallback team with basic Pokemon
   */
  private generateFallbackTeam(): PokemonSet[] {
    const basicPokemon = [
      'Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Mewtwo', 'Mew'
    ];

    return basicPokemon.map(species => ({
      name: species,
      species,
      item: 'Leftovers',
      ability: '',
      moves: ['Tackle', 'Thunder Shock', 'Quick Attack', 'Tail Whip'],
      nature: 'Hardy',
      evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      level: 50,
      gender: '',
      shiny: false
    }));
  }

  /**
   * Validate that a team is legal for battle
   */
  validateTeam(team: PokemonSet[], format: string = 'gen9randombattle'): boolean {
    try {
      // Pack the team for validation
      const packedTeam = Teams.pack(team);
      
      // Use the validator to check if team is legal
      const dex = Dex.forFormat(format);
      const validator = dex.formats.get(format)?.validateTeam;
      
      if (validator) {
        const result = validator.call(dex, packedTeam);
        return !result || result.length === 0;
      }
      
      return true; // If no validator, assume valid
    } catch (error) {
      console.error('Error validating team:', error);
      return false;
    }
  }
}
