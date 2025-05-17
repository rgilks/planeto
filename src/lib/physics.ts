import { produce } from "immer";
import { GameState, CelestialBodyState, Position } from "./domain/game.types";
import * as THREE from "three";

export const G = 6.6743e-11; // Gravitational constant (m^3 kg^-1 s^-2)
// For simulation purposes, we might use a scaled G or scaled masses/distances
// For now, let's assume units are somewhat abstract (e.g., astronomical units, years for time, solar masses)
// And G will be tuned to look good.
export const SIMULATION_G = 6.0; // Gravitational constant for simulation

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
    // The following lines are to satisfy the linter for intentionally unused parameters,
    // as server-side physics for celestial bodies is currently inactive.
    if (false) {
      console.log(dt, draftState);
    }

    // Server-side physics for celestial bodies is currently disabled.
    // All celestial body physics (gravity) is handled client-side in SolarSystem3D.tsx.
    // Spaceship physics updates are also handled client-side or via client commands to the server.
  });
};
