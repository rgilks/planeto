import { produce } from "immer";
import { GameState, CelestialBodyState, Position } from "./domain/game.types";
import * as THREE from "three";

export const G = 6.6743e-11; // Gravitational constant (m^3 kg^-1 s^-2)
// For simulation purposes, we might use a scaled G or scaled masses/distances
// For now, let's assume units are somewhat abstract (e.g., astronomical units, years for time, solar masses)
// And G will be tuned to look good.
export const SIMULATION_G = 0.2; // Adjusted for simulation scale

export const calculateGravitationalForce = (
  body1: CelestialBodyState,
  body2: CelestialBodyState,
): THREE.Vector3 => {
  const vecToBody2 = new THREE.Vector3().subVectors(
    new THREE.Vector3(body2.position.x, body2.position.y, body2.position.z),
    new THREE.Vector3(body1.position.x, body1.position.y, body1.position.z),
  );

  const distanceSq = vecToBody2.lengthSq();

  if (distanceSq === 0) {
    return new THREE.Vector3(0, 0, 0); // Avoid division by zero if bodies are at the same position
  }

  const forceMagnitude = (SIMULATION_G * body1.mass * body2.mass) / distanceSq;
  const forceVector = vecToBody2.normalize().multiplyScalar(forceMagnitude);

  return forceVector;
};

export const updateVelocity = (
  currentVelocity: Position,
  force: THREE.Vector3,
  mass: number,
  dt: number,
): Position => {
  // F = ma => a = F/m
  const acceleration = force.clone().divideScalar(mass);

  // v_new = v_old + a * dt
  const newVelocity = {
    x: currentVelocity.x + acceleration.x * dt,
    y: currentVelocity.y + acceleration.y * dt,
    z: currentVelocity.z + acceleration.z * dt,
  };
  return newVelocity;
};

export const updatePosition = (
  currentPosition: Position,
  velocity: Position,
  dt: number,
): Position => {
  // p_new = p_old + v * dt
  const newPosition = {
    x: currentPosition.x + velocity.x * dt,
    y: currentPosition.y + velocity.y * dt,
    z: currentPosition.z + velocity.z * dt,
  };
  return newPosition;
};

export const updateCelestialBody = (
  body: CelestialBodyState,
  netForce: THREE.Vector3,
  dt: number,
): CelestialBodyState => {
  const newVelocity = updateVelocity(body.velocity, netForce, body.mass, dt);
  const newPosition = updatePosition(body.position, newVelocity, dt);

  return produce(body, (draft) => {
    draft.velocity = newVelocity;
    draft.position = newPosition;
    draft.lastUpdated = new Date().toISOString();
  });
};

export const updatePhysics = (
  currentState: GameState,
  dt: number,
): GameState => {
  return produce(currentState, (draftState) => {
    const celestialBodyIds = Object.keys(
      draftState.celestialBodies,
    ) as (keyof GameState["celestialBodies"])[];

    // Store net forces for each body before updating positions
    const netForces: Record<string, THREE.Vector3> = {};

    // Calculate net force on each body
    celestialBodyIds.forEach((id1) => {
      netForces[id1] = new THREE.Vector3(0, 0, 0);
      celestialBodyIds.forEach((id2) => {
        if (id1 === id2) return;

        const body1 = draftState.celestialBodies[id1];
        const body2 = draftState.celestialBodies[id2];
        if (!body1 || !body2) return; // Should not happen

        const force = calculateGravitationalForce(body1, body2);
        netForces[id1].add(force);
      });
    });

    // Update each body based on the calculated net force
    celestialBodyIds.forEach((id) => {
      const body = draftState.celestialBodies[id];
      if (!body) return; // Should not happen

      const updatedBody = updateCelestialBody(body, netForces[id], dt);
      draftState.celestialBodies[id] = updatedBody;
    });

    // Potentially update spaceships physics here too if they are affected by gravity
    // For now, focusing on celestial bodies
  });
};
