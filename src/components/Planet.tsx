"use client";

import { Sphere } from "@react-three/drei";
import React, { useRef, forwardRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { CelestialBodyState } from "@/lib/domain/game.types";

export interface PlanetProps {
  celestialBody: CelestialBodyState;
}

const PLANET_COLORS: Record<string, string> = {
  Earth: "#4A90E2",
  Mars: "#D06A3A",
  Default: "#808080",
};

const getPlanetColor = (name: string): string => {
  return PLANET_COLORS[name] || PLANET_COLORS["Default"];
};

const Planet = forwardRef<THREE.Group, PlanetProps>(
  ({ celestialBody }, ref) => {
    const { position, radius, name } = celestialBody;
    const meshRef = useRef<THREE.Mesh>(null!);

    useLayoutEffect(() => {
      const currentRef = typeof ref === "function" ? null : ref?.current;
      if (currentRef) {
        currentRef.position.set(position.x, position.y, position.z);
      }
    }, [position, ref]);

    const planetColor = getPlanetColor(name);

    return (
      <group ref={ref} name={`planet-${name}`}>
        <Sphere ref={meshRef} args={[radius, 32, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            color={planetColor}
            metalness={0.1}
            roughness={0.7}
          />
        </Sphere>
      </group>
    );
  },
);

Planet.displayName = "Planet";

export default Planet;
