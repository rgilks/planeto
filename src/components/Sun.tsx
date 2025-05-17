import React, { forwardRef, useLayoutEffect, useRef } from "react";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CelestialBodyState } from "@/lib/domain/game.types";
import { SunShaderMaterial } from "./SunSurfaceMaterial";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";

export interface SunProps {
  celestialBody: CelestialBodyState;
}

const Sun = forwardRef<RapierRigidBody, SunProps>(({ celestialBody }, ref) => {
  const { position, radius, name } = celestialBody;
  const meshRef = useRef<THREE.Mesh>(null!);
  const shaderMaterialRef = useRef<SunShaderMaterial>(null!);

  const { camera } = useThree();

  useLayoutEffect(() => {
    const currentRef = typeof ref === "function" ? null : ref?.current;
    if (currentRef) {
      // If it's a fixed body, its position is usually set once.
      // Programmatic translation of fixed bodies is not typical.
      // currentRef.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    }
  }, [position, ref]);

  useFrame(({ clock }) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.time = clock.getElapsedTime();
      const worldCameraPosition = new THREE.Vector3();
      camera.getWorldPosition(worldCameraPosition);
      shaderMaterialRef.current.cameraPosition = worldCameraPosition;
    }

    // The <group> inside RigidBody can be rotated for visual effect if needed.
    // Or, if the RigidBody itself should rotate (e.g. has angularDamping), that's an option.
    // For now, assuming the shader handles visual changes and the body is fixed.
  });

  return (
    <RigidBody
      ref={ref}
      type="fixed"
      colliders="ball"
      name={`sun-${name}`}
      position={[position.x, position.y, position.z]}
    >
      <Sphere ref={meshRef} args={[radius, 64, 64]} castShadow={false}>
        <sunShaderMaterial ref={shaderMaterialRef} />
      </Sphere>
      <pointLight
        intensity={500000}
        distance={radius * 1000}
        decay={2}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={radius * 100}
        shadow-camera-near={radius * 0.1}
        position={[0, 0, 0]}
      />
    </RigidBody>
  );
});

Sun.displayName = "Sun";

export default Sun;
