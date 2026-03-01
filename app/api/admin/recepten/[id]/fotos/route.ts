import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

// POST: voeg foto toe aan recept (via upload of URL)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const receptId = parseInt(id);
  if (isNaN(receptId)) return NextResponse.json({ error: "Ongeldig ID" }, { status: 400 });

  const contentType = request.headers.get("content-type") ?? "";

  let url: string;
  let altTekst = "";

  if (contentType.includes("multipart/form-data")) {
    // Bestand upload
    const formData = await request.formData();
    const file = formData.get("file") as File;
    altTekst = (formData.get("altTekst") as string) ?? "";
    if (!file) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
    const blob = await put(`recepten/${Date.now()}-${file.name}`, file, { access: "public" });
    url = blob.url;
  } else {
    // URL
    const body = await request.json();
    url = body.url;
    altTekst = body.altTekst ?? "";
    if (!url) return NextResponse.json({ error: "Geen URL" }, { status: 400 });
  }

  // Bepaal volgorde (na bestaande foto's)
  const aantalFotos = await prisma.foto.count({ where: { receptId } });

  const foto = await prisma.foto.create({
    data: { receptId, url, altTekst, volgorde: aantalFotos },
  });

  return NextResponse.json(foto);
}

// DELETE: verwijder een specifieke foto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const receptId = parseInt(id);
  const { fotoId } = await request.json();

  await prisma.foto.delete({ where: { id: fotoId, receptId } });
  return NextResponse.json({ ok: true });
}
