import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { Moon as MoonType } from "@/domain";

export const Moon = ({ moon }: { moon: MoonType }) => {
  const ref = useRef<THREE.Mesh>(null);

  // Kinematic orbit driven directly off the shared R3F clock — no physics state.
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const angle = clock.elapsedTime * 0.2 * moon.orbitSpeed + moon.phase;
    ref.current.position.x = Math.cos(angle) * moon.orbitRadius;
    ref.current.position.y = Math.sin(angle) * moon.orbitRadius;
    ref.current.position.z = 0;
  });

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[moon.radius, 16, 16]} />
      <meshStandardMaterial
        color={moon.color}
        metalness={0.3}
        roughness={0.7}
      />
    </mesh>
  );
};
