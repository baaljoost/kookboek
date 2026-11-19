import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { MODUS_COOKIE, MODUS_BEHEERDER } from "@/lib/modus";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import DeelLinkBeheer from "@/components/admin/DeelLinkBeheer";
import { haalCode } from "@/lib/deelLink";

export const dynamic = "force-dynamic";

export default async function DeelLinkPagina() {
  const [code, aantalVoorgesteld, aantalImportMeldingen, aantalTeKoppelen, cookieStore] = await Promise.all([
    haalCode(),
    prisma.voorgesteldRecept.count({ where: { status: "WACHT" } }),
    prisma.importMelding.count(),
    prisma.ingredient.count({ where: { productId: null } }),
    cookies(),
  ]);
  const isBeheerder = cookieStore.get(MODUS_COOKIE)?.value === MODUS_BEHEERDER;

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
          <h1 className="font-serif text-2xl text-neutral-900 mt-1">Deellink</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Wie deze link heeft kan de boodschappenlijst bekijken, afvinken en eigen regels toevoegen, maar niet het
            weekmenu wijzigen. Na vernieuwen werkt de oude link niet meer.
          </p>
        </div>
        <AdminNav
          isBeheerder={isBeheerder}
          aantalVoorgesteld={aantalVoorgesteld}
          aantalImportMeldingen={aantalImportMeldingen}
          aantalTeKoppelen={aantalTeKoppelen}
        />
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <DeelLinkBeheer initieleCode={code} />
      </main>
    </div>
  );
}
