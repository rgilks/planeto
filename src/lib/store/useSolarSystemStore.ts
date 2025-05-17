import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { SolarSystemData } from "@/lib/domain";

interface SolarSystemState {
  currentSystem: SolarSystemData | null;
  setCurrentSystem: (system: SolarSystemData) => void;
  // We can add more actions here later, e.g., addPlanet, updatePlanetProperties, etc.
}

export const useSolarSystemStore = create<SolarSystemState>()(
  immer((set) => ({
    currentSystem: null,
    setCurrentSystem: (system) =>
      set((state) => {
        state.currentSystem = system;
      }),
  })),
);
