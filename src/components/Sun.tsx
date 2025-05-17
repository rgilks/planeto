import React, { forwardRef, useLayoutEffect, useRef } from "react";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { CelestialBodyState } from "@/lib/domain/game.types";

export interface SunProps {
  celestialBody: CelestialBodyState;
}

const Sun = forwardRef<THREE.Group, SunProps>(({ celestialBody }, ref) => {
  const { position, radius, name } = celestialBody;
  const meshRef = useRef<THREE.Mesh>(null!); // Ref for the sphere mesh itself

  useLayoutEffect(() => {
    const currentRef = typeof ref === "function" ? null : ref?.current;
    if (currentRef) {
      currentRef.position.set(position.x, position.y, position.z);
    }
  }, [position, ref]);

  // The sun itself should be bright and not cast shadows in a simple setup,
  // but it can receive shadows if other objects cast them (though unlikely here).
  return (
    <group ref={ref} name={`sun-${name}`}>
      <Sphere
        ref={meshRef}
        args={[radius, 32, 32]}
        castShadow={false}
        receiveShadow
      >
        <meshStandardMaterial
          color="#FFFF00" // Bright yellow
          emissive="#FFFF00" // Make it glow
          emissiveIntensity={1.5} // Adjust glow intensity
          metalness={0.2}
          roughness={0.8}
        />
      </Sphere>
      {/* Optional: Add a point light at the sun's position */}
      {/* <pointLight intensity={2} distance={radius * 50} decay={2} color="#FFFFFF" /> */}
    </group>
  );
});

Sun.displayName = "Sun";

export default Sun;
