import { useCamStore } from "@/hooks/useRemoteCameras";
import { useSymbolStore } from "@/stores/symbolStore";

declare global {
  interface Window {
    __symbolStore?: typeof useSymbolStore;
    __camStore?: typeof useCamStore;
  }
}
