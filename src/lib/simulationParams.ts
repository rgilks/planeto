// Centralised tuning for the procedural planet generation (usePlanetData) and
// the N-body gravity (usePhysicsSimulation). These are the knobs that define the
// simulation's character — keep them here rather than scattered through the
// generator. `{ base, range }` pairs are consumed by the `jitter` helper in
// usePlanetData as `base + random() * range`.

export type AtmosphereLayerSpec = {
  opacityBase: number;
  opacityRange: number;
  opacityLarge: number; // extra opacity for large planets
  scaleBase: number;
  scaleRange: number;
  scaleLarge: number; // extra scale for large planets
  mix?: { with: string; t: number }; // optional extra colour mix over the base
  additive?: boolean;
};

export const SIM = {
  // N-body gravity
  physics: {
    G: 1,
    impulseScale: 0.016, // ≈ one 60 fps frame, applied to the force each step
  },

  planetCount: 20,
  sizeMultiplier: 7,
  seedScale: 10000, // Math.random() * seedScale → noise/colour-map seed

  sun: {
    radius: { base: 8.5, range: 1.5, factor: 2 },
    mass: { base: 8, range: 2, factor: 2 }, // radius^3 * (base+rand*range) * factor
    colors: { base: "#200020", alt: "#400040" },
    colorBlend: 0.7,
    metalness: 0.7,
    roughness: 0.2,
    ring: { colorBlend: 0.8, innerFactor: 1.3, widthFactor: 0.3 },
    atmosphere: { colorBlend: 0.7, opacity: 0.5, scale: 1.18 },
    spinY: 0.1,
  },

  planet: {
    mass: { base: 6, range: 2 }, // radius^3 * (base+rand*range)
    orbit: { radius: { base: 40, range: 60 }, z: { base: 2, range: 18 } },
    velocity: { base: 0.8, range: 0.4, divisor: 4, zFactor: 0.1 },
    colorBandFactor: 0.7,
    metalness: { base: 0.1, range: 0.5 },
    roughness: { base: 0.3, range: 0.5 },
    largeRadius: 2.2, // radius above which a planet counts as "large"
    bigRadius: 5, // radius above which spin is clamped
    ring: {
      probLarge: 0.5,
      probSmall: 0.12,
      colorBlend: { base: 0.5, range: 0.5 },
      innerFactor: { base: 1.2, range: 0.2 },
      widthFactor: { base: 0.2, range: 0.3 },
    },
    moons: {
      maxLarge: 3, // large planets get floor(rand*maxLarge)+1 moons
      probSmall: 0.12, // small planets get one moon with this probability
      radiusFactor: { base: 0.12, range: 0.09 },
      orbitFactor: { base: 2.2, range: 1.5, step: 0.7 }, // +step per moon index
      speed: { base: 0.2, range: 0.3 },
    },
    atmosphere: {
      colorBlend: { base: 0.5, range: 0.3 },
      layers: [
        {
          opacityBase: 0.18,
          opacityRange: 0.12,
          opacityLarge: 0.1,
          scaleBase: 1.08,
          scaleRange: 0.04,
          scaleLarge: 0.04,
        },
        {
          opacityBase: 0.08,
          opacityRange: 0.07,
          opacityLarge: 0.05,
          scaleBase: 1.13,
          scaleRange: 0.06,
          scaleLarge: 0.05,
          mix: { with: "white", t: 0.5 },
        },
        {
          opacityBase: 0.04,
          opacityRange: 0.05,
          opacityLarge: 0.04,
          scaleBase: 1.18,
          scaleRange: 0.08,
          scaleLarge: 0.07,
          mix: { with: "aqua", t: 0.5 },
          additive: true,
        },
      ] as AtmosphereLayerSpec[],
    },
    geometry: { lowpolyProb: 0.12, oblateProb: 0.18 },
    spin: { base: 0.1, range: 0.7, multiplier: 20, bigMax: 1.2 },
  },
};

export const G = SIM.physics.G;
