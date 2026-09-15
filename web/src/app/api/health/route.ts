import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "imd-raffle",
    timestamp: new Date().toISOString(),
  });
}
