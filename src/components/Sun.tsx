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
        <sunShaderMaterial ref={shaderMaterialRef} />
      </Sphere>
      <pointLight
        intensity={500000}
        distance={radius * 1000} // Affects a large area
        decay={2}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={radius * 100} // Adjust far plane for shadows
        shadow-camera-near={radius * 0.1} // Adjust near plane for shadows
      />
    </group>
  );
});

Sun.displayName = "Sun";

export default Sun;
