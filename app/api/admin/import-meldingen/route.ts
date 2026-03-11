import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const meldingen = await prisma.importMelding.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(meldingen);
}
