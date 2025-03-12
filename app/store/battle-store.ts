import { create } from 'zustand';
import type { PokemonData } from '@/components/PokemonSelector';

interface BattleState {
  selectedPokemon: PokemonData | null;
  selectedMoves: string[];
  p1Team: string;
  opponentPokemon: PokemonData | null;
  opponentMoves: string[];
  p2Team: string;
  isLoading: boolean;
  setSelectedPokemon: (pokemon: PokemonData | null) => void;
  setSelectedMoves: (moves: string[]) => void;
  setP1Team: (team: string) => void;
  setOpponentPokemon: (pokemon: PokemonData | null) => void;
  setOpponentMoves: (moves: string[]) => void;
  setP2Team: (team: string) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  selectedPokemon: null,
  selectedMoves: [],
  p1Team: '',
  opponentPokemon: null,
  opponentMoves: [],
  p2Team: '',
  isLoading: false,
  setSelectedPokemon: (pokemon) => set({ selectedPokemon: pokemon }),
  setSelectedMoves: (moves) => set({ selectedMoves: moves }),
  setP1Team: (team) => set({ p1Team: team }),
  setP2Team: (team) => set({ p2Team: team }),
  setOpponentPokemon: (pokemon) => set({ opponentPokemon: pokemon }),
  setOpponentMoves: (moves) => set({ opponentMoves: moves }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({
    selectedPokemon: null,
    selectedMoves: [],
    p1Team: '',
    opponentPokemon: null,
    opponentMoves: [],
    p2Team: '',
    isLoading: false
  }),
})); 