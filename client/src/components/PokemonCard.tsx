import React from 'react';
import type { PokemonSet } from '@pkmn/sets';

interface PokemonCardProps {
  pokemon: PokemonSet;
  className?: string;
}

export const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, className = '' }) => {
  // Format the Pokemon name for display
  const displayName = pokemon.name || pokemon.species;
  
  // Get the sprite URL (simplified for now)
  const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${pokemon.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;

  return (
    <div className={`pokemon-card ${className}`}>
      <div className="pokemon-image">
        <img 
          src={spriteUrl} 
          alt={displayName}
          onError={(e) => {
            // Fallback to a placeholder if sprite fails to load
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNmMGYwZjAiLz4KPHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZDMzAuNjI3NCAzNiAzNiAzMC42Mjc0IDM2IDI0QzM2IDE3LjM3MjYgMzAuNjI3NCAxMiAyNCAxMloiIGZpbGw9IiNjY2MiLz4KPC9zdmc+Cjwvc3ZnPgo=';
          }}
        />
      </div>
      <div className="pokemon-info">
        <h3 className="pokemon-name">{displayName}</h3>
        <p className="pokemon-level">Level {pokemon.level || 50}</p>
        {pokemon.item && (
          <p className="pokemon-item">@ {pokemon.item}</p>
        )}
        <div className="pokemon-moves">
          {pokemon.moves.slice(0, 4).map((move, index) => (
            <span key={index} className="move-tag">
              {move}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
