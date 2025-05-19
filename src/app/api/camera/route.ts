import { NextRequest, NextResponse } from "next/server";
import { setCamera, Vec3 } from "@/lib/sseStore";

export const POST = async (req: NextRequest) => {
  const { id, p } = (await req.json()) as { id: string; p: Vec3 };
  setCamera(id, p);
  return NextResponse.json({ ok: true });
};
