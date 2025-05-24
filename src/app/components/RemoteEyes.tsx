"use client";
import { Text } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { Mesh, Vector3, Group, TextureLoader, ShaderMaterial } from "three";

import { SYMBOLS } from "@/domain";
import { useRemoteEyes } from "@/hooks/useRemoteEyes";
import { useRemoteEyesStore } from "@/stores/remoteEyesStore";
import { useSymbolStore } from "@/stores/symbolStore";

const EYE_RADIUS = 8;
const SUN_POS = new Vector3(0, 0, 0);
const GREEN = "#00FF41";
const EYE_TEXTURE_PATH = "/eye.jpg";
const POSITION_UPDATE_THRESHOLD = 0.00001;
const TEXT_FADE_DURATION_MS = 2000;

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

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const eyes = useRemoteEyes();
  const eyeTexture = useLoader(TextureLoader, EYE_TEXTURE_PATH);
  const remoteKeys = useSymbolStore((s) => s.remoteKeys);

  const managedEyes = useRemoteEyesStore((s) => s.managedEyes);
  const syncEyes = useRemoteEyesStore((s) => s.syncEyes);
  const updateEyeAnimations = useRemoteEyesStore((s) => s.updateEyeAnimations);

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
    syncEyes(eyes, myId, baseShaderMaterial);
  }, [eyes, myId, baseShaderMaterial, syncEyes]);

  useFrame((_, delta) => {
    updateEyeAnimations(delta);

    const activeEyeIds = new Set(Object.keys(managedEyes));
    for (const refId in refs.current) {
      if (!activeEyeIds.has(refId)) {
        delete refs.current[refId];
      }
    }

    for (const id in managedEyes) {
      const eye = managedEyes[id];
      const group = refs.current[id];

      if (!group) continue;

      if (
        group.position.manhattanDistanceTo(eye.position) >
        POSITION_UPDATE_THRESHOLD
      ) {
        group.position.copy(eye.position);
      }
      group.lookAt(SUN_POS);

      if (eye.material.uniforms["uOpacity"].value !== eye.opacity) {
        eye.material.uniforms["uOpacity"].value = eye.opacity;
      }
      if (group.scale.x !== eye.scale) {
        group.scale.set(eye.scale, eye.scale, eye.scale);
      }
    }
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
          {remoteKeys[eye.id] &&
            remoteKeys[eye.id].key &&
            Date.now() - remoteKeys[eye.id].ts < TEXT_FADE_DURATION_MS && (
              <Text
                position={[0, EYE_RADIUS + 6, 0]}
                fontSize={10}
                color={GREEN}
                anchorX="center"
                anchorY="middle"
                fillOpacity={
                  eye.opacity *
                  (1 -
                    (Date.now() - remoteKeys[eye.id].ts) /
                      TEXT_FADE_DURATION_MS)
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
