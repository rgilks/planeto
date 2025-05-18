import {
  SimState,
  CelestialBodyId,
  CelestialBodyState,
} from "../domain/sim.types";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";
import { updatePhysics, SIMULATION_G } from "../physics";

// Enhance for HMR stability in dev mode by using globalThis
declare global {
  // eslint-disable-next-line no-var
  var __planeto_simStateManager_currentSimState: SimState | undefined;
  // eslint-disable-next-line no-var
  var __planeto_simStateManager_listeners: Set<SimStateListener> | undefined;
  // eslint-disable-next-line no-var
  var __planeto_simStateManager_instanceId: string | undefined;
  // eslint-disable-next-line no-var
  var __planeto_physics_loop_intervalId: NodeJS.Timeout | undefined;
}

const PHYSICS_TICK_RATE_MS = 50; // 20 ticks per second

const initializeCelestialBodies = (simState: SimState): SimState => {
  if (
    simState.celestialBodies &&
    Object.keys(simState.celestialBodies).length > 1 // Check if more than just the sun might exist
  ) {
    // If we have planets, assume it's initialized for now.
    // A more robust check might be needed if we allow dynamic addition/removal of many bodies later.
    const sunExists = Object.values(simState.celestialBodies).some(
      (body) => body?.type === "sun",
    );
    if (sunExists && Object.keys(simState.celestialBodies).length > 1) {
      // console.log("Celestial bodies (planets) seem to be already initialized.");
      return simState;
    }
  }

  const sunId =
    (Object.values(simState.celestialBodies || {}).find(
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
    initialAngularVelocity: { x: 0, y: 0.05, z: 0 },
    lastUpdated: new Date().toISOString(),
  };

  const numberOfPlanets = 16;
  const baseOrbitRadius = 70;
  const orbitRadiusIncrement = 2;
  const maxOrbitRandomOffset = 1;

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
    const positionZ = 0; // For planar orbits.

    const vMagnitude_ideal =
      orbitalRadius > 0
        ? Math.sqrt((SIMULATION_G * sunMass) / orbitalRadius) // SIMULATION_G is currently 6.0
        : 0;

    const velocityScalingFactor = 0.1;
    const vMagnitude = vMagnitude_ideal * velocityScalingFactor;

    const velocityX_tangential = -vMagnitude * Math.sin(angle);
    const velocityY_tangential = vMagnitude * Math.cos(angle);
    const velocityZ_orbital_random = 0; // For planar orbits.

    const inwardSpeedMagnitude = 0; // For purely tangential initial velocity.

    let normalizedToSunX = 0;
    let normalizedToSunY = 0;
    let normalizedToSunZ = 0;
    const distanceToSun = Math.sqrt(
      positionX * positionX + positionY * positionY + positionZ * positionZ,
    );
    if (distanceToSun > 0) {
      normalizedToSunX = -positionX / distanceToSun;
      normalizedToSunY = -positionY / distanceToSun;
      normalizedToSunZ = -positionZ / distanceToSun;
    }

    const velocityX =
      velocityX_tangential + normalizedToSunX * inwardSpeedMagnitude;
    const velocityY =
      velocityY_tangential + normalizedToSunY * inwardSpeedMagnitude;
    const velocityZ =
      velocityZ_orbital_random + normalizedToSunZ * inwardSpeedMagnitude;

    const maxSpin = 0.5;
    const initialAngularVelocity = {
      x: (Math.random() - 0.5) * 2 * maxSpin,
      y: (Math.random() - 0.5) * 2 * maxSpin,
      z: (Math.random() - 0.5) * 2 * maxSpin,
    };

    const textureUrl = undefined;
    const bumpMapUrl = undefined;
    const specularMapUrl = undefined;

    let atmosphereProps;
    if (i % 5 === 0) {
      // Add atmosphere to every 5th planet for variety
      const r = Math.floor(Math.random() * 155) + 100;
      const g = Math.floor(Math.random() * 155) + 100;
      const b = Math.floor(Math.random() * 155) + 100;
      const hexColor = `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      atmosphereProps = {
        color: hexColor,
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
      initialAngularVelocity,
      orbitingBodyId: sunId,
      textureUrl,
      bumpMapUrl,
      specularMapUrl,
      atmosphere: atmosphereProps,
      lastUpdated: new Date().toISOString(),
    };
  }

  return produce(simState, (draft) => {
    draft.celestialBodies = newCelestialBodies;
  });
};

const ensureGlobalStore = () => {
  if (!globalThis.__planeto_simStateManager_instanceId) {
    globalThis.__planeto_simStateManager_instanceId = uuidv4();
    console.log(
      `simStateManager initialized on globalThis: Instance ID ${globalThis.__planeto_simStateManager_instanceId}`,
    );
  }
  if (!globalThis.__planeto_simStateManager_currentSimState) {
    let initialState: SimState = {
      celestialBodies: {},
    };
    initialState = initializeCelestialBodies(initialState);
    globalThis.__planeto_simStateManager_currentSimState = initialState;
  } else if (
    !globalThis.__planeto_simStateManager_currentSimState.celestialBodies
  ) {
    globalThis.__planeto_simStateManager_currentSimState = produce(
      globalThis.__planeto_simStateManager_currentSimState,
      (draft) => {
        draft.celestialBodies = {};
      },
    );
    globalThis.__planeto_simStateManager_currentSimState =
      initializeCelestialBodies(
        globalThis.__planeto_simStateManager_currentSimState,
      );
  }

  if (!globalThis.__planeto_simStateManager_listeners) {
    globalThis.__planeto_simStateManager_listeners =
      new Set<SimStateListener>();
  }
  return {
    instanceId: globalThis.__planeto_simStateManager_instanceId,
    currentSimState: globalThis.__planeto_simStateManager_currentSimState,
    listeners: globalThis.__planeto_simStateManager_listeners,
  };
};

// Use a function to get the store, ensuring it's initialized on globalThis
const getGlobalStore = () => {
  // This read ensures that if another part of the code initializes it, we use that.
  // The actual initialization logic is in ensureGlobalStore, typically called at module load.
  return {
    instanceId: globalThis.__planeto_simStateManager_instanceId!,
    currentSimState: globalThis.__planeto_simStateManager_currentSimState!,
    listeners: globalThis.__planeto_simStateManager_listeners!,
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
    const newState = updatePhysics(store.currentSimState, dt);
    store.currentSimState = newState;
    globalThis.__planeto_simStateManager_currentSimState = newState;
    notifyListeners();
  }, PHYSICS_TICK_RATE_MS);
};

type SimStateListener = (simState: SimState) => void;

const notifyListeners = () => {
  const { currentSimState, listeners } = getGlobalStore();
  listeners.forEach((listener) => listener(currentSimState));
};

export const getSimState = (): SimState => {
  const { currentSimState } = getGlobalStore();
  return currentSimState;
};

// Start the physics loop if it hasn't been started
// This ensures it starts after HMR reloads as well, if necessary
// and only one instance runs.
if (typeof window === "undefined") {
  // Only run on server
  startPhysicsLoop();
}

// For development/testing: Log state changes
// subscribeToSimStateChanges(newState => {
//   console.log('Sim state updated:', JSON.stringify(newState, null, 2));
// });
