import {
  GameState,
  SpaceshipId,
  SpaceshipState,
  UserId,
  Position,
  Rotation,
  CelestialBodyId,
  CelestialBodyState,
} from "../domain/game.types";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";
import { updatePhysics, SIMULATION_G } from "../physics";

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
  if (
    gameState.celestialBodies &&
    Object.keys(gameState.celestialBodies).length > 1 // Check if more than just the sun might exist
  ) {
    // If we have planets, assume it's initialized for now.
    // A more robust check might be needed if we allow dynamic addition/removal of many bodies later.
    const sunExists = Object.values(gameState.celestialBodies).some(
      (body) => body?.type === "sun",
    );
    if (sunExists && Object.keys(gameState.celestialBodies).length > 1) {
      // console.log("Celestial bodies (planets) seem to be already initialized.");
      return gameState;
    }
  }

  const sunId =
    (Object.values(gameState.celestialBodies || {}).find(
      (body) => body?.type === "sun",
    )?.id as CelestialBodyId) || (uuidv4() as CelestialBodyId);

  const sunMass = 1.989e6; // Using the existing scaled mass for the Sun

  const newCelestialBodies: Record<CelestialBodyId, CelestialBodyState> = {};

  newCelestialBodies[sunId] = {
    id: sunId,
    type: "sun",
    name: "Sol",
    mass: sunMass,
    radius: 35,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    rotationSpeed: 0.8,
    lastUpdated: new Date().toISOString(),
  };

  const numberOfPlanets = 20;
  const baseOrbitRadius = 14;
  const orbitRadiusIncrement = 18;
  const maxOrbitRandomOffset = 8;

  for (let i = 0; i < numberOfPlanets; i++) {
    const planetId = uuidv4() as CelestialBodyId;
    const planetName = `Planet-${i + 1}`;

    const mass = Math.random() * (20 - 0.05) + 0.05;
    const radius = Math.random() * (15 - 2) + 2;

    const orbitalRadius =
      baseOrbitRadius +
      i * orbitRadiusIncrement +
      (Math.random() - 0.5) * 2 * maxOrbitRandomOffset;

    const angle =
      (i / numberOfPlanets) * 2 * Math.PI + Math.random() * 0.2 - 0.1;

    const positionX = orbitalRadius * Math.cos(angle);
    const positionY = orbitalRadius * Math.sin(angle);
    const positionZ = (Math.random() - 0.5) * 60;

    const vMagnitude =
      orbitalRadius > 0
        ? Math.sqrt((SIMULATION_G * sunMass) / orbitalRadius)
        : 0;

    const velocityX = -vMagnitude * Math.sin(angle);
    const velocityY = vMagnitude * Math.cos(angle);
    const velocityZ = (Math.random() - 0.5) * vMagnitude * 0.1;

    const textureUrl = undefined;
    const bumpMapUrl = undefined;
    const specularMapUrl = undefined;

    let atmosphereProps;
    if (i % 5 === 0) {
      // Add atmosphere to every 5th planet for variety
      atmosphereProps = {
        color: `rgba(${Math.floor(Math.random() * 155) + 100}, ${Math.floor(Math.random() * 155) + 100}, ${Math.floor(Math.random() * 155) + 100}, 0.7)`,
        thickness: Math.random() * 0.1 + 0.05, // 5% to 15% of planet radius
        density: Math.random() * 0.5 + 0.3, // 0.3 to 0.8
      };
    }

    newCelestialBodies[planetId] = {
      id: planetId,
      type: "planet",
      name: planetName,
      mass: mass,
      radius: radius,
      position: { x: positionX, y: positionY, z: positionZ },
      velocity: { x: velocityX, y: velocityY, z: velocityZ },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      orbitingBodyId: sunId,
      textureUrl,
      bumpMapUrl,
      specularMapUrl,
      atmosphere: atmosphereProps,
      lastUpdated: new Date().toISOString(),
    };
  }

  return produce(gameState, (draft) => {
    draft.celestialBodies = newCelestialBodies;
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
