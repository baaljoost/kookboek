import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST = goedkeuren: zet goedgekeurd op true
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.recept.update({
      where: { id: parseInt(id) },
      data: { goedgekeurd: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

// DELETE = afwijzen: verwijder het recept
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.recept.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
