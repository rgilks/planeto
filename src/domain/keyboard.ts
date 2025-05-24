import { z } from "zod";

export const KeyboardInputSchema = z.object({
  key: z.string().min(1),
});

export type KeyboardInput = z.infer<typeof KeyboardInputSchema>;

export const SYMBOLS =
  "☉☯☢☣☠☮☭☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟♠♣♥♦♪♫☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☑☒☓☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇".split(
    "",
  );
