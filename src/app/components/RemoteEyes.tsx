"use client";
import { useRef, useState, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Mesh, Vector3, Group } from "three";
import { useRemoteCameras } from "./useRemoteCameras";
import { TextureLoader, ShaderMaterial } from "three";
import { useMemo } from "react";
import { useKeyboardStore } from "../../lib/store/keyboardStore";
import { Text } from "@react-three/drei";

const EYE_RADIUS = 8;
const SUN_POS = new Vector3(0, 0, 0);

const GREEN = "#00FF41";
const SYMBOLS =
  "☉☯☢☣☠☮☭☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟♠♣♥♦♪♫☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☑☒☓☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇".split(
    "",
  );

const getSymbol = (key: string) => {
  const code = key.codePointAt(0) || 0;
  return SYMBOLS[code % SYMBOLS.length];
};

const vertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tex;
  varying vec3 vNormal;
  void main() {
    vec2 uv = normalize(vNormal).xy * 0.5 + 0.5;
    vec3 color = texture2D(tex, uv).rgb;
    if (vNormal.z < -0.85) color = vec3(0.777, 0.74, 0.74);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const RemoteEyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Mesh | Group>>({});
  const cams = useRemoteCameras();
  const targets = useRef<Record<string, Vector3>>({});
  const [, setTick] = useState(0);
  const lerpFactor = 0.05;
  const eyeTexture = useLoader(TextureLoader, "/eye.jpg");
  const remoteKeys = useKeyboardStore((s) => s.remoteKeys);

  const shaderMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { tex: { value: eyeTexture } },
        vertexShader,
        fragmentShader,
      }),
    [eyeTexture],
  );

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
              <primitive object={shaderMaterial} attach="material" />
            </mesh>
            {remoteKeys[id] && Date.now() - remoteKeys[id].ts < 2000 && (
              <Text
                position={[0, EYE_RADIUS + 6, 0]}
                fontSize={10}
                color={GREEN}
                anchorX="center"
                anchorY="middle"
                fillOpacity={1 - (Date.now() - remoteKeys[id].ts) / 2000}
                outlineColor="black"
                outlineWidth={0.25}
              >
                {getSymbol(remoteKeys[id].key)}
              </Text>
            )}
          </group>
        ))}
    </>
  );
};
