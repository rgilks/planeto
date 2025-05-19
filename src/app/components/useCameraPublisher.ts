"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

const THROTTLE_MS = 2000;
const EPS = 0.05;

export const useCameraPublisher = (id: string) => {
  const lastSent = useRef(0);
  const prev = useRef(new Vector3());
  const lerped = useRef(new Vector3());

  useFrame(({ camera }) => {
    lerped.current.lerp(camera.position, 0.2);
    const now = performance.now();
    const moved = prev.current.distanceTo(lerped.current) >= EPS;
    if (moved) {
      lastSent.current = now;
      prev.current.copy(lerped.current);
      const payload = { id, p: lerped.current.toArray() };
      const ok = navigator.sendBeacon?.("/api/camera", JSON.stringify(payload));
      if (ok === false) {
        console.warn("sendBeacon failed, skipping this update");
      }
      return;
    }
    if (now - lastSent.current >= THROTTLE_MS) {
      lastSent.current = now;
      const ok = navigator.sendBeacon?.("/api/camera", JSON.stringify({ id }));
      if (ok === false) {
        console.warn("sendBeacon failed, skipping ping");
      }
    }
  });
};
