"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3 } from "three";
import { useRemoteCameras } from "./useRemoteCameras";

export const RemoteEyes = () => {
  const refs = useRef<Record<string, Mesh>>({});
  const cams = useRemoteCameras();
  const tempVec = useRef(new Vector3());

  useFrame(() => {
    for (const [id, p] of cams) {
      const m = refs.current[id];
      if (!m) continue;
      tempVec.current.set(p[0], p[1], p[2]);
      m.position.lerp(tempVec.current, 0.2);
    }
  });

  return (
    <>
      {cams.map(([id, p]) => (
        <mesh
          key={id}
          ref={(el) => el && (refs.current[id] = el)}
          position={[p[0], p[1], p[2]]}
        >
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
    </>
  );
};
