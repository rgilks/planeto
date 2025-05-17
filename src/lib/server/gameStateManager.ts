import {
  GameState,
  SpaceshipId,
  SpaceshipState,
  UserId,
  Position,
  Rotation,
} from "../domain/game.types";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";

type GameStateListener = (gameState: GameState) => void;

let currentGameState: GameState = {
  spaceships: {},
};

const listeners: Set<GameStateListener> = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => listener(currentGameState));
};

export const getGameState = (): GameState => {
  return currentGameState;
};

export const addPlayerSpaceship = (userId: UserId): SpaceshipState => {
  const spaceshipId = uuidv4() as SpaceshipId;
  const newSpaceship: SpaceshipState = {
    id: spaceshipId,
    owner: userId,
    position: { x: 0, y: 0, z: 0 }, // Default starting position
    rotation: { x: 0, y: 0, z: 0 }, // Default starting rotation
    lastUpdated: new Date().toISOString(),
  };

  currentGameState = produce(currentGameState, (draft) => {
    const existingSpaceshipEntry = Object.values(draft.spaceships).find(
      (s) => s && s.owner === userId,
    );
    if (existingSpaceshipEntry) {
      delete draft.spaceships[existingSpaceshipEntry.id];
    }
    draft.spaceships[spaceshipId] = newSpaceship;
  });

  notifyListeners();
  return newSpaceship;
};

export const removePlayerSpaceship = (userId: UserId): SpaceshipId | null => {
  let removedSpaceshipId: SpaceshipId | null = null;
  currentGameState = produce(currentGameState, (draft) => {
    const spaceshipEntry = Object.entries(draft.spaceships).find(
      ([, spaceship]) => spaceship && spaceship.owner === userId,
    );
    if (spaceshipEntry) {
      removedSpaceshipId = spaceshipEntry[0] as SpaceshipId;
      delete draft.spaceships[removedSpaceshipId];
    }
  });

  if (removedSpaceshipId) {
    notifyListeners();
  }
  return removedSpaceshipId;
};

export const updateSpaceship = (
  spaceshipId: SpaceshipId,
  newPosition: Position,
  newRotation: Rotation,
  userId?: UserId, // Optional: to verify ownership before update
): SpaceshipState | null => {
  let updatedSpaceship: SpaceshipState | null = null;
  currentGameState = produce(currentGameState, (draft) => {
    const spaceship = draft.spaceships[spaceshipId];
    if (spaceship) {
      if (userId && spaceship.owner !== userId) {
        console.warn(
          `User ${userId} attempted to move spaceship ${spaceshipId} owned by ${spaceship.owner}`,
        );
        return; // Or throw error
      }
      spaceship.position = newPosition;
      spaceship.rotation = newRotation;
      spaceship.lastUpdated = new Date().toISOString();
      updatedSpaceship = spaceship;
    }
  });

  if (updatedSpaceship) {
    notifyListeners();
  }
  return updatedSpaceship;
};

export const subscribeToGameStateChanges = (
  listener: GameStateListener,
): (() => void) => {
  listeners.add(listener);
  // Immediately send the current state to the new listener
  listener(currentGameState);
  return () => {
    listeners.delete(listener);
  };
};

// For development/testing: Log state changes
// subscribeToGameStateChanges(newState => {
//   console.log('Game state updated:', JSON.stringify(newState, null, 2));
// });
