"use client";

import { Sphere } from "@react-three/drei";
import React, { useRef, forwardRef, useMemo, useEffect } from "react";
import * as THREE from "three";
// import { createNoise2D } from "simplex-noise"; // Unused
import { CelestialBodyState } from "@/lib/domain/game.types";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
// import { generatePlanetTexture } from "@/lib/textureUtils"; // Module not found

export interface PlanetProps {
  celestialBody: CelestialBodyState;
}

// 1x1 pixel data URLs for placeholder textures
const placeholderImageDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/2lXzAAA"; // Grey
const defaultBumpImageDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60eADgAAAABJRU5ErkJggg=="; // RGB(128,128,255) -> Flat normal

const Planet = forwardRef<RapierRigidBody, PlanetProps>(
  ({ celestialBody }, ref) => {
    const {
      position: posObj,
      radius,
      name,
      mass,
      textureUrl,
      atmosphere,
    } = celestialBody;
    const meshRef = useRef<THREE.Mesh>(null!);
    const atmosphereRef = useRef<THREE.Mesh>(null!);
    const isInitializedRef = useRef(false);

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
          body.setLinvel(celestialBody.velocity, true);
          if (celestialBody.initialAngularVelocity) {
            body.setAngvel(celestialBody.initialAngularVelocity, true);
          }
          isInitializedRef.current = true;
        }
      }
    }, [
      celestialBody.id,
      celestialBody.position,
      celestialBody.velocity,
      celestialBody.mass,
      celestialBody.initialAngularVelocity,
      ref,
    ]);

    // const proceduralTexture = useMemo(() => { // Temporarily disable procedural texture
    //   if (textureUrl) return undefined;
    //   return generatePlanetTexture(name); // Module not found
    // }, [textureUrl, name]);

    const [map, bumpMap] = useTexture([
      textureUrl || placeholderImageDataUrl,
      celestialBody.bumpMapUrl || defaultBumpImageDataUrl,
    ]);

    const atmosphereRadius = useMemo(() => {
      return atmosphere?.thickness
        ? radius * (1 + atmosphere.thickness)
        : radius * 1.05;
    }, [radius, atmosphere?.thickness]);

    const atmosphereOpacity = useMemo(() => {
      return atmosphere?.density !== undefined ? atmosphere.density * 0.7 : 0.7;
    }, [atmosphere?.density]);

    return (
      <RigidBody
        ref={ref}
        colliders="ball"
        position={[posObj.x, posObj.y, posObj.z]}
        mass={mass}
        restitution={0.5}
        linearDamping={0.1}
        angularDamping={0.1}
        name={`planet-${name}`}
        userData={{
          id: celestialBody.id,
          mass: celestialBody.mass,
        }}
      >
        <Sphere ref={meshRef} args={[radius, 32, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            map={map}
            bumpMap={bumpMap}
            bumpScale={0.02}
            metalness={0.3}
            roughness={0.7}
          />
        </Sphere>
        {atmosphere && (
          <Sphere
            ref={atmosphereRef}
            args={[atmosphereRadius, 32, 32]}
            position={[0, 0, 0]}
          >
            <meshStandardMaterial
              color={new THREE.Color(atmosphere.color).convertSRGBToLinear()}
              transparent
              opacity={atmosphereOpacity}
              blending={THREE.AdditiveBlending}
              side={THREE.BackSide}
            />
          </Sphere>
        )}
      </RigidBody>
    );
  },
);

Planet.displayName = "Planet";

export default Planet;
