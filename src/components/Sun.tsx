import React, { forwardRef, useRef, useEffect } from "react";
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
  const { position: posObj, radius, name } = celestialBody;
  const meshRef = useRef<THREE.Mesh>(null!);
  const shaderMaterialRef = useRef<SunShaderMaterial>(null!);
  const isInitializedRef = useRef(false);

  const { camera } = useThree();

  useEffect(() => {
    const body = typeof ref === "function" ? null : ref?.current;
    if (body) {
      const currentData =
        typeof body.userData === "object" && body.userData !== null
          ? body.userData
          : {};
      body.userData = {
        ...currentData,
        mass: celestialBody.mass,
        id: celestialBody.id,
      };

      if (!isInitializedRef.current) {
        body.setTranslation(celestialBody.position, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        if (celestialBody.initialAngularVelocity) {
          body.setAngvel(celestialBody.initialAngularVelocity, true);
        }
        isInitializedRef.current = true;
      }
    }
  }, [
    celestialBody.id,
    celestialBody.position,
    celestialBody.mass,
    celestialBody.initialAngularVelocity,
    ref,
  ]);

  useFrame(({ clock }) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.time = clock.getElapsedTime();
      const worldCameraPosition = new THREE.Vector3();
      camera.getWorldPosition(worldCameraPosition);
      shaderMaterialRef.current.cameraPosition = worldCameraPosition;
    }
  });

  return (
    <RigidBody
      ref={ref}
      colliders="ball"
      type="fixed"
      position={[posObj.x, posObj.y, posObj.z]}
      mass={celestialBody.mass}
      restitution={0.5}
      name={`sun-${name}`}
      userData={{
        id: celestialBody.id,
        mass: celestialBody.mass,
      }}
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
