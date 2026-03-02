import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { naam, bericht, receptData } = await request.json();

    if (!naam?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }
    if (!receptData?.titel?.trim()) {
      return NextResponse.json({ error: "Recepttitel is verplicht" }, { status: 400 });
    }

    await prisma.voorgesteldRecept.create({
      data: {
        naam: naam.trim(),
        bericht: bericht?.trim() ?? "",
        receptData,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
