import { useState, useEffect } from "react";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

import {
  blendColor,
  generateColorMap,
  randomColor,
  randomRadius,
  seededRandom,
} from "./utils";

import type { Planet, Moon as MoonType } from "../../../lib/domainTypes/planet";

export const G = 1; // Export G

export const usePlanetData = (bumpMaps: THREE.Texture[] | null): Planet[] => {
  const [planets, setPlanets] = useState<Planet[]>([]);

  useEffect(() => {
    if (!bumpMaps || bumpMaps.length === 0) return;

    const N = 20;
    const sizeMultiplier = 7;
    const centralRadius = 8.5 + Math.random() * 1.5;

    const generatePlanets = (): Planet[] => [
      (() => {
        const radius = centralRadius * 2;
        const mass = Math.pow(radius, 3) * (8 + Math.random() * 2) * 2;
        const baseColor = "gold";
        const altColor = "white";
        const seed = Math.random() * 10000;
        const bumpMap = bumpMaps[Math.floor(Math.random() * bumpMaps.length)];
        const colorMap = generateColorMap(seed, baseColor, altColor);
        const metalness = 0.7;
        const roughness = 0.2;
        const ringColor = blendColor(baseColor, altColor, 0.8);
        const ringInner = radius * 1.3;
        const ringOuter = ringInner + radius * 0.3;
        const generatedMoons: MoonType[] = [];
        const atmosphereColor = blendColor(baseColor, "white", 0.7);
        const atmosphereLayers = [
          {
            color: atmosphereColor,
            opacity: 0.5,
            scale: 1.18,
            additive: true,
          },
        ];
        const geometryType = "sphere" as const;
        const angularVelocity: [number, number, number] = [0, 0.1, 0];

        return {
          mass,
          radius,
          position: [0, 0, 0] as [number, number, number],
          velocity: [0, 0, 0] as [number, number, number],
          color: blendColor(baseColor, altColor, 0.7),
          id: "sun",
          bumpMap,
          colorMap,
          metalness,
          roughness,
          hasRing: false,
          ringColor,
          ringInner,
          ringOuter,
          moons: generatedMoons,
          atmosphereColor,
          atmosphereLayers,
          geometryType,
          angularVelocity,
        };
      })(),
      ...Array.from({ length: N - 1 }).map(() => {
        const radius = randomRadius() * sizeMultiplier;
        const mass = Math.pow(radius, 3) * (6 + Math.random() * 2);
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.random() * 60 + 20;
        const z = (Math.random() - 0.5) * (Math.random() * 18 + 2);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const vMag = 5 * Math.sqrt((G * 50) / r); // Assuming G is accessible or passed in
        const vx = -vMag * Math.sin(angle);
        const vy = vMag * Math.cos(angle);
        const vz = (Math.random() - 0.5) * 0.5 * (radius < 1.2 ? 1 : 0.2);
        const seed = Math.random() * 10000;
        const noise2D = createNoise2D(seededRandom(seed));
        const band = Math.abs(noise2D(Math.sin(angle), Math.cos(angle)));
        const baseColor = randomColor();
        const altColor = randomColor();
        const color = blendColor(baseColor, altColor, band * 0.7);
        const bumpMap = bumpMaps[Math.floor(Math.random() * bumpMaps.length)];
        const colorMap = generateColorMap(seed, baseColor, altColor);
        const metalness = Math.random() * 0.5 + 0.1;
        const roughness = Math.random() * 0.5 + 0.3;
        const isLarge = radius > 2.2;
        const hasRing = isLarge ? Math.random() < 0.5 : Math.random() < 0.12;
        const ringColor = blendColor(
          baseColor,
          altColor,
          0.5 + Math.random() * 0.5,
        );
        const ringInner = radius * (1.2 + Math.random() * 0.2);
        const ringOuter = ringInner + radius * (0.2 + Math.random() * 0.3);
        const moonCount = isLarge
          ? Math.floor(Math.random() * 3) + 1
          : Math.random() < 0.12
            ? 1
            : 0;
        const generatedMoons: MoonType[] = Array.from(
          { length: moonCount },
          (_, mi) => ({
            radius: radius * (0.12 + Math.random() * 0.09),
            color: randomColor(),
            orbitRadius: radius * (2.2 + Math.random() * 1.5 + mi * 0.7),
            orbitSpeed: 0.2 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
          }),
        );
        const atmosphereColor = blendColor(
          baseColor,
          "white",
          0.5 + Math.random() * 0.3,
        );
        const atmosphereLayers = [
          {
            color: atmosphereColor,
            opacity: 0.18 + Math.random() * 0.12 + (isLarge ? 0.1 : 0),
            scale: 1.08 + Math.random() * 0.04 + (isLarge ? 0.04 : 0),
          },
          {
            color: blendColor(atmosphereColor, "white", 0.5),
            opacity: 0.08 + Math.random() * 0.07 + (isLarge ? 0.05 : 0),
            scale: 1.13 + Math.random() * 0.06 + (isLarge ? 0.05 : 0),
          },
          {
            color: blendColor(atmosphereColor, "aqua", 0.5),
            opacity: 0.04 + Math.random() * 0.05 + (isLarge ? 0.04 : 0),
            scale: 1.18 + Math.random() * 0.08 + (isLarge ? 0.07 : 0),
            additive: true,
          },
        ];
        const geometryType = (
          Math.random() < 0.12
            ? "lowpoly"
            : Math.random() < 0.18
              ? "oblate"
              : "sphere"
        ) as "sphere" | "lowpoly" | "oblate";
        let spinMag = 0.1 + Math.random() * (0.7 / radius);
        spinMag *= 20;
        if (radius > 5) spinMag = Math.min(spinMag, 1.2);
        const spinAxis = new THREE.Vector3(
          Math.random(),
          Math.random(),
          Math.random(),
        ).normalize();
        const angularVelocity = [
          spinAxis.x * spinMag,
          spinAxis.y * spinMag,
          spinAxis.z * spinMag,
        ] as [number, number, number];

        return {
          mass,
          radius,
          position: [x, y, z] as [number, number, number],
          velocity: [vx, vy, vz] as [number, number, number],
          color,
          id: Math.random().toString(36).slice(2),
          bumpMap,
          colorMap,
          metalness,
          roughness,
          hasRing,
          ringColor,
          ringInner,
          ringOuter,
          moons: generatedMoons,
          atmosphereColor,
          atmosphereLayers,
          geometryType,
          angularVelocity,
        };
      }),
    ];

    setPlanets(generatePlanets());
  }, [bumpMaps]);

  return planets;
};
