import { useCamStore } from "@/hooks/useRemoteCameras";
import { useKeyboardStore } from "@/stores/keyboardStore";
// import type { UseBoundStore, StoreApi } from 'zustand'; // Assuming UseBoundStore and StoreApi are needed for __camStore

declare global {
  interface Window {
    __keyboardStore?: typeof useKeyboardStore;
    __camStore?: typeof useCamStore;
  }
}
