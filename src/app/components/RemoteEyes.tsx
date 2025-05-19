"use client";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3, Group } from "three";
import { useRemoteCameras } from "./useRemoteCameras";

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const cams = useRemoteCameras();
  const tempVec = useRef(new Vector3());
  const [lastUpdate, setLastUpdate] = useState(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastUpdate < 2000) return;
    setLastUpdate(now);
    for (const [id, p] of cams) {
      if (id === myId) continue;
      const m = refs.current[id];
      if (!m) continue;
      m.position.lerp(tempVec.current.set(p[0], p[1], p[2]), 0.2);
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
            position={[p[0], p[1], p[2]]}
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
