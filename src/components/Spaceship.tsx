import React from "react";
// import { useFrame } from "@react-three/fiber"; // Removed as unused
import { Box } from "@react-three/drei";
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
  color = "blue",
  isCurrentUser = false,
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null!);

  // Set initial position and rotation directly
  React.useLayoutEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        initialPosition.x,
        initialPosition.y,
        initialPosition.z,
      );
      meshRef.current.rotation.set(
        initialRotation.x,
        initialRotation.y,
        initialRotation.z,
      );
    }
  }, [initialPosition, initialRotation]);

  // useFrame can be used for animations or continuous updates if needed
  // For now, position/rotation is driven by props which come from the game store

  return (
    <Box
      ref={meshRef}
      args={[0.5, 0.2, 1]}
      castShadow
      receiveShadow
      name={`spaceship-${id}`}
    >
      <meshStandardMaterial color={isCurrentUser ? "orange" : color} />
    </Box>
  );
};

export default Spaceship;
