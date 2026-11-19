import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isIngelogd } from "@/lib/auth";
import { laadLijst } from "@/lib/lijstData";
import WeekLink from "@/components/WeekLink";
import LijstWeergave from "@/components/LijstWeergave";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Boodschappenlijst", robots: { index: false } };

export default async function LijstPagina() {
  if (!(await isIngelogd())) redirect("/admin/login");
  const stand = await laadLijst();

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href="/week"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Weekmenu
          </Link>
          <WeekLink />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">Boodschappenlijst</h1>
        <LijstWeergave initieel={stand} apiBasis="/api/admin/week/lijst" magEigenRegelsVerwijderen />
      </main>
    </div>
  );
}
