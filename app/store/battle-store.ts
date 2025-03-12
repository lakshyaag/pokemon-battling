import { create } from 'zustand';
import type { Pokemon } from '@pkmn/client';
import type { PokemonData } from '@/components/PokemonSelector';

interface BattleState {
  selectedPokemon: PokemonData | null;
  selectedMoves: string[];
  opponentPokemon: PokemonData | null;
  opponentMoves: string[];
  isLoading: boolean;
  setSelectedPokemon: (pokemon: PokemonData | null) => void;
  setSelectedMoves: (moves: string[]) => void;
  setOpponentPokemon: (pokemon: PokemonData | null) => void;
  setOpponentMoves: (moves: string[]) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  selectedPokemon: null,
  selectedMoves: [],
  opponentPokemon: null,
  opponentMoves: [],
  isLoading: false,
  setSelectedPokemon: (pokemon) => set({ selectedPokemon: pokemon }),
  setSelectedMoves: (moves) => set({ selectedMoves: moves }),
  setOpponentPokemon: (pokemon) => set({ opponentPokemon: pokemon }),
  setOpponentMoves: (moves) => set({ opponentMoves: moves }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ 
    selectedPokemon: null, 
    selectedMoves: [], 
    opponentPokemon: null, 
    opponentMoves: [], 
    isLoading: false 
  }),
})); 