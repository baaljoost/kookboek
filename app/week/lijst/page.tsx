import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isIngelogd } from "@/lib/auth";
import { laadLijst } from "@/lib/lijstData";
import BeheerKnop from "@/components/BeheerKnop";
import LijstWeergave from "@/components/LijstWeergave";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Boodschappenlijst", robots: { index: false } };

export default async function LijstPagina() {
  if (!(await isIngelogd())) redirect("/admin/login");
  const stand = await laadLijst();

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center gap-4">
          <Link
            href="/week"
            className="flex-1 min-w-0 py-3 text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Weekmenu
          </Link>
          <BeheerKnop ingelogd terug="/week/lijst" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl text-neutral-900 mb-2">Boodschappenlijst</h1>
        <LijstWeergave initieel={stand} apiBasis="/api/admin/week/lijst" magEigenRegelsVerwijderen />
      </main>
    </div>
  );
}
