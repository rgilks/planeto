import { produce } from "immer";
import { SimState, CelestialBodyState, Position } from "./domain/sim.types";
import * as THREE from "three";

export const SIMULATION_G = 6.0;

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

export const updatePhysics = (currentState: SimState, dt: number): SimState => {
  return produce(currentState, (draftState) => {
    const bodyEntries = Object.entries(draftState.celestialBodies) as [
      string,
      CelestialBodyState,
    ][];
    const forces: Record<string, THREE.Vector3> = {};

    for (const [id] of bodyEntries) {
      forces[id] = new THREE.Vector3(0, 0, 0);
    }

    for (let i = 0; i < bodyEntries.length; i++) {
      const [id1, body1] = bodyEntries[i];
      for (let j = i + 1; j < bodyEntries.length; j++) {
        const [id2, body2] = bodyEntries[j];
        if (body1.id === body2.id) continue;
        const force = calculateGravitationalForce(body1, body2);
        forces[id1].add(force);
        forces[id2].add(force.clone().multiplyScalar(-1));
      }
    }

    for (const [id, body] of bodyEntries) {
      if (body.type === "sun") continue;
      const netForce = forces[id];
      const updated = updateCelestialBody(body, netForce, dt);
      draftState.celestialBodies[
        id as keyof typeof draftState.celestialBodies
      ] = updated;
    }
  });
};
