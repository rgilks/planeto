# Procedural Planet Texture Generation

This document details the system used in Planeto to generate procedural textures for celestial bodies, primarily planets, when pre-defined textures are not available.

## Overview

The goal is to provide visually distinct and interesting surfaces for planets without requiring a large number of static texture assets. This is achieved by generating textures on the client-side at runtime using noise functions and hashing techniques.

## Implementation Details

- **Location:** The core logic resides in `src/lib/textureUtils.ts`, specifically within the `generatePlanetTexture` function.
- **Trigger:** This function is called from the `src/components/Planet.tsx` component if a planet's data (`CelestialBodyState`) does not include a `textureUrl`.

### Key Steps in Texture Generation:

1.  **Seeding:**

    - A `simpleHash` function (a basic string hashing algorithm) is used to derive numerical values from the planet's `name` string.
    - The `simplex-noise` library's `createNoise2D` function is seeded with a hash of the planet's name. This ensures that each planet receives a unique and deterministic noise pattern. Different aspects of the texture (colors, noise scales) use slightly different variations of the planet's name (e.g., `planetName + "_color1"`) as input to the hash function to ensure variety.

2.  **Color Palette Generation:**

    - Two base colors (`baseColor1`, `baseColor2`) are generated for each planet.
    - These colors are derived by hashing parts of the planet's name to generate HSL (Hue, Saturation, Luminosity) values. This provides a diverse range of starting colors for different planets.
    - Using `THREE.Color().setHSL()` allows for more aesthetically pleasing color generation compared to direct RGB manipulation from a hash.

3.  **Noise Parameters:**

    - `featureScale`: Controls the general size of the noise features (e.g., continents, large formations). This is varied per planet using the hash of its name.
    - `distortionScale`: Controls the amount of warping applied to the UV coordinates before sampling the primary noise. This adds organic, swirling patterns to the texture.

4.  **Pixel Generation Loop:**

    - The function iterates over each pixel of the target texture (default size 256x256).
    - **UV Distortion:** For each pixel's (u, v) coordinates, a secondary noise lookup (using `noise2D`) distorts these coordinates (`qx`, `qy`). This prevents the patterns from looking too grid-like.
    - **Primary Noise Sampling:** The distorted coordinates (`qx`, `qy`) are then used with the `featureScale` to sample the main `noiseValue` from `noise2D`.
    - **Normalization:** The noise value, typically in the range [-1, 1], is normalized to [0, 1].
    - **Color Blending:** The final color for the pixel is determined by linearly interpolating (`lerp`) between `baseColor1` and `baseColor2` using the `normalizedNoise` value as the interpolation factor.
    - The RGBA values are written into a `Uint8Array`.

5.  **Texture Creation:**
    - A `THREE.DataTexture` is created from the `Uint8Array`.
    - `texture.needsUpdate = true;` is set to ensure Three.js uploads the texture data to the GPU.
    - `texture.colorSpace = THREE.SRGBColorSpace;` is crucial for ensuring the generated colors are interpreted correctly by the Three.js rendering pipeline, leading to accurate visual output.

## Libraries Used

- **`three` (Three.js):** For `THREE.DataTexture`, `THREE.Color`, and other 3D graphics utilities.
- **`simplex-noise`:** For generating 2D Simplex noise, which forms the basis of the procedural patterns.

## Usage in `Planet.tsx`

- The `Planet` component uses `React.useMemo` to call `generatePlanetTexture(planetName)` only when the `planetName` or `textureUrl` changes.
- If `textureUrl` is present, it's prioritized using `useTexture` from `@react-three/drei`.
- If `textureUrl` is absent, the memoized `proceduralTexture` is used as the `map` for the planet's `meshStandardMaterial`.

## Potential Future Enhancements

- **Multi-layered Noise:** Combining multiple noise functions (e.g., Simplex, Perlin, Worley) at different scales and with different blending modes to create more complex features like continents, mountain ranges, craters, and oceans.
- **Biome-specific Color Palettes:** If planets were to have types (e.g., Terran, Desert, Ice), the color generation could be influenced by these types.
- **Procedural Bump/Normal Maps:** Generating `bumpMap` or `normalMap` data alongside the color texture to add physical depth and detail to the surface.
- **Configurable Texture Parameters:** Allowing certain texture generation parameters (e.g., dominant color, feature size) to be part of the `CelestialBodyState` for more fine-grained control per planet, even for procedurally generated ones.
- **Performance Optimization:** For very large numbers of planets or very high-resolution textures, explore optimizations like offloading generation to a Web Worker, though current client-side generation is generally efficient for typical use cases.
