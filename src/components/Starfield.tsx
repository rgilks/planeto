"use client";

import React, { useMemo } from "react";

import { Points, PointMaterial } from "@react-three/drei";

interface StarfieldProps {
  count?: number;
  radius?: number;
}

export const Starfield = ({ count = 5000, radius = 1000 }: StarfieldProps) => {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute points randomly in a sphere
      const r = radius * Math.cbrt(Math.random()); // Correct distribution in a sphere
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, [count, radius]);

  return (
    <Points positions={points} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.015} // Adjust size as needed
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
};

export default Starfield;
