import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { setCamera, Vec3 } from "@/lib/sseStore";

const CameraPayloadSchema = z.object({
  id: z.string().min(1),
  p: z.array(z.number()).length(3).optional() as z.Schema<Vec3 | undefined>,
});

export const POST = async (req: NextRequest) => {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = CameraPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    console.error("POST /api/camera - invalid payload", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, p } = parsed.data;
  console.log("POST /api/camera", { id, p });

  if (p) {
    setCamera(id, p);
  }

  return NextResponse.json({ ok: true });
};
