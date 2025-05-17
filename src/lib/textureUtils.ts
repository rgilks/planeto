import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

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

export const generatePlanetTexture = (
  planetName: string,
  size = 256,
): THREE.DataTexture => {
  const data = new Uint8Array(size * size * 4); // RGBA
  const noise2D = createNoise2D(() => simpleHash(planetName) / 0xffffffff); // Seed noise with planet name

  const baseColor1 = new THREE.Color().setHSL(
    (simpleHash(planetName + "_color1") % 1000) / 1000,
    0.5 + (simpleHash(planetName + "_sat1") % 50) / 100,
    0.4 + (simpleHash(planetName + "_lum1") % 30) / 100,
  );
  const baseColor2 = new THREE.Color().setHSL(
    (simpleHash(planetName + "_color2") % 1000) / 1000,
    0.5 + (simpleHash(planetName + "_sat2") % 50) / 100,
    0.5 + (simpleHash(planetName + "_lum2") % 30) / 100,
  );

  const featureScale = 5 + (simpleHash(planetName + "_scale") % 10); // Vary feature size
  const distortionScale = 0.5 + (simpleHash(planetName + "_dist") % 100) / 100; // Vary distortion

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Apply some distortion to UVs for more organic patterns
      const qx =
        u +
        distortionScale *
          noise2D(u * featureScale * 0.3, v * featureScale * 0.3 + 10.3);
      const qy =
        v +
        distortionScale *
          noise2D(u * featureScale * 0.3 + 5.7, v * featureScale * 0.3 + 3.1);

      const noiseValue = noise2D(qx * featureScale, qy * featureScale);
      const normalizedNoise = (noiseValue + 1) / 2; // Normalize to 0-1

      const finalColor = baseColor1.clone().lerp(baseColor2, normalizedNoise);

      const idx = (y * size + x) * 4;
      data[idx + 0] = finalColor.r * 255;
      data[idx + 1] = finalColor.g * 255;
      data[idx + 2] = finalColor.b * 255;
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space
  return texture;
};
