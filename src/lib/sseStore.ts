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
    console.log("setCamera: position", msg);
    broadcast(msg);
    return;
  }
  const cam = cameras.get(id);
  if (cam) {
    cam.t = Date.now();
    cameras.set(id, cam);
    console.log("setCamera: ping, updated timestamp for", id);
  } else {
    console.log("setCamera: ping for unknown id", id);
  }
};

export const broadcast = (msg: CameraMessage) => {
  const data = `data:${JSON.stringify(msg)}\n\n`;
  console.log("broadcasting to", subs.size, "subs:", data);
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
  console.log("subscribe: now", subs.size, "subs");
  for (const cam of cameras.values()) {
    w.write(`data:${JSON.stringify(cam)}\n\n`);
  }
};

export const purgeStale = (maxAge = 30_000) => {
  const now = Date.now();
  for (const [id, cam] of cameras) {
    if (now - cam.t > maxAge) cameras.delete(id);
  }
};

export const unsubscribe = (w: Writer) => {
  subs.delete(w);
};
