import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const errorData = await request.json();
    console.error("[CLIENT-SIDE ERROR]:", JSON.stringify(errorData, null, 2));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("[API/LOG-ERROR CAPTURE FAILED]:", e);
    return NextResponse.json(
      { success: false, error: "Failed to process error log" },
      { status: 500 },
    );
  }
}
