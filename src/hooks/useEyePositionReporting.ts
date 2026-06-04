import { useEffect, useRef } from "react";

import { roundVec3, areVec3sEqual } from "@/lib/utils";

import type { EyeUpdateType } from "@/domain";
import type { Camera } from "@react-three/fiber";

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;
const LOCAL_INTERVAL_MS = 2000;

export const useEyePositionReporting = (
  myId: string,
  camera: Camera | undefined,
) => {
  const lastSentPositionRef = useRef<[number, number, number] | undefined>(
    undefined,
  );
  const forcePositionUpdateCounterRef = useRef(0);

  useEffect(() => {
    if (!camera) return;

    const checksPerForcePositionUpdate =
      FORCE_POSITION_UPDATE_INTERVAL_MS / LOCAL_INTERVAL_MS;

    const send = (position: [number, number, number]) => {
      const payload: EyeUpdateType = {
        type: "eyeUpdate",
        id: myId,
        p: position,
        t: Date.now(),
      };
      navigator.sendBeacon?.("/api/events", JSON.stringify(payload));
      lastSentPositionRef.current = position;
      forcePositionUpdateCounterRef.current = 0;
    };

    const readPosition = (): [number, number, number] =>
      roundVec3([camera.position.x, camera.position.y, camera.position.z]);

    send(readPosition());

    const intervalId = setInterval(() => {
      const currentPosition = readPosition();

      forcePositionUpdateCounterRef.current += 1;

      const positionActuallyChanged = !areVec3sEqual(
        lastSentPositionRef.current,
        currentPosition,
      );
      const isTimeForForcePositionUpdate =
        forcePositionUpdateCounterRef.current >= checksPerForcePositionUpdate;

      if (positionActuallyChanged || isTimeForForcePositionUpdate) {
        send(currentPosition);
      }
    }, LOCAL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [camera, myId]);
};
