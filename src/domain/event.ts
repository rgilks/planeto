import { z } from "zod";

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

export const SymbolEventSchema = z.object({
  type: z.literal("symbol"),
  id: z.string(),
  key: z.string().min(1),
});
export type SymbolEventType = z.infer<typeof SymbolEventSchema>;

export const CameraUpdateSchema = z.object({
  type: z.literal("cameraUpdate"),
  id: z.string().min(1),
  p: Vec3Schema,
  t: z.number(),
});
export type CameraUpdateType = z.infer<typeof CameraUpdateSchema>;

export const EventSchema = z.discriminatedUnion("type", [
  SymbolEventSchema,
  CameraUpdateSchema,
]);
export type EventType = z.infer<typeof EventSchema>;
