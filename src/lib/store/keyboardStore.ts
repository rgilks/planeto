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
        state.remoteKeys[id] = { key, ts: Date.now() };
      }),
  })),
);

export type { State };
