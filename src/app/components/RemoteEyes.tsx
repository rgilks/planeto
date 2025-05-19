"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3, Group } from "three";
import { useRemoteCameras } from "./useRemoteCameras";

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const cams = useRemoteCameras();
  const targets = useRef<Record<string, Vector3>>({});
  const [, setTick] = useState(0);

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
    }, 1000);
    return () => clearInterval(interval);
  }, [cams, myId]);

  useFrame(() => {
    for (const [id] of cams) {
      if (id === myId) continue;
      const m = refs.current[id];
      const target = targets.current[id];
      if (!m || !target) continue;
      m.position.lerp(target, 0.2);
    }
  });

  return (
    <>
      {cams
        .filter(([id]) => id !== myId)
        .map(([id, p]) => (
          <group
            key={id}
            ref={(el) => el && (refs.current[id] = el)}
            position={p}
          >
            <mesh>
              <boxGeometry args={[20, 20, 20]} />
              <meshBasicMaterial color="#ff00ff" />
            </mesh>
            <mesh>
              <boxGeometry args={[20.2, 20.2, 20.2]} />
              <meshBasicMaterial
                color="#fff"
                wireframe
                opacity={0.3}
                transparent
              />
            </mesh>
            <mesh>
              <boxGeometry args={[24, 24, 24]} />
              <meshBasicMaterial color="#ff00ff" opacity={0.18} transparent />
            </mesh>
            <mesh position={[6, 6, 10]}>
              <boxGeometry args={[5, 5, 5]} />
              <meshBasicMaterial color="white" />
            </mesh>
          </group>
        ))}
    </>
  );
};
