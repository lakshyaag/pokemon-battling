import React, { useState, useCallback } from 'react';
import type { PokemonSet, ServerMessage } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { GameLobby } from './components/GameLobby';
import './App.css';

// WebSocket URL - adjust for your environment
const WS_URL = import.meta.env.DEV 
  ? 'ws://localhost:8080/ws'
  : `ws://${window.location.host}/ws`;

export const App: React.FC = () => {
  const [team, setTeam] = useState<PokemonSet[]>([]);
  const [isInQueue, setIsInQueue] = useState(false);
  const [gameState, setGameState] = useState<'lobby' | 'in_game'>('lobby');
  const [messages, setMessages] = useState<string[]>([]);
  const [currentGame, setCurrentGame] = useState<any>(null);

  const handleMessage = useCallback((message: ServerMessage) => {
    console.log('Received message:', message);

    switch (message.type) {
      case 'connection_established':
        setMessages(prev => [...prev, `Connected as ${message.data?.playerName}`]);
        break;

      case 'team_generated':
        setTeam(message.data?.team || []);
        setMessages(prev => [...prev, 'Random team generated!']);
        break;

      case 'queue_joined':
        setIsInQueue(true);
        setMessages(prev => [...prev, message.data?.message || 'Joined queue']);
        break;

      case 'queue_left':
        setIsInQueue(false);
        setMessages(prev => [...prev, message.data?.message || 'Left queue']);
        break;

      case 'game_found':
        setIsInQueue(false);
        setGameState('in_game');
        setCurrentGame(message.data);
        setMessages(prev => [...prev, `Battle found! vs ${message.data?.opponent}`]);
        break;

      case 'opponent_disconnected':
        setGameState('lobby');
        setCurrentGame(null);
        setMessages(prev => [...prev, message.data?.message || 'Opponent disconnected']);
        break;

      case 'error':
        setMessages(prev => [...prev, `Error: ${message.data?.error}`]);
        break;

      default:
        setMessages(prev => [...prev, `Received: ${message.type}`]);
    }
  }, []);

  const { isConnected, sendMessage } = useWebSocket(WS_URL, {
    onMessage: handleMessage,
    onConnect: () => setMessages(prev => [...prev, 'Connected to server']),
    onDisconnect: () => {
      setMessages(prev => [...prev, 'Disconnected from server']);
      setIsInQueue(false);
      setGameState('lobby');
    },
    onError: (error) => setMessages(prev => [...prev, `Connection error: ${error}`])
  });

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <GameLobby
          team={team}
          isConnected={isConnected}
          isInQueue={isInQueue}
          onSendMessage={sendMessage}
        />
      ) : (
        <div className="battle-view">
          <h2>Battle in Progress</h2>
          <p>vs {currentGame?.opponent}</p>
          <p>Battle system coming soon...</p>
          <button 
            onClick={() => {
              setGameState('lobby');
              setCurrentGame(null);
            }}
            className="btn btn-secondary"
          >
            Return to Lobby (Forfeit)
          </button>
        </div>
      )}

      <div className="message-log">
        <h3>Messages</h3>
        <div className="messages">
          {messages.slice(-10).map((msg, index) => (
            <div key={index} className="message">
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
