import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isIngelogd } from "@/lib/auth";
import { laadLijst } from "@/lib/lijstData";
import { telRegels } from "@/lib/boodschappenlijst";
import BeheerKnop from "@/components/BeheerKnop";
import { laadMandje, laadZoekRecepten } from "@/lib/weekMandje";
import WeekMandje from "@/components/WeekMandje";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Weekmenu", robots: { index: false } };

export default async function WeekPagina() {
  if (!(await isIngelogd())) redirect("/admin/login");

  const [mandje, zoek, lijst] = await Promise.all([laadMandje(), laadZoekRecepten(), laadLijst()]);
  const aantalRegels = telRegels(lijst.secties, new Set()).totaal;

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center gap-4">
          <Link
            href="/"
            className="flex-1 min-w-0 py-3 text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Het Kookboek van Joost
          </Link>
          <BeheerKnop ingelogd terug="/week" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">Weekmenu</h1>
        <Link
          href="/week/lijst"
          className="inline-block mb-6 text-xs uppercase tracking-widest text-olive-700 hover:text-olive-800 transition-colors"
        >
          Boodschappenlijst · {aantalRegels} {aantalRegels === 1 ? "regel" : "regels"} →
        </Link>
        <WeekMandje initieel={mandje} alle={zoek} />
      </main>
    </div>
  );
}
