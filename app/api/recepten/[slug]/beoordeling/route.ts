import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { sterren } = await request.json();

  if (!sterren || sterren < 1 || sterren > 5) {
    return NextResponse.json({ error: "Ongeldige beoordeling" }, { status: 400 });
  }

  const recept = await prisma.recept.update({
    where: { slug },
    data: { beoordeling: sterren },
    select: { beoordeling: true },
  });

  return NextResponse.json({ beoordeling: recept.beoordeling });
}
