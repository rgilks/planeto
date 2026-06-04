import { useState, useEffect } from "react";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

import { SIM, G } from "@/lib/simulationParams";
import {
  blendColor,
  generateColorMap,
  randomColor,
  randomRadius,
  seededRandom,
} from "@/lib/utils";

import type { Planet, Moon as MoonType } from "@/domain";

// base + Math.random() * range — exactly one RNG draw.
const jitter = (s: { base: number; range: number }): number =>
  s.base + Math.random() * s.range;

export const usePlanetData = (bumpMaps: THREE.Texture[] | null): Planet[] => {
  const [planets, setPlanets] = useState<Planet[]>([]);

  useEffect(() => {
    if (!bumpMaps || bumpMaps.length === 0) return;

    const { sun: S, planet: P } = SIM;

    const sunData = (() => {
      const radius = jitter(S.radius) * S.radius.factor;
      const mass = Math.pow(radius, 3) * jitter(S.mass) * S.mass.factor;
      const baseColor = S.colors.base;
      const altColor = S.colors.alt;
      const seed = Math.random() * SIM.seedScale;
      const bumpMap = bumpMaps[Math.floor(Math.random() * bumpMaps.length)];
      const colorMap = generateColorMap(seed, baseColor, altColor);
      const ringInner = radius * S.ring.innerFactor;
      const atmosphereColor = blendColor(
        baseColor,
        "white",
        S.atmosphere.colorBlend,
      );

      return {
        mass,
        radius,
        position: [0, 0, 0] as [number, number, number],
        velocity: [0, 0, 0] as [number, number, number],
        color: blendColor(baseColor, altColor, S.colorBlend),
        id: "sun",
        bumpMap,
        colorMap,
        metalness: S.metalness,
        roughness: S.roughness,
        hasRing: false,
        ringColor: blendColor(baseColor, altColor, S.ring.colorBlend),
        ringInner,
        ringOuter: ringInner + radius * S.ring.widthFactor,
        moons: [] as MoonType[],
        atmosphereColor,
        atmosphereLayers: [
          {
            color: atmosphereColor,
            opacity: S.atmosphere.opacity,
            scale: S.atmosphere.scale,
            additive: true,
          },
        ],
        geometryType: "sphere" as const,
        angularVelocity: [0, S.spinY, 0] as [number, number, number],
        isDarkSun: true,
      };
    })();

    const generatePlanets = (): Planet[] => [
      sunData,
      ...Array.from({ length: SIM.planetCount - 1 }).map(() => {
        const radius = randomRadius() * SIM.sizeMultiplier;
        const mass = Math.pow(radius, 3) * jitter(P.mass);
        const angle = Math.random() * 2 * Math.PI;
        const r = jitter(P.orbit.radius);
        const z = (Math.random() - 0.5) * jitter(P.orbit.z);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const vMag =
          (Math.sqrt((G * sunData.mass) / r) * jitter(P.velocity)) /
          P.velocity.divisor;
        const vx = -vMag * Math.sin(angle);
        const vy = vMag * Math.cos(angle);
        const vz = (Math.random() - 0.5) * P.velocity.zFactor * vMag;
        const seed = Math.random() * SIM.seedScale;
        const noise2D = createNoise2D(seededRandom(seed));
        const band = Math.abs(noise2D(Math.sin(angle), Math.cos(angle)));
        const baseColor = randomColor();
        const altColor = randomColor();
        const color = blendColor(baseColor, altColor, band * P.colorBandFactor);
        const bumpMap = bumpMaps[Math.floor(Math.random() * bumpMaps.length)];
        const colorMap = generateColorMap(seed, baseColor, altColor);
        const metalness = jitter(P.metalness);
        const roughness = jitter(P.roughness);
        const isLarge = radius > P.largeRadius;
        const hasRing = isLarge
          ? Math.random() < P.ring.probLarge
          : Math.random() < P.ring.probSmall;
        const ringColor = blendColor(
          baseColor,
          altColor,
          jitter(P.ring.colorBlend),
        );
        const ringInner = radius * jitter(P.ring.innerFactor);
        const ringOuter = ringInner + radius * jitter(P.ring.widthFactor);
        const moonCount = isLarge
          ? Math.floor(Math.random() * P.moons.maxLarge) + 1
          : Math.random() < P.moons.probSmall
            ? 1
            : 0;
        const generatedMoons: MoonType[] = Array.from(
          { length: moonCount },
          (_, mi) => ({
            radius: radius * jitter(P.moons.radiusFactor),
            color: randomColor(),
            orbitRadius:
              radius *
              (jitter(P.moons.orbitFactor) + mi * P.moons.orbitFactor.step),
            orbitSpeed: jitter(P.moons.speed),
            phase: Math.random() * Math.PI * 2,
          }),
        );
        const atmosphereColor = blendColor(
          baseColor,
          "white",
          jitter(P.atmosphere.colorBlend),
        );
        const atmosphereLayers = P.atmosphere.layers.map((layer) => ({
          color: layer.mix
            ? blendColor(atmosphereColor, layer.mix.with, layer.mix.t)
            : atmosphereColor,
          opacity:
            layer.opacityBase +
            Math.random() * layer.opacityRange +
            (isLarge ? layer.opacityLarge : 0),
          scale:
            layer.scaleBase +
            Math.random() * layer.scaleRange +
            (isLarge ? layer.scaleLarge : 0),
          ...(layer.additive ? { additive: true } : {}),
        }));
        const geometryType = (
          Math.random() < P.geometry.lowpolyProb
            ? "lowpoly"
            : Math.random() < P.geometry.oblateProb
              ? "oblate"
              : "sphere"
        ) as "sphere" | "lowpoly" | "oblate";
        let spinMag = P.spin.base + Math.random() * (P.spin.range / radius);
        spinMag *= P.spin.multiplier;
        if (radius > P.bigRadius) spinMag = Math.min(spinMag, P.spin.bigMax);
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
