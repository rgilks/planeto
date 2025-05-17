"use client";

import { Sphere } from "@react-three/drei";
import React, { useRef, forwardRef, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { CelestialBodyState } from "@/lib/domain/game.types";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";

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

const Planet = forwardRef<RapierRigidBody, PlanetProps>(
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

      // Generate base colors for the planet using the seeded random function
      const baseR = Math.floor(randomFn() * 256);
      const baseG = Math.floor(randomFn() * 256);
      const baseB = Math.floor(randomFn() * 256);

      // Determine a secondary color with some contrast
      const secondaryR = (baseR + 128 + Math.floor(randomFn() * 50 - 25)) % 256;
      const secondaryG = (baseG + 128 + Math.floor(randomFn() * 50 - 25)) % 256;
      const secondaryB = (baseB + 128 + Math.floor(randomFn() * 50 - 25)) % 256;

      const waterR = Math.floor(randomFn() * 50); // Darker, bluish for water
      const waterG = Math.floor(randomFn() * 80 + 20);
      const waterB = Math.floor(randomFn() * 100 + 100);

      const landR = baseR;
      const landG = baseG;
      const landB = baseB;

      const mountainR = secondaryR;
      const mountainG = secondaryG;
      const mountainB = secondaryB;

      const snowR = 200 + Math.floor(randomFn() * 55);
      const snowG = 200 + Math.floor(randomFn() * 55);
      const snowB = 200 + Math.floor(randomFn() * 55);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u = x / width;
          const v = y / height;

          let noiseValue = 0;
          let frequency = 1 + randomFn() * 3; // Randomize initial frequency
          let amplitude = 1;
          let maxAmplitude = 0;
          const octaves = 3 + Math.floor(randomFn() * 3); // Randomize number of octaves

          for (let i = 0; i < octaves; i++) {
            noiseValue += noise2D(u * frequency, v * frequency) * amplitude;
            maxAmplitude += amplitude;
            amplitude *= 0.4 + randomFn() * 0.2; // Randomize amplitude falloff
            frequency *= 1.8 + randomFn() * 0.4; // Randomize frequency increase
          }
          noiseValue /= maxAmplitude;
          noiseValue = (noiseValue + 1) / 2;

          const ptr = (y * width + x) * 4;
          let r, g, b;

          // Adjust color based on noise, using the planet's unique base colors
          const noiseFactor = 0.3 + randomFn() * 0.4; // How much noise influences color variation

          if (noiseValue < 0.35 + (randomFn() * 0.1 - 0.05)) {
            // Water
            r = waterR + Math.floor((noiseValue / 0.35) * 30 * noiseFactor);
            g = waterG + Math.floor((noiseValue / 0.35) * 40 * noiseFactor);
            b = waterB + Math.floor((noiseValue / 0.35) * 50 * noiseFactor);
          } else if (noiseValue < 0.5 + (randomFn() * 0.1 - 0.05)) {
            // Shallower water / beach
            const t = (noiseValue - 0.35) / 0.15;
            r = Math.floor(
              waterR * (1 - t) + landR * t * 0.8 + (randomFn() * 20 - 10),
            );
            g = Math.floor(
              waterG * (1 - t) + landG * t * 0.8 + (randomFn() * 20 - 10),
            );
            b = Math.floor(
              waterB * (1 - t) + landB * t * 0.8 + (randomFn() * 20 - 10),
            );
          } else if (noiseValue < 0.75 + (randomFn() * 0.1 - 0.05)) {
            // Land
            r = landR + Math.floor(noiseValue * 50 * noiseFactor - 25);
            g = landG + Math.floor(noiseValue * 50 * noiseFactor - 25);
            b = landB + Math.floor(noiseValue * 50 * noiseFactor - 25);
          } else if (noiseValue < 0.9 + (randomFn() * 0.1 - 0.05)) {
            // Mountains
            r = mountainR - Math.floor(noiseValue * 30 * noiseFactor);
            g = mountainG - Math.floor(noiseValue * 30 * noiseFactor);
            b = mountainB - Math.floor(noiseValue * 30 * noiseFactor);
          } else {
            // Snow caps / very high altitude
            r = snowR - Math.floor((1 - noiseValue) * 20 * noiseFactor);
            g = snowG - Math.floor((1 - noiseValue) * 20 * noiseFactor);
            b = snowB - Math.floor((1 - noiseValue) * 20 * noiseFactor);
          }

          // Clamp colors to 0-255 range
          data[ptr] = Math.max(0, Math.min(255, Math.floor(r)));
          data[ptr + 1] = Math.max(0, Math.min(255, Math.floor(g)));
          data[ptr + 2] = Math.max(0, Math.min(255, Math.floor(b)));
          data[ptr + 3] = 255; // Alpha
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
      if (currentRef && position) {
        currentRef.setTranslation(
          { x: position.x, y: position.y, z: position.z },
          true,
        );
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
      <RigidBody
        ref={ref}
        colliders="ball"
        type="dynamic"
        restitution={0.7}
        friction={0.5}
        name={`planet-${name}-${id}`}
        position={[position.x, position.y, position.z]}
      >
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
            position={[0, 0, 0]}
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
      </RigidBody>
    );
  },
);

Planet.displayName = "Planet";

export default Planet;
