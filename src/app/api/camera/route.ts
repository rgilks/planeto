import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { setCamera, Vec3 } from "@/lib/sseStore";

const CameraPayloadSchema = z.object({
  id: z.string().min(1), // Assuming ID should not be empty
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
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, p } = parsed.data;

  if (p) {
    setCamera(id, p);
  } else {
    setCamera(id);
  }
  return NextResponse.json({ ok: true });
};
