import { useEyeStore } from "@/hooks/useRemoteEyes";
import { useSymbolStore } from "@/stores/symbolStore";

declare global {
  interface Window {
    __symbolStore?: typeof useSymbolStore;
    __eyeStore?: typeof useEyeStore;
  }
}
