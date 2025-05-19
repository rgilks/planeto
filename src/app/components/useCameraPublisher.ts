"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

const THROTTLE_MS = 100;
const EPS = 0.05;

export const useCameraPublisher = (id: string) => {
  const lastSent = useRef(0);
  const prev = useRef(new Vector3());

  useFrame(({ camera }) => {
    const now = performance.now();
    if (now - lastSent.current < THROTTLE_MS) return;
    if (prev.current.distanceTo(camera.position) < EPS) return;

    lastSent.current = now;
    prev.current.copy(camera.position);
    navigator.sendBeacon?.(
      "/api/camera",
      JSON.stringify({ id, p: camera.position.toArray() }),
    );
  });
};
