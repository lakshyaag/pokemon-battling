import React, { useState, useEffect } from 'react';
import type { ClientMessage } from '../types';
import { useBattle, useBattleSelectors } from '../contexts/BattleContext';

interface BattleInterfaceProps {
  onSendMessage: (message: ClientMessage) => void;
  onReturnToLobby: () => void;
}

export const BattleInterface: React.FC<BattleInterfaceProps> = ({
  onSendMessage,
  onReturnToLobby
}) => {
  const { state } = useBattle();
  const {
    isInBattle,
    yourActivePokemon,
    opponentActivePokemon,
    yourTeam,
    canMakeMove,
    turn,
    lastAction,
    weather,
    opponent,
    roomId
  } = useBattleSelectors();

  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<number | null>(null);
  const [currentPokemon, setCurrentPokemon] = useState(0);
  const [waitingForMove, setWaitingForMove] = useState(false);

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('BattleInterface error:', event.error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('BattleInterface Context Data:', {
      isInBattle,
      yourActivePokemon,
      opponentActivePokemon,
      yourTeam,
      turn,
      lastAction,
      opponent
    });
  }, [isInBattle, yourActivePokemon, opponentActivePokemon, yourTeam, turn, lastAction, opponent]);

  // Early return if no battle data
  if (!isInBattle) {
    return <div className="battle-interface">Loading battle...</div>;
  }

  // Early return if no team data
  if (!yourTeam || yourTeam.length === 0) {
    return <div className="battle-interface">Loading team data...</div>;
  }

  // Get current pokemon with moves
  const activePokemon = yourActivePokemon || yourTeam[currentPokemon];
  const activePokemonWithMoves = {
    ...activePokemon,
    moves: yourTeam[currentPokemon]?.moves || activePokemon?.moves || []
  };

  const handleMoveSelect = (moveIndex: number) => {
    if (waitingForMove) return;
    
    setWaitingForMove(true);
    onSendMessage({
      type: 'battle_move',
      data: { moveSlot: moveIndex + 1 } // Pokemon Showdown uses 1-based indexing
    });
    
    setSelectedMove(null);
    
    // Reset waiting state after a delay
    setTimeout(() => setWaitingForMove(false), 2000);
  };

  const handlePokemonSwitch = (pokemonIndex: number) => {
    if (waitingForMove || pokemonIndex === currentPokemon) return;
    
    setWaitingForMove(true);
    onSendMessage({
      type: 'battle_switch',
      data: { pokemonSlot: pokemonIndex + 1 } // Pokemon Showdown uses 1-based indexing
    });
    
    setSelectedPokemon(null);
    setCurrentPokemon(pokemonIndex);
    
    // Reset waiting state after a delay
    setTimeout(() => setWaitingForMove(false), 2000);
  };

  // Try-catch for render safety
  try {
    return (
      <div className="battle-interface">
      <div className="battle-header">
        <h2>Battle vs {opponent}</h2>
        <button onClick={onReturnToLobby} className="btn btn-secondary">
          Forfeit & Return to Lobby
        </button>
      </div>

      <div className="battle-field">
        <div className="opponent-pokemon">
          <div className="pokemon-display">
            <h3>{opponent}'s Pokemon</h3>
            {opponentActivePokemon ? (
              <>
                <div className="pokemon-sprite">
                  <img 
                    src={`https://play.pokemonshowdown.com/sprites/gen5/${opponentActivePokemon.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                    alt={opponentActivePokemon.species}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNmMGYwZjAiLz4KPHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZDMzAuNjI3NCAzNiAzNiAzMC42Mjc0IDM2IDI0QzM2IDE3LjM3MjYgMzAuNjI3NCAxMiAyNCAxMloiIGZpbGw9IiNjY2MiLz4KPC9zdmc+Cjwvc3ZnPgo=';
                    }}
                  />
                </div>
                <div className="pokemon-info">
                  <p className="pokemon-name-display">{opponentActivePokemon.name || opponentActivePokemon.species}</p>
                  <p>Level {opponentActivePokemon.level}</p>
                  {opponentActivePokemon.status && (
                    <p className="status-effect">{opponentActivePokemon.status.toUpperCase()}</p>
                  )}
                </div>
                <div className="hp-bar-container">
                  <div className="hp-text">
                    HP: {opponentActivePokemon.hp}/{opponentActivePokemon.maxhp} ({opponentActivePokemon.hpPercentage}%)
                  </div>
                  <div className="hp-bar">
                    <div 
                      className="hp-fill" 
                      style={{ 
                        width: `${opponentActivePokemon.hpPercentage}%`,
                        backgroundColor: opponentActivePokemon.hpPercentage > 50 ? '#4ade80' : 
                                       opponentActivePokemon.hpPercentage > 25 ? '#fbbf24' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="pokemon-sprite">?</div>
            )}
          </div>
        </div>

        <div className="battle-info">
          {turn > 0 && <p className="turn-counter">Turn {turn}</p>}
          {weather && <p className="weather">Weather: {weather}</p>}
          {lastAction && <p className="last-action">{lastAction}</p>}
        </div>

        <div className="player-pokemon">
          <div className="pokemon-display">
            <h3>Your Pokemon</h3>
            <div className="pokemon-sprite">
              <img 
                src={`https://play.pokemonshowdown.com/sprites/gen5/${activePokemonWithMoves.species?.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`}
                alt={activePokemonWithMoves.species}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNmMGYwZjAiLz4KPHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZDMzAuNjI3NCAzNiAzNiAzMC42Mjc0IDM2IDI0QzM2IDE3LjM3MjYgMzAuNjI3NCAxMiAyNCAxMloiIGZpbGw9IiNjY2MiLz4KPC9zdmc+Cjwvc3ZnPgo=';
                }}
              />
            </div>
            <div className="pokemon-info">
              <p className="pokemon-name-display">{activePokemonWithMoves.name || activePokemonWithMoves.species}</p>
              <p>Level {activePokemonWithMoves.level}</p>
              {activePokemonWithMoves.item && <p>@ {activePokemonWithMoves.item}</p>}
              {yourActivePokemon?.status && (
                <p className="status-effect">{yourActivePokemon.status.toUpperCase()}</p>
              )}
            </div>
            {yourActivePokemon && (
              <div className="hp-bar-container">
                <div className="hp-text">
                  HP: {yourActivePokemon.hp}/{yourActivePokemon.maxhp} ({yourActivePokemon.hpPercentage}%)
                </div>
                <div className="hp-bar">
                  <div 
                    className="hp-fill" 
                    style={{ 
                      width: `${yourActivePokemon.hpPercentage}%`,
                      backgroundColor: yourActivePokemon.hpPercentage > 50 ? '#4ade80' : 
                                     yourActivePokemon.hpPercentage > 25 ? '#fbbf24' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="battle-controls">
        <div className="moves-section">
          <h3>Moves</h3>
          <div className="moves-grid">
            {activePokemonWithMoves?.moves?.slice(0, 4).map((move, index) => (
              <button
                key={index}
                onClick={() => handleMoveSelect(index)}
                disabled={waitingForMove || !canMakeMove}
                className={`move-button ${selectedMove === index ? 'selected' : ''}`}
              >
                {move}
              </button>
            )) || (
              <div className="loading-moves">Loading moves...</div>
            )}
          </div>
        </div>

        <div className="pokemon-section">
          <h3>Switch Pokemon</h3>
          <div className="pokemon-grid">
            {yourTeam?.map((pokemon, index) => (
              <button
                key={index}
                onClick={() => handlePokemonSwitch(index)}
                disabled={waitingForMove || !canMakeMove || index === currentPokemon}
                className={`pokemon-button ${index === currentPokemon ? 'active' : ''} ${selectedPokemon === index ? 'selected' : ''}`}
              >
                <div className="pokemon-mini">
                  <span className="pokemon-name">{pokemon.species}</span>
                  <span className="pokemon-level">Lv.{pokemon.level}</span>
                </div>
              </button>
            )) || (
              <div className="loading-pokemon">Loading team...</div>
            )}
          </div>
        </div>
      </div>

      <div className="battle-log">
        <h3>Battle Log</h3>
        <div className="log-messages">
          {state.battleUpdates.slice(-10).map((update, index) => (
            <div key={index} className="log-message">
              {update}
            </div>
          ))}
        </div>
      </div>

      {waitingForMove && (
        <div className="waiting-overlay">
          <p>Waiting for move to process...</p>
        </div>
      )}
      </div>
    );
  } catch (error) {
    console.error('BattleInterface render error:', error);
    return (
      <div className="battle-interface">
        <div className="battle-header">
          <h2>Battle Error</h2>
          <button onClick={onReturnToLobby} className="btn btn-secondary">
            Return to Lobby
          </button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>An error occurred while loading the battle interface.</p>
          <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
};
