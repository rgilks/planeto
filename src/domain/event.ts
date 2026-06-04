import { z } from "zod";

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

export const SymbolEventSchema = z.object({
  type: z.literal("symbol"),
  id: z.string(),
  key: z.string().min(1),
});
export type SymbolEventType = z.infer<typeof SymbolEventSchema>;

export const EyeUpdateSchema = z.object({
  type: z.literal("eyeUpdate"),
  id: z.string().min(1),
  p: Vec3Schema,
  t: z.number(),
});
export type EyeUpdateType = z.infer<typeof EyeUpdateSchema>;

export const EventSchema = z.discriminatedUnion("type", [
  SymbolEventSchema,
  EyeUpdateSchema,
]);
export type EventType = z.infer<typeof EventSchema>;

// Shared protocol constant: an eye is treated as stale (purged on the server,
// pruned on the client) once it is older than this. The Worker
// (worker/eventsChannel.ts) and the client (useEyes.ts) must agree on it.
export const EYE_STALE_MS = 30_000;
