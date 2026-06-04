import { z } from "zod";

export const SymbolInputSchema = z.object({
  key: z.string().min(1),
});

export type SymbolInput = z.infer<typeof SymbolInputSchema>;

// The two source ranges overlap, so de-duplicate while preserving order.
export const SYMBOLS = Array.from(
  new Set(
    "☉☯☢☣☠☮☭☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟♠♣♥♦♪♫☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☑☒☓☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇".split(
      "",
    ),
  ),
);

// Matrix-green accent used wherever a symbol glyph is shown (HUD + in-scene labels).
export const SYMBOL_COLOR = "#00FF41";

// Map any keyboard key to a stable symbol glyph via its first code point.
export const getSymbol = (key: string): string => {
  const code = key.codePointAt(0) || 0;
  return SYMBOLS[code % SYMBOLS.length];
};
