export type Vec3 = [number, number, number];
export interface CameraMessage {
  id: string;
  p: Vec3;
  t: number;
}

type Writer = { write: (data: string) => void; closed: boolean };

const cameras = new Map<string, CameraMessage>();
const subs = new Set<Writer>();

export const setCamera = (id: string, p?: Vec3) => {
  if (p) {
    const msg: CameraMessage = { id, p, t: Date.now() };
    cameras.set(id, msg);
    broadcast(msg);
    return;
  }
  const cam = cameras.get(id);
  if (cam) {
    cam.t = Date.now();
    cameras.set(id, cam);
  }
};

export const broadcast = (msg: CameraMessage) => {
  const data = `data:${JSON.stringify(msg)}\n\n`;
  for (const w of subs) {
    if (w.closed) {
      subs.delete(w);
      continue;
    }
    w.write(data);
  }
};

export const subscribe = (w: Writer) => {
  subs.add(w);
  for (const cam of cameras.values()) {
    w.write(`data:${JSON.stringify(cam)}\n\n`);
  }
};

export const purgeStale = (maxAge = 60000) => {
  const now = Date.now();
  for (const [id, cam] of cameras) {
    if (now - cam.t > maxAge) cameras.delete(id);
  }
};

export const unsubscribe = (w: Writer) => {
  subs.delete(w);
};

// Periodically purge stale cameras
const PURGE_INTERVAL = 10000; // 10 seconds
setInterval(() => {
  purgeStale();
}, PURGE_INTERVAL);
