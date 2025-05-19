"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3, Group } from "three";
import { useRemoteCameras } from "./useRemoteCameras";

const IRIS_COLOR = "#4a90e2";
const PUPIL_COLOR = "#111";
const SCLERA_COLOR = "#fff";
const EYE_RADIUS = 20;
const IRIS_RADIUS = 8;
const PUPIL_RADIUS = 4;

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const irisRefs = useRef<Record<string, Mesh>>({});
  const pupilRefs = useRef<Record<string, Mesh>>({});
  const cams = useRemoteCameras();
  const targets = useRef<Record<string, Vector3>>({});
  const [, setTick] = useState(0);
  const lerpFactor = 0.05;

  useEffect(() => {
    const camIds = new Set(cams.map(([id]) => id));
    for (const id in targets.current) {
      if (!camIds.has(id)) delete targets.current[id];
    }
    for (const id in refs.current) {
      if (!camIds.has(id)) delete refs.current[id];
    }
    for (const id in irisRefs.current) {
      if (!camIds.has(id)) delete irisRefs.current[id];
    }
    for (const id in pupilRefs.current) {
      if (!camIds.has(id)) delete pupilRefs.current[id];
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
      // Make the iris and pupil look at the origin (sun)
      const iris = irisRefs.current[id];
      const pupil = pupilRefs.current[id];
      if (iris && pupil) {
        iris.lookAt(0, 0, 0);
        pupil.lookAt(0, 0, 0);
      }
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
              <meshStandardMaterial
                color={SCLERA_COLOR}
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>
            <mesh
              ref={(el) => {
                if (el) irisRefs.current[id] = el;
              }}
              position={[0, 0, EYE_RADIUS - 2]}
            >
              <circleGeometry args={[IRIS_RADIUS, 32]} />
              <meshStandardMaterial
                color={IRIS_COLOR}
                roughness={0.2}
                metalness={0.3}
              />
            </mesh>
            <mesh
              ref={(el) => {
                if (el) pupilRefs.current[id] = el;
              }}
              position={[0, 0, EYE_RADIUS - 1]}
            >
              <circleGeometry args={[PUPIL_RADIUS, 32]} />
              <meshStandardMaterial
                color={PUPIL_COLOR}
                roughness={0.1}
                metalness={0.5}
              />
            </mesh>
          </group>
        ))}
    </>
  );
};
