"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Mesh, Vector3, Group } from "three";
import { useRemoteCameras } from "./useRemoteCameras";
import { TextureLoader } from "three";

const EYE_RADIUS = 20;
const IRIS_RADIUS = 5.5;
const PUPIL_RADIUS = 2.2;
const IRIS_COLOR = "#4a90e2";
const PUPIL_COLOR = "#111";
const SUN_POS = new Vector3(0, 0, 0);

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const irisRefs = useRef<Record<string, Mesh>>({});
  const pupilRefs = useRef<Record<string, Mesh>>({});
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
      const iris = irisRefs.current[id];
      const pupil = pupilRefs.current[id];
      const target = targets.current[id];
      if (!m || !target) continue;
      m.position.lerpVectors(m.position, target, lerpFactor);
      const eyePos = m.position;
      const toSun = SUN_POS.clone().sub(eyePos).normalize();
      if (iris) {
        iris.position.copy(toSun.clone().multiplyScalar(EYE_RADIUS - 1));
        iris.lookAt(eyePos.clone().add(toSun));
      }
      if (pupil) {
        pupil.position.copy(toSun.clone().multiplyScalar(EYE_RADIUS - 0.5));
        pupil.lookAt(eyePos.clone().add(toSun));
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
              <meshPhysicalMaterial
                map={eyeTexture}
                roughness={0.5}
                metalness={0.05}
                clearcoat={0.5}
                clearcoatRoughness={0.2}
                reflectivity={0.2}
              />
            </mesh>
            <mesh
              ref={(el) => {
                if (el) irisRefs.current[id] = el;
              }}
            >
              <circleGeometry args={[IRIS_RADIUS, 32]} />
              <meshStandardMaterial
                color={IRIS_COLOR}
                roughness={0.2}
                metalness={0.2}
              />
            </mesh>
            <mesh
              ref={(el) => {
                if (el) pupilRefs.current[id] = el;
              }}
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
