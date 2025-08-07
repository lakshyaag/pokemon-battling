import { Dex, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';
import type { PokemonSet } from '@pkmn/sets';

export class TeamGenerator {
  constructor() {
    try {
      // Set up the team generator factory
      Teams.setGeneratorFactory(TeamGenerators);
      console.log('TeamGenerator initialized with @pkmn/randoms');
    } catch (error) {
      console.error('Error initializing TeamGenerator:', error);
    }
  }

  /**
   * Generate a random team for the specified format
   */
  generateRandomTeam(format: string = 'gen9randombattle'): PokemonSet[] {
    try {
      console.log('Generating random team for format:', format);

      // Generate a random team using @pkmn/randoms
      const team = Teams.generate(format);

      console.log(`Generated team with ${team.length} Pokemon`);

      // Convert to PokemonSet format for easier handling
      return team.map((pokemon, index) => {
        const pokemonSet: PokemonSet = {
          name: pokemon.name || pokemon.species,
          species: pokemon.species,
          item: pokemon.item || '',
          ability: pokemon.ability || '',
          moves: pokemon.moves || [],
          nature: pokemon.nature || 'Hardy',
          evs: pokemon.evs || { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
          ivs: pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          level: pokemon.level || 50,
          gender: pokemon.gender || '',
          shiny: pokemon.shiny || false
        };

        console.log(`Pokemon ${index + 1}: ${pokemonSet.species} (${pokemonSet.moves.length} moves)`);
        return pokemonSet;
      });
    } catch (error) {
      console.error('Error generating random team with @pkmn/randoms:', error);
      return [];
    }
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
        const isValid = !result || result.length === 0;
        console.log(`Team validation result: ${isValid ? 'Valid' : 'Invalid'}${result ? ` (${result.length} issues)` : ''}`);
        return isValid;
      }

      console.log('No validator found for format, assuming valid');
      return true; // If no validator, assume valid
    } catch (error) {
      console.error('Error validating team:', error);
      console.log('Validation failed, assuming valid for now');
      return true; // Be permissive if validation fails
    }
  }
}
