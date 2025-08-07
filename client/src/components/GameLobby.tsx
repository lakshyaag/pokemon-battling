import React, { useState } from 'react';
import type { PokemonSet, ClientMessage } from '../types';
import { TeamDisplay } from './TeamDisplay';

interface GameLobbyProps {
  team: PokemonSet[];
  isConnected: boolean;
  isInQueue: boolean;
  onSendMessage: (message: ClientMessage) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  team,
  isConnected,
  isInQueue,
  onSendMessage
}) => {
  const [playerName, setPlayerName] = useState('');

  const handleGenerateTeam = () => {
    onSendMessage({
      type: 'create_random_team',
      data: { format: 'gen9randombattle' }
    });
  };

  const handleJoinQueue = () => {
    if (!team || team.length === 0) {
      alert('Please generate a team first!');
      return;
    }

    if (!playerName.trim()) {
      alert('Please enter your name!');
      return;
    }

    onSendMessage({
      type: 'join_queue',
      data: {
        playerName: playerName.trim(),
        team
      }
    });
  };

  const handleLeaveQueue = () => {
    onSendMessage({
      type: 'leave_queue'
    });
  };

  return (
    <div className="game-lobby">
      <div className="lobby-header">
        <h1>Pokemon Battle Simulator</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      <div className="lobby-content">
        <div className="team-section">
          <TeamDisplay team={team} />
          
          <div className="team-actions">
            <button 
              onClick={handleGenerateTeam}
              disabled={!isConnected}
              className="btn btn-primary"
            >
              Generate Random Team
            </button>
          </div>
        </div>

        <div className="battle-section">
          <div className="player-setup">
            <h3>Player Setup</h3>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="player-name-input"
              disabled={isInQueue || !isConnected}
            />
          </div>

          <div className="queue-actions">
            {!isInQueue ? (
              <button 
                onClick={handleJoinQueue}
                disabled={!isConnected || !team || team.length === 0 || !playerName.trim()}
                className="btn btn-success btn-large"
              >
                Find Battle
              </button>
            ) : (
              <div className="queue-status">
                <p className="queue-message">🔍 Looking for opponent...</p>
                <button 
                  onClick={handleLeaveQueue}
                  className="btn btn-secondary"
                >
                  Cancel Search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="instructions">
        <h3>How to Play</h3>
        <ol>
          <li>Click "Generate Random Team" to create a team of 6 random Pokemon</li>
          <li>Enter your player name</li>
          <li>Click "Find Battle" to join the matchmaking queue</li>
          <li>Wait to be matched with another player</li>
          <li>Battle begins automatically when both players are ready!</li>
        </ol>
      </div>
    </div>
  );
};
