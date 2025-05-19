"use client";
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

const INTERVAL_MS = 1000;
const roundVec3 = (v: number[]) => v.map((n) => Math.round(n * 100) / 100);

export const useCameraPublisher = (id: string) => {
  const { camera } = useThree();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const payload = {
        id,
        p: roundVec3([camera.position.x, camera.position.y, camera.position.z]),
      };
      const ok = navigator.sendBeacon?.("/api/camera", JSON.stringify(payload));
      if (ok === false) {
        console.warn("sendBeacon failed, skipping update");
      }
    }, INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, camera]);
};
