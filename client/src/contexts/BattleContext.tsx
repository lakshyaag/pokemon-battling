import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { PokemonSet } from '../types';

// Battle State Types
export interface BattlePokemon {
  name: string;
  species: string;
  level: number;
  hp: number;
  maxhp: number;
  hpPercentage: number;
  status?: string;
  position: string;
  moves?: string[];
  item?: string;
  ability?: string;
  nature?: string;
}

export interface BattlePlayer {
  name: string;
  team: BattlePokemon[];
  activePokemon?: BattlePokemon;
}

export interface BattleState {
  turn: number;
  weather?: string;
  players: {
    p1: BattlePlayer;
    p2: BattlePlayer;
  };
  lastAction?: string;
  winner?: string;
  ended?: boolean;
}

export interface GameData {
  roomId: string;
  opponent: string;
  yourTeam: PokemonSet[];
}

export interface BattleContextState {
  gameData: GameData | null;
  battleState: BattleState | null;
  playerSide: 'p1' | 'p2';
  battleUpdates: string[];
  isLoading: boolean;
  error: string | null;
}

// Actions
type BattleAction =
  | { type: 'SET_GAME_DATA'; payload: GameData }
  | { type: 'SET_BATTLE_STATE'; payload: BattleState }
  | { type: 'SET_PLAYER_SIDE'; payload: 'p1' | 'p2' }
  | { type: 'ADD_BATTLE_UPDATES'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_BATTLE' }
  | { type: 'UPDATE_ACTIVE_POKEMON'; payload: { side: 'p1' | 'p2'; pokemon: BattlePokemon } }
  | { type: 'SET_LAST_ACTION'; payload: { action: string; perspective: 'p1' | 'p2' } };

// Reducer
const battleReducer = (state: BattleContextState, action: BattleAction): BattleContextState => {
  switch (action.type) {
    case 'SET_GAME_DATA':
      return { ...state, gameData: action.payload, isLoading: false };
    
    case 'SET_BATTLE_STATE':
      // Merge team data from gameData with battle state
      const enhancedBattleState = enhanceBattleState(action.payload, state.gameData);
      return { ...state, battleState: enhancedBattleState };
    
    case 'SET_PLAYER_SIDE':
      return { ...state, playerSide: action.payload };
    
    case 'ADD_BATTLE_UPDATES':
      return { 
        ...state, 
        battleUpdates: [...state.battleUpdates, ...action.payload] 
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'RESET_BATTLE':
      return {
        gameData: null,
        battleState: null,
        playerSide: 'p1',
        battleUpdates: [],
        isLoading: false,
        error: null
      };
    
    case 'UPDATE_ACTIVE_POKEMON':
      if (!state.battleState) return state;
      return {
        ...state,
        battleState: {
          ...state.battleState,
          players: {
            ...state.battleState.players,
            [action.payload.side]: {
              ...state.battleState.players[action.payload.side],
              activePokemon: action.payload.pokemon
            }
          }
        }
      };
    
    case 'SET_LAST_ACTION':
      if (!state.battleState) return state;
      
      // Create user-specific message
      const userSpecificAction = createUserSpecificMessage(
        action.payload.action, 
        action.payload.perspective, 
        state.playerSide
      );
      
      return {
        ...state,
        battleState: {
          ...state.battleState,
          lastAction: userSpecificAction
        }
      };
    
    default:
      return state;
  }
};

// Helper function to enhance battle state with team data
const enhanceBattleState = (battleState: BattleState, gameData: GameData | null): BattleState => {
  if (!gameData) return battleState;

  // Enhanced battle state with move data from gameData
  const enhanced = { ...battleState };
  
  // Add moves to active Pokemon
  if (enhanced.players.p1.activePokemon && gameData.yourTeam) {
    const matchingPokemon = gameData.yourTeam.find(p => 
      p.species === enhanced.players.p1.activePokemon?.species
    );
    if (matchingPokemon) {
      enhanced.players.p1.activePokemon = {
        ...enhanced.players.p1.activePokemon,
        moves: matchingPokemon.moves,
        item: matchingPokemon.item,
        ability: matchingPokemon.ability,
        nature: matchingPokemon.nature
      };
    }
  }

  return enhanced;
};

// Helper function to create user-specific messages
const createUserSpecificMessage = (action: string, perspective: 'p1' | 'p2', userSide: 'p1' | 'p2'): string => {
  if (action.includes('switched in!')) {
    const pokemonName = action.split(' ')[0];
    if (perspective === userSide) {
      return `Your ${pokemonName} switched in!`;
    } else {
      return `Opponent's ${pokemonName} switched in!`;
    }
  }

  if (action.includes('used ')) {
    const parts = action.split(' used ');
    const pokemonName = parts[0];
    const moveName = parts[1]?.replace('!', '');
    
    if (perspective === userSide) {
      return `Your ${pokemonName} used ${moveName}!`;
    } else {
      return `Opponent's ${pokemonName} used ${moveName}!`;
    }
  }

  if (action.includes('took damage!')) {
    const pokemonName = action.split(' ')[0];
    if (perspective === userSide) {
      return `Your ${pokemonName} took damage!`;
    } else {
      return `Opponent's ${pokemonName} took damage!`;
    }
  }

  // Default case - return original action
  return action;
};

// Initial state
const initialState: BattleContextState = {
  gameData: null,
  battleState: null,
  playerSide: 'p1',
  battleUpdates: [],
  isLoading: false,
  error: null
};

// Context
const BattleContext = createContext<{
  state: BattleContextState;
  dispatch: React.Dispatch<BattleAction>;
} | null>(null);

// Provider
export const BattleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(battleReducer, initialState);

  return (
    <BattleContext.Provider value={{ state, dispatch }}>
      {children}
    </BattleContext.Provider>
  );
};

// Hook
export const useBattle = () => {
  const context = useContext(BattleContext);
  if (!context) {
    throw new Error('useBattle must be used within a BattleProvider');
  }
  return context;
};

// Derived selectors
export const useBattleSelectors = () => {
  const { state } = useBattle();
  
  return {
    isInBattle: !!state.gameData && !!state.battleState,
    yourActivePokemon: state.battleState?.players[state.playerSide]?.activePokemon,
    opponentActivePokemon: state.battleState?.players[state.playerSide === 'p1' ? 'p2' : 'p1']?.activePokemon,
    yourTeam: state.gameData?.yourTeam || [],
    canMakeMove: state.battleState && !state.isLoading && !state.battleState.ended,
    turn: state.battleState?.turn || 0,
    lastAction: state.battleState?.lastAction,
    weather: state.battleState?.weather,
    opponent: state.gameData?.opponent || 'Unknown',
    roomId: state.gameData?.roomId
  };
};
