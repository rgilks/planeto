"use client";

import { getSymbol, SYMBOL_COLOR } from "@/domain";
import { useSymbolStore } from "@/stores/symbolStore";

const SymbolDisplay = () => {
  const lastInput = useSymbolStore((s) => s.lastInput);

  if (!lastInput) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "rgba(0,0,0,0.7)",
        color: SYMBOL_COLOR,
        padding: "1rem 2rem",
        borderRadius: 12,
        fontSize: 96,
        fontFamily: "monospace",
        zIndex: 1000,
      }}
    >
      {getSymbol(lastInput.key)}
    </div>
  );
};

export default SymbolDisplay;
