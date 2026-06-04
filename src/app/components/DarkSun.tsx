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
      <pointLight
        color="white"
        intensity={15}
        distance={1000}
        decay={2}
        castShadow
      />
      <Sphere args={[radius, 64, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial color="white" />
      </Sphere>
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
