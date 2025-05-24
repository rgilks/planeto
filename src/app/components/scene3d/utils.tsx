import React from "react";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

export const blendColor = (
  color1: string,
  color2: string,
  t: number,
): string => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t).getStyle();
};

export const randomColor = (): string => {
  const colors = [
    "deepskyblue",
    "limegreen",
    "orange",
    "violet",
    "red",
    "yellow",
    "aqua",
    "pink",
    "white",
    "gold",
    "saddlebrown",
    "slateblue",
    "crimson",
    "teal",
    "coral",
    "indigo",
    "khaki",
    "plum",
    "salmon",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const seededRandom = (seed: number): (() => number) => {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
};

export const randomRadius = (): number => {
  const min = 0.3;
  const max = 8;
  const alpha = 3.2;
  return Math.pow(
    Math.random() * (Math.pow(max, 1 - alpha) - Math.pow(min, 1 - alpha)) +
      Math.pow(min, 1 - alpha),
    1 / (1 - alpha),
  );
};

export const generateBumpMap = (seed: number): THREE.CanvasTexture | null => {
  const size = 128;
  const noise2D = createNoise2D(seededRandom(seed));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      let n = 0;
      let amp = 1;
      let freq = 1;
      for (let o = 0; o < 5; o++) {
        n += amp * noise2D(nx * freq * 4, ny * freq * 4);
        amp *= 0.5;
        freq *= 2;
      }
      n = n / 2.5;
      const v = Math.floor((n + 1) * 0.5 * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
};

export const generateColorMap = (
  seed: number,
  baseColor: string,
  altColor: string,
): THREE.CanvasTexture => {
  const size = 128;
  const noise2D = createNoise2D(seededRandom(seed));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const white = document.createElement("canvas");
    white.width = white.height = 1;
    const wctx = white.getContext("2d");
    if (wctx) {
      wctx.fillStyle = "white";
      wctx.fillRect(0, 0, 1, 1);
    }
    return new THREE.CanvasTexture(white);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      let n = 0;
      let amp = 1;
      let freq = 1;
      for (let o = 0; o < 5; o++) {
        n += amp * noise2D(nx * freq * 4, ny * freq * 4);
        amp *= 0.5;
        freq *= 2;
      }
      n = n / 2.5;
      let t = (n + 1) * 0.5;
      const band = Math.abs(Math.sin(ny * Math.PI * 6 + seed));
      t = t * 0.7 + band * 0.3;
      const color = blendColor(baseColor, altColor, t);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
};

export const getGeometry = (
  type: "sphere" | "lowpoly" | "oblate",
  radius: number,
): React.ReactNode => {
  if (type === "lowpoly") return <icosahedronGeometry args={[radius, 1]} />;
  if (type === "oblate") return <sphereGeometry args={[radius, 24, 16]} />;
  return <sphereGeometry args={[radius, 32, 32]} />;
};
