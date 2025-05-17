"use client";

import { Sphere } from "@react-three/drei";
import React, { useRef, forwardRef, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { CelestialBodyState } from "@/lib/domain/game.types";

export interface PlanetProps {
  celestialBody: CelestialBodyState;
}

// Helper to create a seed from planet ID or name for consistent noise
const createSeedFromString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

// Seeded Pseudo-Random Number Generator (LCG)
const createLcgRandom = (seed: number): (() => number) => {
  // Parameters from a common LCG (e.g., MMIX by Donald Knuth)
  const m = 2 ** 32;
  const a = 1664525;
  const c = 1013904223;
  let currentSeed = seed;
  return () => {
    currentSeed = (a * currentSeed + c) % m;
    return currentSeed / m;
  };
};

const Planet = forwardRef<THREE.Group, PlanetProps>(
  ({ celestialBody }, ref) => {
    const { position, radius, name, id, atmosphere } = celestialBody;
    const meshRef = useRef<THREE.Mesh>(null!);
    const atmosphereRef = useRef<THREE.Mesh>(null!);

    const proceduralTexture = useMemo(() => {
      const seedValue = createSeedFromString(id);
      const randomFn = createLcgRandom(seedValue);
      const noise2D = createNoise2D(randomFn);
      const width = 256;
      const height = 128;
      const data = new Uint8Array(width * height * 4); // RGBA

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u = x / width;
          const v = y / height;

          let noiseValue = 0;
          let frequency = 2;
          let amplitude = 1;
          let maxAmplitude = 0;

          for (let i = 0; i < 4; i++) {
            // 4 octaves
            noiseValue += noise2D(u * frequency, v * frequency) * amplitude;
            maxAmplitude += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
          }
          noiseValue /= maxAmplitude;
          noiseValue = (noiseValue + 1) / 2;

          const ptr = (y * width + x) * 4;
          let r, g, b;

          if (noiseValue < 0.4) {
            r = 20;
            g = 50;
            b = 120;
          } else if (noiseValue < 0.5) {
            r = 50;
            g = 100;
            b = 180;
          } else if (noiseValue < 0.7) {
            r = 70;
            g = 140;
            b = 70;
          } else if (noiseValue < 0.85) {
            r = 130;
            g = 100;
            b = 60;
          } else {
            r = 220;
            g = 220;
            b = 230;
          }

          data[ptr] = r;
          data[ptr + 1] = g;
          data[ptr + 2] = b;
          data[ptr + 3] = 255;
        }
      }
      const texture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGBAFormat,
      );
      texture.needsUpdate = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    }, [id]);

    useLayoutEffect(() => {
      const currentRef = typeof ref === "function" ? null : ref?.current;
      if (currentRef) {
        currentRef.position.set(position.x, position.y, position.z);
      }
    }, [position, ref]);

    const atmosphereRadius = useMemo(() => {
      return atmosphere?.thickness
        ? radius * (1 + atmosphere.thickness)
        : radius * 1.05;
    }, [radius, atmosphere?.thickness]);

    const atmosphereOpacity = useMemo(() => {
      return atmosphere?.density !== undefined ? atmosphere.density * 0.7 : 0.7;
    }, [atmosphere?.density]);

    return (
      <group ref={ref} name={`planet-${name}`}>
        <Sphere ref={meshRef} args={[radius, 64, 64]} castShadow receiveShadow>
          <meshStandardMaterial
            map={proceduralTexture}
            metalness={0.1}
            roughness={0.8}
          />
        </Sphere>
        {atmosphere && (
          <Sphere
            ref={atmosphereRef}
            args={[atmosphereRadius, 64, 64]}
            receiveShadow={false}
            castShadow={false}
          >
            <meshStandardMaterial
              color={atmosphere.color || "#4A90E2"}
              transparent
              opacity={atmosphereOpacity}
              blending={THREE.AdditiveBlending}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </Sphere>
        )}
      </group>
    );
  },
);

Planet.displayName = "Planet";

export default Planet;
