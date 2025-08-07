import React from 'react';
import type { PokemonSet } from '@pkmn/sets';
import { PokemonCard } from './PokemonCard';

interface TeamDisplayProps {
  team: PokemonSet[];
  title?: string;
  className?: string;
}

export const TeamDisplay: React.FC<TeamDisplayProps> = ({ 
  team, 
  title = 'Your Team',
  className = '' 
}) => {
  if (!team || team.length === 0) {
    return (
      <div className={`team-display empty ${className}`}>
        <h2>{title}</h2>
        <p className="empty-message">No Pokemon in team</p>
      </div>
    );
  }

  return (
    <div className={`team-display ${className}`}>
      <h2>{title} ({team.length}/6)</h2>
      <div className="team-grid">
        {team.map((pokemon, index) => (
          <PokemonCard 
            key={index} 
            pokemon={pokemon}
            className="team-pokemon"
          />
        ))}
      </div>
    </div>
  );
};
