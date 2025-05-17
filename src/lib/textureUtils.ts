import * as THREE from "three";
import { createNoise2D, type NoiseFunction2D } from "simplex-noise";

// Simple hash function to get a number from a string
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Helper to create a seeded noise function
const createSeededNoise = (seedStr: string): NoiseFunction2D => {
  return createNoise2D(() => simpleHash(seedStr) / 0xffffffff);
};

// Define color palettes based on a base hue
interface PlanetColors {
  deepWater: THREE.Color;
  shallowWater: THREE.Color;
  sand: THREE.Color;
  land: THREE.Color;
  mountains: THREE.Color;
}

const generatePlanetColors = (planetName: string): PlanetColors => {
  const baseHue = (simpleHash(planetName + "_hue") % 1000) / 1000;
  const satVar = (simpleHash(planetName + "_satVar") % 20) / 100; // 0 to 0.2
  const lumVar = (simpleHash(planetName + "_lumVar") % 20) / 100; // 0 to 0.2

  return {
    deepWater: new THREE.Color().setHSL(
      baseHue,
      0.6 + satVar,
      0.2 + lumVar * 0.5,
    ),
    shallowWater: new THREE.Color().setHSL(
      baseHue,
      0.55 + satVar,
      0.4 + lumVar * 0.7,
    ),
    sand: new THREE.Color().setHSL(
      (baseHue + 0.1) % 1.0,
      0.4 + satVar,
      0.6 + lumVar,
    ),
    land: new THREE.Color().setHSL(
      (baseHue + 0.25) % 1.0,
      0.5 + satVar,
      0.5 + lumVar,
    ),
    mountains: new THREE.Color().setHSL(
      (baseHue + 0.05) % 1.0,
      0.35 + satVar * 0.5,
      0.65 + lumVar,
    ),
  };
};

export interface GeneratedPlanetTextures {
  map: THREE.DataTexture;
  bumpMap: THREE.DataTexture;
}

export const generatePlanetTexture = (
  planetName: string,
  size = 256,
): GeneratedPlanetTextures => {
  const colorData = new Uint8Array(size * size * 4); // RGBA for color map
  const bumpData = new Uint8Array(size * size * 1); // R channel for bump map (height)
  const colors = generatePlanetColors(planetName);

  const noiseBase = createSeededNoise(planetName + "_base");
  const noiseDetail = createSeededNoise(planetName + "_detail");
  const noiseFine = createSeededNoise(planetName + "_fine");

  // Vary scales based on planet name for more diversity
  const baseFeatureScale = 2 + (simpleHash(planetName + "_baseScale") % 5); // 2-6
  const detailFeatureScale = 5 + (simpleHash(planetName + "_detailScale") % 10); // 5-14
  const fineFeatureScale = 15 + (simpleHash(planetName + "_fineScale") % 15); // 15-29

  const distortion1 = createSeededNoise(planetName + "_dist1");
  const distortionScale1 =
    0.2 + (simpleHash(planetName + "_dScale1") % 30) / 100; // 0.2 to 0.5

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // UV distortion for more organic patterns
      const distValX = distortion1(u * 2, v * 2) * distortionScale1;
      const distValY = distortion1(u * 2 + 5.3, v * 2 + 1.7) * distortionScale1;
      const u1 = u + distValX;
      const v1 = v + distValY;

      // Base elevation noise (continents/oceans)
      let elevation =
        (noiseBase(u1 * baseFeatureScale, v1 * baseFeatureScale) + 1) / 2; // 0-1

      // Detail noise (regional variations)
      const detailNoise =
        (noiseDetail(u1 * detailFeatureScale, v1 * detailFeatureScale) + 1) / 2; // 0-1
      elevation = elevation * 0.7 + detailNoise * 0.3; // Combine base and detail

      // Fine noise (surface texture)
      const fineNoise =
        (noiseFine(u * fineFeatureScale, v * fineFeatureScale) + 1) / 2; // 0-1

      const finalColor = new THREE.Color();

      if (elevation < 0.35) {
        finalColor.lerpColors(
          colors.deepWater,
          colors.shallowWater,
          elevation / 0.35,
        );
      } else if (elevation < 0.45) {
        finalColor.lerpColors(
          colors.shallowWater,
          colors.sand,
          (elevation - 0.35) / 0.1,
        );
      } else if (elevation < 0.7) {
        finalColor.lerpColors(
          colors.sand,
          colors.land,
          (elevation - 0.45) / 0.25,
        );
      } else {
        finalColor.lerpColors(
          colors.land,
          colors.mountains,
          Math.min((elevation - 0.7) / 0.3, 1.0),
        );
      }

      // Apply fine noise as a subtle luminosity variation
      const lumOffset = (fineNoise - 0.5) * 0.1; // -0.05 to 0.05
      const hsl = { h: 0, s: 0, l: 0 };
      finalColor.getHSL(hsl);
      finalColor.setHSL(
        hsl.h,
        hsl.s,
        Math.max(0, Math.min(1, hsl.l + lumOffset)),
      );

      const idx = (y * size + x) * 4;
      colorData[idx + 0] = finalColor.r * 255;
      colorData[idx + 1] = finalColor.g * 255;
      colorData[idx + 2] = finalColor.b * 255;
      colorData[idx + 3] = 255;

      // Use combined elevation for bump map. Higher values = bumps.
      // We can scale this or use a different noise for more control if needed.
      bumpData[idx] = elevation * 255;
    }
  }

  const mapTexture = new THREE.DataTexture(
    colorData,
    size,
    size,
    THREE.RGBAFormat,
  );
  mapTexture.needsUpdate = true;
  mapTexture.colorSpace = THREE.SRGBColorSpace;

  const bumpMapTexture = new THREE.DataTexture(
    bumpData,
    size,
    size,
    THREE.RedFormat,
  ); // Use RedFormat for single channel
  bumpMapTexture.needsUpdate = true;
  // No color space conversion needed for data textures like bump maps

  return { map: mapTexture, bumpMap: bumpMapTexture };
};

export const generateCloudTexture = (
  planetName: string, // For seeding, to make clouds unique per planet
  size = 256,
): THREE.DataTexture => {
  const data = new Uint8Array(size * size * 4); // RGBA
  const cloudNoise = createSeededNoise(planetName + "_clouds");
  const cloudDistortion = createSeededNoise(planetName + "_cloudDistort");

  const cloudScale = 4 + (simpleHash(planetName + "_cloudScale") % 4); // 4-7
  const distortionScale =
    0.3 + (simpleHash(planetName + "_cdScale") % 40) / 100; // 0.3 to 0.7

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Distort UVs for more natural cloud patterns
      const du =
        cloudDistortion(u * cloudScale * 0.5, v * cloudScale * 0.5) *
        distortionScale;
      const dv =
        cloudDistortion(u * cloudScale * 0.5 + 10, v * cloudScale * 0.5 + 10) *
        distortionScale;
      const u1 = u + du;
      const v1 = v + dv;

      // Base cloud noise
      let noiseVal = (cloudNoise(u1 * cloudScale, v1 * cloudScale) + 1) / 2; // 0-1

      // Sharpen the noise to create more defined cloud edges
      noiseVal = Math.pow(
        noiseVal,
        0.8 + (simpleHash(planetName + "_cloudSharp") % 5) / 10,
      ); // 0.8 to 1.2
      noiseVal = THREE.MathUtils.smoothstep(noiseVal, 0.4, 0.7); // Thresholding for clearer patches

      const cloudAlpha =
        noiseVal * (0.8 + (simpleHash(planetName + "_cloudAlpha") % 20) / 100); // Base alpha, slightly varied
      const cloudColor = 200 + noiseVal * 55; // Whiter for denser parts

      const idx = (y * size + x) * 4;
      data[idx + 0] = cloudColor; // R
      data[idx + 1] = cloudColor; // G
      data[idx + 2] = cloudColor; // B
      data[idx + 3] = cloudAlpha * 255; // Alpha
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  // No sRGB for alpha maps or purely data-driven cloud color if interpreted linearly
  return texture;
};
