import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationNum } from "@pkmn/types";

interface SettingsState {
    generation: GenerationNum;
    setGeneration: (generation: GenerationNum) => void;
}

export const useSettings = create<SettingsState>()(
    persist(
        (set) => ({
            generation: 3,
            setGeneration: (generation) => set({ generation }),
        }),
        {
            name: "pokemon-battle-settings",
        }
    )
); 