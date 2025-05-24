import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { KeyboardInput } from "../domain/keyboard";

type RemoteKey = { key: string; ts: number };

type State = {
  lastInput: KeyboardInput | null;
  setLastInput: (input: KeyboardInput) => void;
  remoteKeys: Record<string, RemoteKey>;
  setRemoteKey: (id: string, key: string) => void;
};

export const useKeyboardStore = create<State>()(
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
  // @ts-expect-error - for debugging purposes
  window.__keyboardStore = useKeyboardStore;
}

export type { State };
