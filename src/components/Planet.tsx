"use client";

import { Sphere } from "@react-three/drei";
import React, { useRef, forwardRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
// import { createNoise2D } from "simplex-noise"; // Unused
import { CelestialBodyState } from "@/lib/domain/sim.types";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import {
  generatePlanetTexture,
  type GeneratedPlanetTextures,
  generateCloudTexture,
} from "@/lib/textureUtils";

export interface PlanetProps {
  celestialBody: CelestialBodyState;
  enableClouds?: boolean; // Added for future cloud implementation
}

// 1x1 pixel data URLs for placeholder textures
const placeholderImageDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/2lXzAAA"; // Grey
const defaultBumpImageDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60eADgAAAABJRU5ErkJggg=="; // RGB(128,128,255) -> Flat normal

// Simple hash function to get a number from a string (copied from textureUtils.ts)
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const Planet = forwardRef<RapierRigidBody, PlanetProps>(
  ({ celestialBody, enableClouds = false }, ref) => {
    const { radius, name, mass, textureUrl, bumpMapUrl, atmosphere } =
      celestialBody;
    const meshRef = useRef<THREE.Mesh>(null!);
    const atmosphereRef = useRef<THREE.Mesh>(null!);
    const cloudRef = useRef<THREE.Mesh>(null!);
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

    useEffect(() => {
      console.log("Planet component mounted:", name);
    }, [name]);

    const proceduralTextures = useMemo<
      GeneratedPlanetTextures | undefined
    >(() => {
      if (textureUrl) return undefined;
      return generatePlanetTexture(name);
    }, [textureUrl, name]);

    const cloudMap = useMemo<THREE.DataTexture | undefined>(() => {
      if (!enableClouds) return undefined;
      return generateCloudTexture(name);
    }, [name, enableClouds]);

    // Prepare texture URLs for useTexture, ensuring they are strings
    const urlsToLoad: string[] = [];
    if (textureUrl) urlsToLoad.push(textureUrl);
    else if (!proceduralTextures) urlsToLoad.push(placeholderImageDataUrl); // Fallback if no procedural either

    if (bumpMapUrl) urlsToLoad.push(bumpMapUrl);
    else if (!proceduralTextures) urlsToLoad.push(defaultBumpImageDataUrl); // Fallback if no procedural either

    const loadedTextures = useTexture(urlsToLoad);

    let displayMap: THREE.Texture | undefined;
    let displayBumpMap: THREE.Texture | undefined;
    let textureIndex = 0;

    if (textureUrl) {
      displayMap = loadedTextures[textureIndex++];
    } else if (proceduralTextures) {
      displayMap = proceduralTextures.map;
    } else {
      displayMap = loadedTextures[textureIndex++]; // Placeholder
    }

    if (bumpMapUrl) {
      displayBumpMap = loadedTextures[textureIndex++];
    } else if (proceduralTextures) {
      displayBumpMap = proceduralTextures.bumpMap;
    } else {
      displayBumpMap = loadedTextures[textureIndex++]; // Default bump placeholder
    }

    // Ensure placeholders are correctly assigned if procedural textures didn't cover them
    if (!displayMap && !textureUrl && !proceduralTextures)
      displayMap = loadedTextures[0];
    if (
      !displayBumpMap &&
      !bumpMapUrl &&
      !proceduralTextures &&
      loadedTextures.length > (textureUrl ? 1 : 0)
    ) {
      displayBumpMap = loadedTextures[textureUrl ? 1 : 0];
    }

    const bumpScale = useMemo(() => {
      if (
        displayBumpMap &&
        displayBumpMap.source.data.src !== defaultBumpImageDataUrl
      ) {
        // Vary bump scale per planet: 0.05 (min) to 0.20 (max)
        const hashVal = simpleHash(name + "_bumpScale");
        return 0.05 + (hashVal % 16) / 100; // (hash % 16) gives 0-15. /100 gives 0.0 to 0.15. Add 0.05.
      }
      return 0;
    }, [displayBumpMap, name]);

    const atmosphereRadius = useMemo(() => {
      return atmosphere?.thickness
        ? radius * (1 + atmosphere.thickness)
        : radius * 1.05;
    }, [radius, atmosphere?.thickness]);

    const atmosphereOpacity = useMemo(() => {
      return atmosphere?.density !== undefined ? atmosphere.density * 0.7 : 0.7;
    }, [atmosphere?.density]);

    // Cloud layer rotation
    useFrame(({ clock }) => {
      if (cloudRef.current && enableClouds) {
        cloudRef.current.rotation.y = clock.getElapsedTime() * 0.05;
        cloudRef.current.rotation.x = clock.getElapsedTime() * 0.02;
      }
    });

    return (
      <RigidBody
        ref={ref}
        colliders="ball"
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
            map={displayMap}
            bumpMap={displayBumpMap}
            bumpScale={bumpScale}
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
        {enableClouds && cloudMap && (
          <Sphere
            ref={cloudRef}
            args={[radius * 1.03, 32, 32]}
            position={[0, 0, 0]}
          >
            <meshStandardMaterial
              map={cloudMap}
              alphaMap={cloudMap}
              transparent={true}
              depthWrite={false}
              blending={THREE.NormalBlending}
              opacity={0.7}
            />
          </Sphere>
        )}
      </RigidBody>
    );
  },
);

Planet.displayName = "Planet";

export default Planet;
