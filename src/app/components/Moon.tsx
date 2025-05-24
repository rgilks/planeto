import { useRef, useEffect } from "react";
import * as THREE from "three";

import type { Moon as MoonType } from "../../lib/domain";

export const Moon = ({ moon }: { moon: MoonType }) => {
  const ref = useRef<THREE.Mesh>(null);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (ref.current) {
        const t = performance.now() * 0.0002;
        const angle = t * moon.orbitSpeed + moon.phase;
        ref.current.position.x = Math.cos(angle) * moon.orbitRadius;
        ref.current.position.y = Math.sin(angle) * moon.orbitRadius;
        ref.current.position.z = 0;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [moon]);

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
