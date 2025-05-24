import { useEffect, RefObject } from "react";

import { G } from "./usePlanetData"; // Adjusted path (sibling hook)

import type { Planet } from "../lib/domainTypes/planet"; // Adjusted path
import type { RapierRigidBody } from "@react-three/rapier";

type RigidBodyRef = RefObject<RapierRigidBody | null>;

export const usePhysicsSimulation = (
  planets: Planet[],
  planetRefs: RefObject<RigidBodyRef[]>,
): void => {
  useEffect(() => {
    let frameId: number | undefined = undefined;

    const step = () => {
      let allRefsReady = false;
      if (
        planets.length > 0 &&
        planetRefs.current &&
        planetRefs.current.length === planets.length
      ) {
        allRefsReady = true;
        for (let i = 0; i < planets.length; i++) {
          if (!planetRefs.current[i] || !planetRefs.current[i].current) {
            allRefsReady = false;
            break;
          }
        }
      }

      if (allRefsReady) {
        for (let i = 0; i < planets.length; i++) {
          const planetRef = planetRefs.current![i]; // Known to be non-null due to allRefsReady
          const currentPlanet = planets[i];

          if (!planetRef.current || currentPlanet.id === "sun") {
            continue;
          }

          const planetPos = planetRef.current.translation();
          if (!planetPos) {
            continue;
          }

          let fx = 0;
          let fy = 0;
          let fz = 0;

          for (let j = 0; j < planets.length; j++) {
            if (i === j) continue;

            const otherPlanetRef = planetRefs.current![j]; // Known to be non-null
            const otherPlanet = planets[j];

            if (!otherPlanetRef.current) {
              continue;
            }

            const otherPos = otherPlanetRef.current.translation();
            if (!otherPos) continue;

            const dx = otherPos.x - planetPos.x;
            const dy = otherPos.y - planetPos.y;
            const dz = otherPos.z - planetPos.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq === 0) continue;
            const dist = Math.sqrt(distSq);

            // Re-add this check from the likely "great awhile back" state
            if (
              currentPlanet.radius &&
              otherPlanet.radius &&
              dist < currentPlanet.radius + otherPlanet.radius
            )
              continue;

            const forceMag =
              (G * otherPlanet.mass * currentPlanet.mass) / distSq;
            fx += (dx / dist) * forceMag;
            fy += (dy / dist) * forceMag;
            fz += (dz / dist) * forceMag;
          }

          planetRef.current.applyImpulse(
            { x: fx * 0.016, y: fy * 0.016, z: fz * 0.016 },
            true,
          );
        }
      }
      frameId = requestAnimationFrame(step);
    };

    if (planets.length > 0) {
      frameId = requestAnimationFrame(step);
    } else {
      // Ensure frame is cancelled if planets array becomes empty
      if (frameId !== undefined) cancelAnimationFrame(frameId);
    }

    return () => {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
    };
  }, [planets, planetRefs]); // planetRefs object itself is stable, G is a constant from outside.
};
