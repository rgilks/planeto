import React, { forwardRef, useLayoutEffect, useRef } from "react";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CelestialBodyState } from "@/lib/domain/game.types";
import { SunShaderMaterial } from "./SunSurfaceMaterial";

export interface SunProps {
  celestialBody: CelestialBodyState;
}

const Sun = forwardRef<THREE.Group, SunProps>(({ celestialBody }, ref) => {
  const { position, radius, name } = celestialBody;
  const meshRef = useRef<THREE.Mesh>(null!);
  const shaderMaterialRef = useRef<SunShaderMaterial>(null!);

  const { camera } = useThree();

  useLayoutEffect(() => {
    const currentRef = typeof ref === "function" ? null : ref?.current;
    if (currentRef) {
      currentRef.position.set(position.x, position.y, position.z);
    }
  }, [position, ref]);

  useFrame(({ clock }, delta) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.time = clock.getElapsedTime();
      const worldCameraPosition = new THREE.Vector3();
      camera.getWorldPosition(worldCameraPosition);
      shaderMaterialRef.current.cameraPosition = worldCameraPosition;
    }

    const currentRef = typeof ref === "function" ? null : ref?.current;
    if (currentRef) {
      const speed = celestialBody.rotationSpeed ?? 0.001; // Use rotationSpeed from props, default to slow
      currentRef.rotation.y += speed * delta;
    }
  });

  return (
    <group ref={ref} name={`sun-${name}`}>
      <Sphere ref={meshRef} args={[radius, 64, 64]} castShadow={false}>
        {/* <meshStandardMaterial
          color="#FFFF00"
          emissive="#FFFF00"
          emissiveIntensity={1.5}
          metalness={0.2}
          roughness={0.8}
        /> */}
        <sunShaderMaterial ref={shaderMaterialRef} />
      </Sphere>
      {/* Optional: Add a point light at the sun's position */}
      {/* <pointLight intensity={2} distance={radius * 50} decay={2} color="#FFFFFF" /> */}
    </group>
  );
});

Sun.displayName = "Sun";

export default Sun;
