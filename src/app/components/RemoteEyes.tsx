"use client";
import { Text } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useEffect, useMemo, useState } from "react";
import { Mesh, Vector3, Group, TextureLoader, ShaderMaterial } from "three";

import { SYMBOLS } from "../../lib/domain/keyboard";
import { useKeyboardStore } from "../../lib/store/keyboardStore";

import { useRemoteCameras } from "./useRemoteCameras";

const EYE_RADIUS = 8;
const SUN_POS = new Vector3(0, 0, 0);

const GREEN = "#00FF41";

const getSymbol = (key: string) => {
  const code = key.codePointAt(0) || 0;
  return SYMBOLS[code % SYMBOLS.length];
};

const vertexShader = `
  precision mediump float;
  varying vec3 vNormal;
  void main() {
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform sampler2D tex;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    vec2 uv = normalize(vNormal).xy * 0.5 + 0.5;
    vec3 color = texture2D(tex, uv).rgb;
    if (vNormal.z < -0.85) color = vec3(0.777, 0.74, 0.74);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

interface EyeState {
  id: string;
  position: Vector3;
  targetPosition: Vector3;
  opacity: number;
  scale: number;
  status: "appearing" | "visible" | "disappearing";
  material: ShaderMaterial;
}

const FADE_DURATION = 1;
const INITIAL_SCALE = 0.01;
const TARGET_SCALE = 1.0;

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const cams = useRemoteCameras();
  const eyeTexture = useLoader(TextureLoader, "/eye.jpg");
  const remoteKeys = useKeyboardStore((s) => s.remoteKeys);

  const [managedEyes, setManagedEyes] = useState<Record<string, EyeState>>({});

  const baseShaderMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          tex: { value: eyeTexture },
          uOpacity: { value: 1.0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
      }),
    [eyeTexture],
  );

  useEffect(() => {
    const incomingCamIds = new Set(cams.map(([id]) => id));

    setManagedEyes((prevEyes) => {
      const newEyesState = { ...prevEyes };

      for (const [id, p] of cams) {
        if (id === myId) continue;

        const positionVec = new Vector3(...p);

        if (newEyesState[id]) {
          newEyesState[id] = {
            ...newEyesState[id],
            targetPosition: positionVec.clone(),
            status:
              newEyesState[id].status === "disappearing"
                ? "appearing"
                : newEyesState[id].status,
          };
        } else {
          newEyesState[id] = {
            id,
            position: positionVec.clone(),
            targetPosition: positionVec.clone(),
            opacity: 0,
            scale: INITIAL_SCALE,
            status: "appearing",
            material: baseShaderMaterial.clone(),
          };
        }
      }

      for (const id in newEyesState) {
        if (id === myId) continue;
        if (!incomingCamIds.has(id)) {
          if (newEyesState[id].status !== "disappearing") {
            newEyesState[id] = {
              ...newEyesState[id],
              status: "disappearing",
            };
          }
        }
      }
      return newEyesState;
    });
  }, [cams, myId, baseShaderMaterial]);

  useFrame((_, delta) => {
    setManagedEyes((prevEyes) => {
      const newEyes = { ...prevEyes };
      let changed = false;

      for (const id in newEyes) {
        const eye = newEyes[id];
        const group = refs.current[id];

        if (!group) continue;

        if (!eye.position.equals(eye.targetPosition)) {
          eye.position.lerp(eye.targetPosition, 0.05);
          group.position.copy(eye.position);
          changed = true;
        }
        group.lookAt(SUN_POS);

        let visualPropertyChanged = false;
        if (eye.status === "appearing") {
          const progress = eye.opacity;

          eye.opacity += delta / FADE_DURATION;
          eye.scale =
            INITIAL_SCALE +
            (TARGET_SCALE - INITIAL_SCALE) * Math.min(eye.opacity, 1);

          if (progress >= 1) {
            eye.opacity = 1;
            eye.scale = TARGET_SCALE;
            eye.status = "visible";
          }
          visualPropertyChanged = true;
        } else if (eye.status === "disappearing") {
          const progress = eye.opacity;

          eye.opacity -= delta / FADE_DURATION;
          eye.scale =
            INITIAL_SCALE +
            (TARGET_SCALE - INITIAL_SCALE) * Math.max(eye.opacity, 0);

          if (progress <= 0) {
            delete newEyes[id];
            delete refs.current[id];
            changed = true;
            continue;
          }
          visualPropertyChanged = true;
        }

        if (visualPropertyChanged) {
          eye.material.uniforms["uOpacity"].value = eye.opacity;
          group.scale.set(eye.scale, eye.scale, eye.scale);
          changed = true;
        }
      }
      return changed ? newEyes : prevEyes;
    });
  });

  return (
    <>
      {Object.values(managedEyes).map((eye) => (
        <group
          key={eye.id}
          ref={(el) => {
            if (el) refs.current[eye.id] = el;
          }}
          position={eye.position}
        >
          <mesh>
            <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
            <primitive object={eye.material} attach="material" />
          </mesh>
          {remoteKeys[eye.id] && Date.now() - remoteKeys[eye.id].ts < 2000 && (
            <Text
              position={[0, EYE_RADIUS + 6, 0]}
              fontSize={10}
              color={GREEN}
              anchorX="center"
              anchorY="middle"
              fillOpacity={
                eye.opacity * (1 - (Date.now() - remoteKeys[eye.id].ts) / 2000)
              }
              outlineColor="black"
              outlineWidth={0.25}
            >
              {getSymbol(remoteKeys[eye.id].key)}
            </Text>
          )}
        </group>
      ))}
    </>
  );
};
