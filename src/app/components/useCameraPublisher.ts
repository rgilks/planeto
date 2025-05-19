"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

const THROTTLE_MS = 1000; // 1 second
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
    const payload = { id, p: camera.position.toArray() };
    console.log("POSTING CAMERA POSITION", payload);
    const ok = navigator.sendBeacon?.("/api/camera", JSON.stringify(payload));
    if (ok === false) {
      console.warn("sendBeacon failed, skipping this update");
    }
  });
};
