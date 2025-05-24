"use client";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { CameraUpdateType } from "../domain"; // Adjusted path

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;

const roundVec3 = (v: [number, number, number]): [number, number, number] =>
  v.map((n) => Math.round(n * 100) / 100) as [number, number, number];

const VEC3_EPSILON = 0.001;

const areVec3sEqual = (
  a: Readonly<[number, number, number]> | undefined,
  b: Readonly<[number, number, number]>,
): boolean => {
  if (!a) {
    return false;
  }

  for (let i = 0; i < 3; i++) {
    const valA = a[i];
    const valB = b[i];

    if (Number.isNaN(valA) && Number.isNaN(valB)) {
      continue;
    }
    if (Number.isNaN(valA) || Number.isNaN(valB)) {
      return false;
    }
    if (Math.abs(valA - valB) >= VEC3_EPSILON) {
      return false;
    }
  }
  return true;
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
    const initialPayload: CameraUpdateType = {
      type: "cameraUpdate",
      id,
      p: initialPositionRounded,
      t: Date.now(),
    };
    navigator.sendBeacon?.("/api/events", JSON.stringify(initialPayload));
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
        const payload: CameraUpdateType = {
          type: "cameraUpdate",
          id,
          p: currentPositionRounded,
          t: Date.now(),
        };
        navigator.sendBeacon?.("/api/events", JSON.stringify(payload));
        lastSentPositionRef.current = currentPositionRounded;
        forcePositionUpdateCounterRef.current = 0;
      }
    }, localIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, camera, checksPerForcePositionUpdate]);
};
