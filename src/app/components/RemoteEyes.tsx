"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Mesh, Vector3, Group } from "three";
import { useRemoteCameras } from "./useRemoteCameras";
import { TextureLoader } from "three";

const EYE_RADIUS = 20;
const SUN_POS = new Vector3(0, 0, 0);

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const cams = useRemoteCameras();
  const targets = useRef<Record<string, Vector3>>({});
  const [, setTick] = useState(0);
  const lerpFactor = 0.05;
  const eyeTexture = useLoader(TextureLoader, "/eye.jpg");

  useEffect(() => {
    const camIds = new Set(cams.map(([id]) => id));
    for (const id in targets.current) {
      if (!camIds.has(id)) delete targets.current[id];
    }
    for (const id in refs.current) {
      if (!camIds.has(id)) delete refs.current[id];
    }
    const interval = setInterval(() => {
      for (const [id, p] of cams) {
        if (id === myId) continue;
        if (!targets.current[id]) targets.current[id] = new Vector3(...p);
        else targets.current[id].set(p[0], p[1], p[2]);
      }
      setTick((t) => t + 1);
    }, 300);
    return () => clearInterval(interval);
  }, [cams, myId]);

  useEffect(() => {
    for (const [id, p] of cams) {
      if (id === myId) continue;
      const ref = refs.current[id];
      if (ref && !targets.current[id]) {
        ref.position.set(p[0], p[1], p[2]);
      }
    }
  }, [cams, myId]);

  useFrame(() => {
    for (const [id] of cams) {
      if (id === myId) continue;
      const m = refs.current[id];
      const target = targets.current[id];
      if (!m || !target) continue;
      m.position.lerpVectors(m.position, target, lerpFactor);
      m.lookAt(SUN_POS);
    }
  });

  return (
    <>
      {cams
        .filter(([id]) => id !== myId)
        .map(([id]) => (
          <group
            key={id}
            ref={(el) => {
              if (el) refs.current[id] = el;
            }}
          >
            <mesh>
              <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
              <meshPhysicalMaterial
                map={eyeTexture}
                roughness={0.5}
                metalness={0.05}
                clearcoat={0.5}
                clearcoatRoughness={0.2}
                reflectivity={0.2}
              />
            </mesh>
          </group>
        ))}
    </>
  );
};
