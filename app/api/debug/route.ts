import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    adminPasswordSet: !!process.env.ADMIN_PASSWORD,
    adminPasswordLength: process.env.ADMIN_PASSWORD?.length ?? 0,
  });
}
