import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { SymbolInput } from "@/domain";

type RemoteKey = { key: string; ts: number };

type SymbolState = {
  lastInput: SymbolInput | null;
  setLastInput: (input: SymbolInput) => void;
  remoteKeys: Record<string, RemoteKey>;
  setRemoteKey: (id: string, key: string) => void;
};

declare global {
  interface Window {
    __symbolStore?: typeof useSymbolStore;
  }
}

export const useSymbolStore = create<SymbolState>()(
  immer((set) => ({
    lastInput: null,
    setLastInput: (input) =>
      set((state) => {
        state.lastInput = input;
      }),
    remoteKeys: {},
    setRemoteKey: (id, key) =>
      set((state) => {
        if (key) {
          state.remoteKeys[id] = { key, ts: Date.now() };
        } else {
          delete state.remoteKeys[id];
        }
      }),
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__symbolStore = useSymbolStore;
}

export type { SymbolState, RemoteKey };
