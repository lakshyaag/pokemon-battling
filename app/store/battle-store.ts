import { create } from "zustand";

interface BattleState {
	selectedMoves: string[];
	p1Team: string;
	opponentMoves: string[];
	p2Team: string;
	isLoading: boolean;
	setSelectedMoves: (moves: string[]) => void;
	setP1Team: (team: string) => void;
	setOpponentMoves: (moves: string[]) => void;
	setP2Team: (team: string) => void;
	setIsLoading: (loading: boolean) => void;
	reset: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
	selectedPokemon: null,
	selectedMoves: [],
	p1Team: "",
	opponentPokemon: null,
	opponentMoves: [],
	p2Team: "",
	isLoading: false,

	setSelectedMoves: (moves) => set({ selectedMoves: moves }),
	setP1Team: (team) => set({ p1Team: team }),
	setP2Team: (team) => set({ p2Team: team }),

	setOpponentMoves: (moves) => set({ opponentMoves: moves }),
	setIsLoading: (loading) => set({ isLoading: loading }),
	reset: () =>
		set({
			selectedMoves: [],
			p1Team: "",
			opponentMoves: [],
			p2Team: "",
			isLoading: false,
		}),
}));
