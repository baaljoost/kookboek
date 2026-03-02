import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const bestand = formData.get("bestand") as File;

  if (!bestand) {
    return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
  }

  const blob = await put(`voorstellen/${Date.now()}-${bestand.name}`, bestand, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
