import { useEffect, RefObject } from "react";

import { G } from "./usePlanetData"; // Adjusted path (sibling hook)

import type { Planet } from "../lib/domainTypes/planet"; // Adjusted path
import type { RapierRigidBody } from "@react-three/rapier";

type RigidBodyRef = RefObject<RapierRigidBody | null>;

export const usePhysicsSimulation = (
  planets: Planet[],
  planetRefs: RefObject<RigidBodyRef[]>, // Ref to the array of refs
): void => {
  useEffect(() => {
    let frame: number;

    const step = () => {
      if (
        planets.length === 0 ||
        !planetRefs.current ||
        planetRefs.current.length === 0
      )
        return;

      for (let i = 0; i < planetRefs.current.length; i++) {
        const planetRef = planetRefs.current[i];
        const currentPlanet = planets[i];

        if (
          !planetRef?.current ||
          typeof planetRef.current.translation !== "function" ||
          !currentPlanet
        ) {
          continue;
        }

        const planetPos = planetRef.current.translation();
        if (!planetPos || currentPlanet.id === "sun") {
          continue;
        }

        let fx = 0;
        let fy = 0;
        let fz = 0;

        for (let j = 0; j < planetRefs.current.length; j++) {
          if (i === j) continue;

          const otherPlanetRef = planetRefs.current[j];
          const otherPlanet = planets[j];

          if (
            !otherPlanetRef?.current ||
            typeof otherPlanetRef.current.translation !== "function" ||
            !otherPlanet
          ) {
            continue;
          }

          const otherPos = otherPlanetRef.current.translation();
          if (!otherPos) continue;

          const dx = otherPos.x - planetPos.x;
          const dy = otherPos.y - planetPos.y;
          const dz = otherPos.z - planetPos.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq === 0) continue; // Avoid division by zero if planets are at the exact same spot
          const dist = Math.sqrt(distSq);

          if (dist < currentPlanet.radius * 2) continue;

          const forceMag = (G * otherPlanet.mass * currentPlanet.mass) / distSq;
          fx += (dx / dist) * forceMag;
          fy += (dy / dist) * forceMag;
          fz += (dz / dist) * forceMag;
        }

        planetRef.current.applyImpulse(
          { x: fx * 0.016, y: fy * 0.016, z: fz * 0.016 },
          true,
        );
      }
      frame = requestAnimationFrame(step);
    };

    if (
      planets.length > 0 &&
      planetRefs.current &&
      planetRefs.current.length > 0
    ) {
      frame = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(frame);
  }, [planets, planetRefs]);
};
