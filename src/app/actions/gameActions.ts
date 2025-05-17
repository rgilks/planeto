"use server";

import { z } from "zod";
import {
  PositionSchema,
  RotationSchema,
  UserIdSchema,
  SpaceshipIdSchema,
  // UserId, // Removed as unused
} from "@/lib/domain/game.types";
import { updateSpaceship, getGameState } from "@/lib/server/gameStateManager";
// import { getServerSession } from "next-auth/next"; // Removed as unused
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path as needed

const MoveSpaceshipPayloadSchema = z.object({
  position: PositionSchema,
  rotation: RotationSchema,
});

export const moveSpaceship = async (formData: FormData) => {
  // TODO: Replace with actual user session retrieval for proper authentication
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user?.id) {
  //   return { success: false, error: 'Unauthorized' };
  // }
  // const userId = session.user.id as UserId;

  const rawUserId = formData.get("userId");
  const userIdParseResult = UserIdSchema.safeParse(rawUserId);

  if (!userIdParseResult.success) {
    console.error(
      "moveSpaceship: userId not provided in form data or invalid. This is a fallback/testing issue.",
    );
  }

  const rawSpaceshipId = formData.get("spaceshipId");
  const spaceshipIdParseResult = SpaceshipIdSchema.safeParse(rawSpaceshipId);

  if (!spaceshipIdParseResult.success) {
    console.error(
      "[gameActions.moveSpaceship] spaceshipId is required or invalid. Raw:",
      rawSpaceshipId,
      "Error:",
      spaceshipIdParseResult.error,
    );
    return {
      success: false,
      error: "Spaceship ID is required and must be a valid UUID.",
    };
  }
  const spaceshipId = spaceshipIdParseResult.data;

  const currentGameState = getGameState();
  const currentSpaceships = currentGameState.spaceships;

  const spaceshipToMove = currentSpaceships[spaceshipId];

  if (!spaceshipToMove) {
    return { success: false, error: "Spaceship not found." };
  }

  const positionData = {
    x: parseFloat(formData.get("position.x") as string),
    y: parseFloat(formData.get("position.y") as string),
    z: parseFloat(formData.get("position.z") as string),
  };

  const rotationData = {
    x: parseFloat(formData.get("rotation.x") as string),
    y: parseFloat(formData.get("rotation.y") as string),
    z: parseFloat(formData.get("rotation.z") as string),
  };

  const parsedPayload = MoveSpaceshipPayloadSchema.safeParse({
    position: positionData,
    rotation: rotationData,
  });

  if (!parsedPayload.success) {
    return {
      success: false,
      error: "Invalid payload",
      details: parsedPayload.error.flatten(),
    };
  }

  const { position, rotation } = parsedPayload.data;

  try {
    const updated = updateSpaceship(
      spaceshipId,
      position,
      rotation /*, userId */,
    ); // Pass userId for ownership check if implemented
    if (updated) {
      return { success: true, data: updated };
    } else {
      console.error(
        `[gameActions.moveSpaceship] updateSpaceship returned null for spaceshipId: ${spaceshipId}. Spaceship might have been removed or ownership check failed.`,
      );
      return {
        success: false,
        error:
          "Failed to update spaceship. It might not exist or ownership check failed.",
      };
    }
  } catch (error) {
    console.error("Error moving spaceship:", error);
    return { success: false, error: "Internal server error" };
  }
};
