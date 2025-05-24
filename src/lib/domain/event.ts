import { z } from "zod";

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const KeyboardEventSchema = z.object({
  type: z.literal("keyboard"),
  id: z.string(),
  key: z.string().min(1),
});
export type KeyboardEventType = z.infer<typeof KeyboardEventSchema>;

export const CameraUpdateSchema = z.object({
  type: z.literal("cameraUpdate"),
  id: z.string().min(1),
  p: Vec3Schema,
  t: z.number(),
});
export type CameraUpdateType = z.infer<typeof CameraUpdateSchema>;

export const EventSchema = z.discriminatedUnion("type", [
  KeyboardEventSchema,
  CameraUpdateSchema,
]);
export type EventType = z.infer<typeof EventSchema>;
