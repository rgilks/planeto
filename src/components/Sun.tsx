import React, { forwardRef, useRef, useEffect } from "react";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CelestialBodyState } from "@/lib/domain/sim.types";
import { SunShaderMaterial } from "./SunSurfaceMaterial";
import {
  RigidBody,
  RapierRigidBody,
  type CollisionEnterPayload,
} from "@react-three/rapier";

export interface SunProps {
  celestialBody: CelestialBodyState;
}

const Sun = forwardRef<RapierRigidBody, SunProps>(({ celestialBody }, ref) => {
  const { radius, name } = celestialBody;
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

  const handleSunCollision = (payload: CollisionEnterPayload) => {
    const otherBody = payload.other.rigidBody;
    const otherCollider = payload.other.collider;

    const sunPosition = new THREE.Vector3(0, 0, 0); // Sun is at origin
    const sunRadius = celestialBody.radius;

    if (
      otherBody &&
      otherCollider &&
      otherBody.bodyType() !== 0 /* RigidBodyType.Fixed */
    ) {
      const planetCurrentPosition = new THREE.Vector3().copy(
        otherBody.translation() as THREE.Vector3,
      );

      const awayFromSun = planetCurrentPosition
        .clone()
        .sub(sunPosition)
        .normalize();
      const planetMass = otherBody.mass();

      // Apply an impulse for ejection
      const targetEjectionSpeed = 1200;
      const impulseMagnitude = targetEjectionSpeed * planetMass;
      const impulseVector = awayFromSun
        .clone()
        .multiplyScalar(impulseMagnitude);
      otherBody.applyImpulse(impulseVector, true);

      // Also displace the planet slightly to avoid immediate re-collision/sticking
      const planetRadius = otherCollider.radius(); // Assumes planet collider is a Ball
      const displacementDistance = sunRadius + planetRadius + 15;
      const newPlanetPosition = awayFromSun
        .clone()
        .multiplyScalar(displacementDistance);

      otherBody.setTranslation(newPlanetPosition, true);
    }
  };

  return (
    <RigidBody
      ref={ref}
      colliders="ball"
      type="fixed"
      mass={celestialBody.mass}
      restitution={0.0}
      name={`sun-${name}`}
      userData={{
        id: celestialBody.id,
        mass: celestialBody.mass,
      }}
      onCollisionEnter={handleSunCollision}
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
