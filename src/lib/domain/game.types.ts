import { z } from "zod";

export const UserIdSchema = z.string().uuid().brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const SpaceshipIdSchema = z.string().uuid().brand<"SpaceshipId">();
export type SpaceshipId = z.infer<typeof SpaceshipIdSchema>;

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

export const RotationSchema = z.object({
  // Euler angles
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Rotation = z.infer<typeof RotationSchema>;

export const SpaceshipStateSchema = z.object({
  id: SpaceshipIdSchema,
  owner: UserIdSchema,
  position: PositionSchema,
  rotation: RotationSchema,
  lastUpdated: z.string().datetime(),
});
export type SpaceshipState = z.infer<typeof SpaceshipStateSchema>;

export const GameStateSchema = z.object({
  spaceships: z.record(SpaceshipIdSchema, SpaceshipStateSchema),
});
export type GameState = z.infer<typeof GameStateSchema>;

// Define event contracts as interfaces
export interface ClientToServerEvents {
  moveSpaceship(payload: { position: Position; rotation: Rotation }): void;
}

export interface ServerToClientEvents {
  gameStateUpdate(payload: GameState): void;
  userJoined(payload: { userId: UserId; spaceship: SpaceshipState }): void;
  userLeft(payload: { userId: UserId; spaceshipId: SpaceshipId }): void;
  error(payload: { message: string }): void;
}

// Example of how to validate:
// const validPosition = PositionSchema.parse({ x: 1, y: 2, z: 3 });
// const invalidPosition = PositionSchema.safeParse({ x: 1, y: '2', z: 3 });
// if (!invalidPosition.success) {
//   console.error(invalidPosition.error.issues);
// }
