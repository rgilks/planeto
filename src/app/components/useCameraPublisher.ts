"use client";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;

const roundVec3 = (v: [number, number, number]): [number, number, number] =>
  v.map((n) => Math.round(n * 100) / 100) as [number, number, number];

const VEC3_EPSILON = 0.001;

const areVec3sEqual = (
  a: [number, number, number] | undefined,
  b: [number, number, number],
): boolean => {
  if (!a) return false;
  return (
    Math.abs(a[0] - b[0]) < VEC3_EPSILON &&
    Math.abs(a[1] - b[1]) < VEC3_EPSILON &&
    Math.abs(a[2] - b[2]) < VEC3_EPSILON
  );
};

export const useCameraPublisher = (id: string) => {
  const { camera } = useThree();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPositionRef = useRef<[number, number, number] | undefined>(
    undefined,
  );
  const forcePositionUpdateCounterRef = useRef(0);

  const localIntervalMs = 2000;
  const checksPerForcePositionUpdate =
    FORCE_POSITION_UPDATE_INTERVAL_MS / localIntervalMs;

  useEffect(() => {
    const initialPositionRaw: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const initialPositionRounded = roundVec3(initialPositionRaw);
    const initialPayload = {
      id,
      p: initialPositionRounded,
    };
    navigator.sendBeacon?.("/api/camera", JSON.stringify(initialPayload));
    lastSentPositionRef.current = initialPositionRounded;
    forcePositionUpdateCounterRef.current = 0;

    intervalRef.current = setInterval(() => {
      const currentPositionRaw: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      const currentPositionRounded = roundVec3(currentPositionRaw);

      forcePositionUpdateCounterRef.current += 1;

      const positionActuallyChanged = !areVec3sEqual(
        lastSentPositionRef.current,
        currentPositionRounded,
      );
      const isTimeForForcePositionUpdate =
        forcePositionUpdateCounterRef.current >= checksPerForcePositionUpdate;

      if (positionActuallyChanged || isTimeForForcePositionUpdate) {
        const payload = { id, p: currentPositionRounded };
        navigator.sendBeacon?.("/api/camera", JSON.stringify(payload));
        lastSentPositionRef.current = currentPositionRounded;
        forcePositionUpdateCounterRef.current = 0;
      }
    }, localIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, camera, checksPerForcePositionUpdate]);
};
