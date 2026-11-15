import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import KoppelLijst, { type KoppelGroep } from "@/components/admin/KoppelLijst";
import { koppelGroep } from "@/lib/productKoppeling";

export const dynamic = "force-dynamic";

export default async function KoppelenPage() {
  const [ongekoppeld, producten, aantalVoorgesteld, aantalImportMeldingen, cookieStore] = await Promise.all([
    prisma.ingredient.findMany({
      where: { productId: null },
      select: { id: true, naam: true, recept: { select: { slug: true, titel: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.product.findMany({ select: { id: true, naam: true, afdeling: true }, orderBy: { naam: "asc" } }),
    prisma.voorgesteldRecept.count({ where: { status: "WACHT" } }),
    prisma.importMelding.count(),
    cookies(),
  ]);
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;

  // Groepeer op genormaliseerde naam, zodat "grote ui" en "Ui" samen één
  // keuze zijn.
  const opSleutel = new Map<string, KoppelGroep>();
  for (const ing of ongekoppeld) {
    const sleutel = koppelGroep(ing.naam);
    if (!sleutel) continue;
    let groep = opSleutel.get(sleutel);
    if (!groep) {
      groep = { sleutel, aantal: 0, namen: [], recepten: [] };
      opSleutel.set(sleutel, groep);
    }
    groep.aantal++;
    if (!groep.namen.includes(ing.naam)) groep.namen.push(ing.naam);
    if (!groep.recepten.some((r) => r.slug === ing.recept.slug)) groep.recepten.push(ing.recept);
  }
  const groepen = [...opSleutel.values()].sort(
    (a, b) => b.aantal - a.aantal || a.sleutel.localeCompare(b.sleutel, "nl")
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Naar het kookboek
          </Link>
          <h1 className="font-serif text-2xl text-neutral-900 mt-1">Nog te koppelen</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Ingrediënten zonder product. Kies een bestaand product of maak een nieuw; de naam wordt
            dan synoniem, zodat volgende imports vanzelf koppelen.
          </p>
        </div>
        <AdminNav
          isBeheerder={isBeheerder}
          aantalVoorgesteld={aantalVoorgesteld}
          aantalImportMeldingen={aantalImportMeldingen}
          aantalTeKoppelen={ongekoppeld.length}
        />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {groepen.length === 0 ? (
          <p className="text-neutral-500 text-center py-20">Alle ingrediënten zijn gekoppeld.</p>
        ) : (
          <KoppelLijst groepen={groepen} producten={producten} />
        )}
      </main>
    </div>
  );
}
