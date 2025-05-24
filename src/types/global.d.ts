import { useCamStore } from "@/hooks/useRemoteCameras";
import { useKeyboardStore } from "@/stores/keyboardStore";

declare global {
  interface Window {
    __keyboardStore?: typeof useKeyboardStore;
    __camStore?: typeof useCamStore;
  }
}
