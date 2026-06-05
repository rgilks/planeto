import { useState, useEffect } from "react";
import { createNoise2D } from "simplex-noise";
import { Vector3, type Texture } from "three";

import { SIM, G } from "@/lib/simulationParams";
import {
  blendColor,
  generateBumpMap,
  generateColorMap,
  randomColor,
  randomRadius,
  seededRandom,
} from "@/lib/utils";

import type { Planet, Moon as MoonType } from "@/domain";

// Number of distinct bump maps; each planet picks one by index.
const BUMP_COUNT = 5;

// A planet with everything except its textures, plus the inputs needed to
// build them.
type PlanetSpec = {
  planet: Omit<Planet, "bumpMap" | "colorMap">;
  bumpIndex: number;
  seed: number;
  baseColor: string;
  altColor: string;
};

// base + Math.random() * range — exactly one RNG draw.
const jitter = (s: { base: number; range: number }): number =>
  s.base + Math.random() * s.range;

// Build the planet cluster's properties synchronously. The Math.random draw
// order here defines the whole scene, so it stays intact; textures (which use
// seededRandom, not Math.random) are generated separately, so deferring them
// does not perturb the cluster.
const generateSpecs = (): PlanetSpec[] => {
  const { sun: S, planet: P } = SIM;

  const sunSpec = ((): PlanetSpec => {
    const radius = jitter(S.radius) * S.radius.factor;
    const mass = Math.pow(radius, 3) * jitter(S.mass) * S.mass.factor;
    const baseColor = S.colors.base;
    const altColor = S.colors.alt;
    const seed = Math.random() * SIM.seedScale;
    const bumpIndex = Math.floor(Math.random() * BUMP_COUNT);
    const ringInner = radius * S.ring.innerFactor;
    const atmosphereColor = blendColor(
      baseColor,
      "white",
      S.atmosphere.colorBlend,
    );

    return {
      planet: {
        mass,
        radius,
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        color: blendColor(baseColor, altColor, S.colorBlend),
        id: "sun",
        metalness: S.metalness,
        roughness: S.roughness,
        hasRing: false,
        ringColor: blendColor(baseColor, altColor, S.ring.colorBlend),
        ringInner,
        ringOuter: ringInner + radius * S.ring.widthFactor,
        moons: [],
        atmosphereColor,
        atmosphereLayers: [
          {
            color: atmosphereColor,
            opacity: S.atmosphere.opacity,
            scale: S.atmosphere.scale,
            additive: true,
          },
        ],
        geometryType: "sphere",
        angularVelocity: [0, S.spinY, 0],
        isDarkSun: true,
      },
      bumpIndex,
      seed,
      baseColor,
      altColor,
    };
  })();

  const planetSpecs = Array.from(
    { length: SIM.planetCount - 1 },
    (): PlanetSpec => {
      const radius = randomRadius() * SIM.sizeMultiplier;
      const mass = Math.pow(radius, 3) * jitter(P.mass);
      const angle = Math.random() * 2 * Math.PI;
      const r = jitter(P.orbit.radius);
      const z = (Math.random() - 0.5) * jitter(P.orbit.z);
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      const vMag =
        (Math.sqrt((G * sunSpec.planet.mass) / r) * jitter(P.velocity)) /
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
      const bumpIndex = Math.floor(Math.random() * BUMP_COUNT);
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
      const spinAxis = new Vector3(
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
        planet: {
          mass,
          radius,
          position: [x, y, z],
          velocity: [vx, vy, vz],
          color,
          id: Math.random().toString(36).slice(2),
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
        },
        bumpIndex,
        seed,
        baseColor,
        altColor,
      };
    },
  );

  return [sunSpec, ...planetSpecs];
};

// Yield to the event loop so the browser can paint/respond between texture
// builds — generation stays on the main thread but no longer freezes it.
const yieldToLoop = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const usePlanetData = (): Planet[] => {
  const [planets, setPlanets] = useState<Planet[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const specs = generateSpecs();

      const bumpTextures: Texture[] = [];
      for (let i = 0; i < BUMP_COUNT; i++) {
        const tex = generateBumpMap();
        if (tex) bumpTextures.push(tex);
        await yieldToLoop();
        if (cancelled) return;
      }
      if (bumpTextures.length === 0) return;

      const built: Planet[] = [];
      for (const s of specs) {
        built.push({
          ...s.planet,
          bumpMap: bumpTextures[s.bumpIndex % bumpTextures.length],
          colorMap: generateColorMap(s.seed, s.baseColor, s.altColor),
        });
        await yieldToLoop();
        if (cancelled) return;
      }

      setPlanets(built);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return planets;
};
