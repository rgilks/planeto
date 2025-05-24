import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useRef } from "react";
import * as THREE from "three";

type DarkSunProps = {
  radius: number;
};

const DarkSun: React.FC<DarkSunProps> = ({ radius }) => {
  const atmosphereRadiusFactor = 1.15;
  const baseAtmosphereOpacity = 0.15;
  const atmosphereEmissiveIntensity = 0.1;

  const atmosphereMaterialRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(({ clock }) => {
    if (atmosphereMaterialRef.current) {
      const opacityVariation = (Math.sin(clock.elapsedTime * 0.5) + 1) / 2;
      atmosphereMaterialRef.current.opacity =
        baseAtmosphereOpacity + opacityVariation * 0.1;
    }
  });

  return (
    <group>
      {/* Point light originating from the sun's center */}
      <pointLight
        color="white"
        intensity={15} // Start with a strong intensity, can be adjusted
        distance={1000} // How far the light reaches, adjust based on scene scale
        decay={2} // How the light intensity falls off with distance
        castShadow // Enabled shadow casting
      />
      {/* Inner solid core */}
      <Sphere args={[radius, 64, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial color="white" />
      </Sphere>
      {/* Outer transparent atmosphere */}
      <Sphere
        args={[radius * atmosphereRadiusFactor, 64, 64]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          ref={atmosphereMaterialRef}
          color="white"
          transparent={true}
          opacity={baseAtmosphereOpacity}
          emissive="white"
          emissiveIntensity={atmosphereEmissiveIntensity}
          depthWrite={false}
        />
      </Sphere>
    </group>
  );
};

export default DarkSun;
