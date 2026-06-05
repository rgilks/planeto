"use client";
import { Text } from "@react-three/drei";
import { Group, Vector3 } from "three";

import { getSymbol, SYMBOL_COLOR } from "@/domain";
import { ManagedEye } from "@/stores/eyesStore";
import { RemoteKey } from "@/stores/symbolStore";

const EYE_RADIUS = 8;
const TEXT_FADE_DURATION_MS = 2000;

interface EyeProps {
  eye: ManagedEye;
  remoteKey?: RemoteKey;
  groupRef: (el: Group | null) => void;
  position?: Vector3;
}

export const Eye = ({ eye, remoteKey, groupRef, position }: EyeProps) => {
  return (
    <group ref={groupRef} position={position || eye.position}>
      <mesh>
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
      {remoteKey &&
        remoteKey.key &&
        Date.now() - remoteKey.ts < TEXT_FADE_DURATION_MS && (
          <Text
            position={[0, EYE_RADIUS + 6, 0]}
            fontSize={10}
            color={SYMBOL_COLOR}
            anchorX="center"
            anchorY="middle"
            fillOpacity={
              eye.opacity *
              (1 - (Date.now() - remoteKey.ts) / TEXT_FADE_DURATION_MS)
            }
            outlineColor="black"
            outlineWidth={0.25}
          >
            {getSymbol(remoteKey.key)}
          </Text>
        )}
    </group>
  );
};
