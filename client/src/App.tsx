import React, { useState, useCallback } from 'react';
import type { PokemonSet, ServerMessage } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { GameLobby } from './components/GameLobby';
import { BattleInterface } from './components/BattleInterface';
import { BattleProvider, useBattle } from './contexts/BattleContext';
import './App.css';

// WebSocket URL - adjust for your environment
const WS_URL = import.meta.env.DEV 
  ? 'ws://localhost:8080/ws'
  : `ws://${window.location.host}/ws`;

const AppContent: React.FC = () => {
  const [team, setTeam] = useState<PokemonSet[]>([]);
  const [isInQueue, setIsInQueue] = useState(false);
  const [gameState, setGameState] = useState<'lobby' | 'in_game'>('lobby');
  const [messages, setMessages] = useState<string[]>([]);
  const { dispatch } = useBattle();

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
        console.log('Game found data:', message.data);
        setIsInQueue(false);
        setGameState('in_game');
        dispatch({ type: 'SET_GAME_DATA', payload: message.data });
        setMessages(prev => [...prev, `Battle found! vs ${message.data?.opponent}`]);
        break;

      case 'battle_update':
        console.log('Received battle_update:', message.data);
        if (message.data?.lines) {
          dispatch({ type: 'ADD_BATTLE_UPDATES', payload: message.data.lines });
        }
        if (message.data?.battleState) {
          console.log('Setting battle state:', message.data.battleState);
          dispatch({ type: 'SET_BATTLE_STATE', payload: message.data.battleState });
        }
        if (message.data?.yourSide) {
          console.log('Setting player side:', message.data.yourSide);
          dispatch({ type: 'SET_PLAYER_SIDE', payload: message.data.yourSide });
        }
        break;

      case 'opponent_disconnected':
        setGameState('lobby');
        dispatch({ type: 'RESET_BATTLE' });
        setMessages(prev => [...prev, message.data?.message || 'Opponent disconnected']);
        break;

      case 'battle_ended':
        setGameState('lobby');
        dispatch({ type: 'RESET_BATTLE' });
        setMessages(prev => [...prev, message.data?.message || 'Battle ended']);
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
      dispatch({ type: 'RESET_BATTLE' });
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
        <BattleInterface
          onSendMessage={sendMessage}
          onReturnToLobby={() => {
            setGameState('lobby');
            dispatch({ type: 'RESET_BATTLE' });
          }}
        />
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

export const App: React.FC = () => {
  return (
    <BattleProvider>
      <AppContent />
    </BattleProvider>
  );
};
