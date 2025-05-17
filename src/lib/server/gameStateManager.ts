import {
  GameState,
  SpaceshipId,
  SpaceshipState,
  UserId,
  Position,
  Rotation,
  CelestialBodyId,
} from "../domain/game.types";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";
import { updatePhysics } from "../physics";

// Enhance for HMR stability in dev mode by using globalThis
declare global {
  // eslint-disable-next-line no-var
  var __planeto_gameStateManager_currentGameState: GameState | undefined;
  // eslint-disable-next-line no-var
  var __planeto_gameStateManager_listeners: Set<GameStateListener> | undefined;
  // eslint-disable-next-line no-var
  var __planeto_gameStateManager_instanceId: string | undefined;
  // eslint-disable-next-line no-var
  var __planeto_physics_loop_intervalId: NodeJS.Timeout | undefined;
}

const PHYSICS_TICK_RATE_MS = 50; // 20 ticks per second

const initializeCelestialBodies = (gameState: GameState): GameState => {
  if (Object.keys(gameState.celestialBodies || {}).length > 0) {
    return gameState; // Already initialized
  }

  const sunId = uuidv4() as CelestialBodyId;
  const earthId = uuidv4() as CelestialBodyId;
  const marsId = uuidv4() as CelestialBodyId;

  return produce(gameState, (draft) => {
    draft.celestialBodies = {
      [sunId]: {
        id: sunId,
        type: "sun",
        name: "Sol",
        mass: 1.989e6, // Scaled mass (e.g., 1.989e30 kg / 1e24)
        radius: 6.957, // Scaled radius (e.g., 695,700 km / 1e5)
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        lastUpdated: new Date().toISOString(),
      },
      [earthId]: {
        id: earthId,
        type: "planet",
        name: "Earth",
        mass: 5.972, // Scaled mass (e.g., 5.972e24 kg / 1e24)
        radius: 10.0, // Scaled radius
        position: { x: 150, y: 0, z: 0 }, // Approx 1 AU (scaled)
        velocity: { x: 0, y: 25.75, z: 0 }, // Initial velocity for orbit (tune this)
        rotation: { x: 0, y: 0, z: 0 },
        orbitingBodyId: sunId,
        lastUpdated: new Date().toISOString(),
      },
      [marsId]: {
        id: marsId,
        type: "planet",
        name: "Mars",
        mass: 0.6417, // Scaled mass
        radius: 7.0, // Scaled radius
        position: { x: -220, y: 0, z: 0 }, // Approx 1.5 AU (scaled)
        velocity: { x: 0, y: -21.26, z: 0 }, // Initial velocity for orbit (tune this)
        rotation: { x: 0, y: 0, z: 0 },
        orbitingBodyId: sunId,
        lastUpdated: new Date().toISOString(),
      },
    };
  });
};

const ensureGlobalStore = () => {
  if (!globalThis.__planeto_gameStateManager_instanceId) {
    globalThis.__planeto_gameStateManager_instanceId = uuidv4();
    console.log(
      `gameStateManager initialized on globalThis: Instance ID ${globalThis.__planeto_gameStateManager_instanceId}`,
    );
  }
  if (!globalThis.__planeto_gameStateManager_currentGameState) {
    let initialState: GameState = {
      spaceships: {},
      celestialBodies: {},
    };
    initialState = initializeCelestialBodies(initialState);
    globalThis.__planeto_gameStateManager_currentGameState = initialState;
  } else if (
    !globalThis.__planeto_gameStateManager_currentGameState.celestialBodies
  ) {
    globalThis.__planeto_gameStateManager_currentGameState = produce(
      globalThis.__planeto_gameStateManager_currentGameState,
      (draft) => {
        draft.celestialBodies = {};
      },
    );
    globalThis.__planeto_gameStateManager_currentGameState =
      initializeCelestialBodies(
        globalThis.__planeto_gameStateManager_currentGameState,
      );
  }

  if (!globalThis.__planeto_gameStateManager_listeners) {
    globalThis.__planeto_gameStateManager_listeners =
      new Set<GameStateListener>();
  }
  return {
    instanceId: globalThis.__planeto_gameStateManager_instanceId,
    currentGameState: globalThis.__planeto_gameStateManager_currentGameState,
    listeners: globalThis.__planeto_gameStateManager_listeners,
  };
};

// Use a function to get the store, ensuring it's initialized on globalThis
const getGlobalStore = () => {
  // This read ensures that if another part of the code initializes it, we use that.
  // The actual initialization logic is in ensureGlobalStore, typically called at module load.
  return {
    instanceId: globalThis.__planeto_gameStateManager_instanceId!,
    currentGameState: globalThis.__planeto_gameStateManager_currentGameState!,
    listeners: globalThis.__planeto_gameStateManager_listeners!,
  };
};

// Initialize on module load
ensureGlobalStore();

const startPhysicsLoop = () => {
  if (globalThis.__planeto_physics_loop_intervalId) {
    // Already running
    return;
  }
  console.log("Starting physics loop...");
  globalThis.__planeto_physics_loop_intervalId = setInterval(() => {
    const store = getGlobalStore();
    const dt = PHYSICS_TICK_RATE_MS / 1000;
    const newState = updatePhysics(store.currentGameState, dt);
    store.currentGameState = newState;
    globalThis.__planeto_gameStateManager_currentGameState = newState;
    notifyListeners();
  }, PHYSICS_TICK_RATE_MS);
};

type GameStateListener = (gameState: GameState) => void;

const notifyListeners = () => {
  const { currentGameState, listeners } = getGlobalStore();
  listeners.forEach((listener) => listener(currentGameState));
};

export const getGameState = (): GameState => {
  const { currentGameState } = getGlobalStore();
  return currentGameState;
};

export const addPlayerSpaceship = (userId: UserId): SpaceshipState => {
  const store = getGlobalStore();
  const spaceshipId = uuidv4() as SpaceshipId;

  // Add some randomness to starting positions
  const randomX = Math.random() * 10 - 5; // Random number between -5 and 5
  const randomY = Math.random() * 10 - 5; // Random number between -5 and 5
  const initialZ = 20; // Keep Z further out

  const newSpaceship: SpaceshipState = {
    id: spaceshipId,
    owner: userId,
    position: { x: randomX, y: randomY, z: initialZ },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 1,
    lastUpdated: new Date().toISOString(),
  };

  store.currentGameState = produce(store.currentGameState, (draft) => {
    const existingSpaceshipEntry = Object.values(draft.spaceships).find(
      (s) => s && s.owner === userId,
    );
    if (existingSpaceshipEntry) {
      delete draft.spaceships[existingSpaceshipEntry.id];
    }
    draft.spaceships[spaceshipId] = newSpaceship;
  });
  globalThis.__planeto_gameStateManager_currentGameState =
    store.currentGameState;

  notifyListeners();
  return newSpaceship;
};

export const removePlayerSpaceship = (userId: UserId): SpaceshipId | null => {
  const store = getGlobalStore();
  let removedSpaceshipId: SpaceshipId | null = null;
  store.currentGameState = produce(store.currentGameState, (draft) => {
    const spaceshipEntry = Object.entries(draft.spaceships).find(
      ([, spaceship]) => spaceship && spaceship.owner === userId,
    );
    if (spaceshipEntry) {
      removedSpaceshipId = spaceshipEntry[0] as SpaceshipId;
      delete draft.spaceships[removedSpaceshipId];
    }
  });
  globalThis.__planeto_gameStateManager_currentGameState =
    store.currentGameState; // Ensure global reference is updated

  if (removedSpaceshipId) {
    notifyListeners();
  }
  return removedSpaceshipId;
};

export const updateSpaceship = (
  spaceshipId: SpaceshipId,
  newPosition: Position,
  newRotation: Rotation,
  newVelocity: Position,
  userId?: UserId,
): SpaceshipState | null => {
  const store = getGlobalStore();
  let wasUpdated = false; // Flag to check if an update actually happened

  store.currentGameState = produce(store.currentGameState, (draft) => {
    const spaceship = draft.spaceships[spaceshipId];
    if (spaceship) {
      if (userId && spaceship.owner !== userId) {
        console.warn(
          `User ${userId} attempted to move spaceship ${spaceshipId} owned by ${spaceship.owner}`,
        );
        return;
      }
      spaceship.position = newPosition;
      spaceship.rotation = newRotation;
      spaceship.velocity = newVelocity;
      spaceship.lastUpdated = new Date().toISOString();
      wasUpdated = true; // Mark that an update occurred
    }
  });
  globalThis.__planeto_gameStateManager_currentGameState =
    store.currentGameState;

  if (wasUpdated) {
    notifyListeners();
    // Return a fresh reference from the finalized state, not from the draft
    return store.currentGameState.spaceships[spaceshipId] || null;
  }
  return null; // Return null if the spaceship wasn't found or not updated
};

export const subscribeToGameStateChanges = (
  listener: GameStateListener,
): (() => void) => {
  const { listeners, currentGameState } = getGlobalStore();
  listeners.add(listener);
  listener(currentGameState);
  return () => {
    listeners.delete(listener);
  };
};

// Start the physics loop if it hasn't been started
// This ensures it starts after HMR reloads as well, if necessary
// and only one instance runs.
if (typeof window === "undefined") {
  // Only run on server
  startPhysicsLoop();
}

// For development/testing: Log state changes
// subscribeToGameStateChanges(newState => {
//   console.log('Game state updated:', JSON.stringify(newState, null, 2));
// });
