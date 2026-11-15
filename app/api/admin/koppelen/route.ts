import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAfdelingCode } from "@/lib/afdelingen";
import { koppelGroep, laadProductIndex, normaliseerNaam } from "@/lib/productKoppeling";

interface KoppelPayload {
  // Groepssleutel van de ongekoppelde ingrediënten (zie koppelGroep)
  sleutel?: string;
  // Bestaand product…
  productId?: number;
  // …of een nieuw product
  nieuw?: { naam?: string; afdeling?: string; altijdInHuis?: boolean };
}

function fout(bericht: string, status = 400) {
  return NextResponse.json({ error: bericht }, { status });
}

// Koppel alle ongekoppelde ingrediënten van één groep aan een product.
// De groepssleutel wordt synoniem, zodat volgende imports vanzelf koppelen.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as KoppelPayload;
  // Zelf normaliseren: de sleutel wordt als synoniem opgeslagen.
  const sleutel = typeof body.sleutel === "string" ? normaliseerNaam(body.sleutel) : "";
  if (!sleutel) return fout("Geen ingrediënt opgegeven");

  const index = await laadProductIndex(prisma);

  let productId: number;
  let productNaam: string;

  if (body.nieuw) {
    const naam = String(body.nieuw.naam ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!naam || !normaliseerNaam(naam)) return fout("Vul een productnaam in");
    if (!isAfdelingCode(body.nieuw.afdeling)) return fout("Kies een afdeling");

    const bezet = index.get(normaliseerNaam(naam));
    if (bezet !== undefined) {
      const ander = await prisma.product.findUnique({ where: { id: bezet }, select: { naam: true } });
      return fout(`"${naam}" bestaat al als (synoniem van) product "${ander?.naam ?? naam}". Kies dat product.`, 409);
    }
    productNaam = naam;
    productId = -1; // wordt in de transactie aangemaakt
  } else {
    if (typeof body.productId !== "number") return fout("Kies een product");
    const product = await prisma.product.findUnique({ where: { id: body.productId }, select: { id: true, naam: true } });
    if (!product) return fout("Product niet gevonden", 404);
    productId = product.id;
    productNaam = product.naam;
  }

  // De sleutel mag niet al naar een ander product wijzen: een tekst hoort
  // bij precies één product.
  const eigenaar = index.get(sleutel);
  if (eigenaar !== undefined && eigenaar !== productId) {
    const ander = await prisma.product.findUnique({ where: { id: eigenaar }, select: { naam: true } });
    return fout(`"${sleutel}" is al gekoppeld aan product "${ander?.naam}". Kies dat product.`, 409);
  }

  // Groep opnieuw bepalen op de server: alle ongekoppelde regels met deze sleutel.
  const ongekoppeld = await prisma.ingredient.findMany({
    where: { productId: null },
    select: { id: true, naam: true },
  });
  const ids = ongekoppeld.filter((ing) => koppelGroep(ing.naam) === sleutel).map((ing) => ing.id);

  const resultaat = await prisma.$transaction(async (tx) => {
    if (body.nieuw) {
      const gemaakt = await tx.product.create({
        data: {
          naam: productNaam,
          afdeling: body.nieuw.afdeling as string,
          altijdInHuis: body.nieuw.altijdInHuis === true,
        },
      });
      productId = gemaakt.id;
    }

    if (sleutel !== normaliseerNaam(productNaam) && eigenaar === undefined) {
      await tx.productSynoniem.create({ data: { tekst: sleutel, productId } });
    }

    // Ingrediënten bijwerken raakt Recept.updatedAt niet: de sortering
    // "Meest recent" blijft gelijk.
    const bijgewerkt = await tx.ingredient.updateMany({
      where: { id: { in: ids }, productId: null },
      data: { productId },
    });
    return bijgewerkt.count;
  });

  return NextResponse.json({ ok: true, gekoppeld: resultaat, productId, productNaam });
}
