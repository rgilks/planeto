import React from "react";
// import { useFrame } from "@react-three/fiber"; // Removed as unused
import { Sphere } from "@react-three/drei";
import * as THREE from "three";
import { Position, Rotation } from "@/lib/domain/game.types";

interface SpaceshipProps {
  id: string;
  initialPosition?: Position;
  initialRotation?: Rotation;
  color?: string;
  isCurrentUser?: boolean; // To distinguish the player's own spaceship
}

const Spaceship: React.FC<SpaceshipProps> = ({
  id,
  initialPosition = { x: 0, y: 0, z: 0 },
  initialRotation = { x: 0, y: 0, z: 0 },
  color = "#ADD8E6", // Default to a light blue tint for glass
  isCurrentUser = false,
}) => {
  const groupRef = React.useRef<THREE.Group>(null!);

  // Set initial position and rotation directly
  React.useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        initialPosition.x,
        initialPosition.y,
        initialPosition.z,
      );
      groupRef.current.rotation.set(
        initialRotation.x,
        initialRotation.y,
        initialRotation.z,
      );
    }
  }, [initialPosition, initialRotation]);

  // useFrame can be used for animations or continuous updates if needed
  // For now, position/rotation is driven by props which come from the game store

  const spaceshipRadius = 0.15; // Made smaller
  // Use the provided color for tinting the glass. If current user, use a light orange tint.
  const glassTint = isCurrentUser ? "#FFDAB9" : color; // Light orange (PeachPuff) or supplied color
  const arrowColor = new THREE.Color(
    isCurrentUser ? "#FFA500" : color,
  ).getHex(); // Keep arrow distinct

  return (
    <group ref={groupRef} name={`spaceship-${id}`}>
      <Sphere args={[spaceshipRadius, 24, 24]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={glassTint} // Apply a light tint to the glass
          metalness={0} // Glass is not metallic
          roughness={0.0} // Very smooth for clear, reflective glass
          transmission={1.0} // Full transmission for clear glass effect
          transparent={true} // Required for transmission
          ior={1.52} // Index of Refraction for glass (e.g., crown glass)
          thickness={0.2} // Thickness for refraction effects, relative to radius
          specularIntensity={1.0} // Max specular intensity
          specularColor={new THREE.Color("#ffffff")} // Explicit white specular color
          clearcoat={1.0} // Add a clear coat layer
          clearcoatRoughness={0.01} // Make clear coat very smooth
          // envMapIntensity={1} // Would need an environment map for better reflections
        />
      </Sphere>
      <primitive
        object={
          new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, -1), // Direction
            new THREE.Vector3(0, 0, 0), // Origin
            spaceshipRadius * 2.5, // Slightly longer arrow relative to new radius
            arrowColor,
            spaceshipRadius * 0.8, // Adjusted head length
            spaceshipRadius * 0.6, // Adjusted head width
          )
        }
      />
    </group>
  );
};

export default Spaceship;
