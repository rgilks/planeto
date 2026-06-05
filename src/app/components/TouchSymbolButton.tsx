"use client";

import { useEffect, useState } from "react";

import { SYMBOLS } from "@/domain";
import { usePhysicsStore } from "@/stores/physicsStore";
import { useSymbolStore } from "@/stores/symbolStore";

// Touch/coarse-pointer devices have neither a reliable double-click nor a
// keyboard, so they get a discreet on-screen button that fires the same action
// as the Canvas double-click: a random symbol + a brief gravity pause.
export const TouchSymbolButton = () => {
  const [isTouch, setIsTouch] = useState(false);

  const setLastInput = useSymbolStore((s) => s.setLastInput);
  const disableGravityTemporarily = usePhysicsStore(
    (s) => s.disableGravityTemporarily,
  );

  // Detect once on mount (client-only - safe for SSR / static export).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (!isTouch) return null;

  const sendSymbol = () => {
    const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    setLastInput({ key: randomSymbol });
    disableGravityTemporarily(2000);
  };

  return (
    <button
      type="button"
      onClick={sendSymbol}
      aria-label="Send a symbol"
      className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/25 bg-black/40 px-5 py-2 text-sm font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-white/60 hover:text-white active:bg-black/60"
    >
      Send a symbol
    </button>
  );
};
