import { z } from "zod";

export const StarSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  color: z.string(),
  size: z.number(),
});

export const StarFieldSchema = z.object({
  stars: z.array(StarSchema),
});

export type Star = z.infer<typeof StarSchema>;
export type StarField = z.infer<typeof StarFieldSchema>;
