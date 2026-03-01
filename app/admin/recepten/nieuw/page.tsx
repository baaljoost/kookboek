import Link from "next/link";
import ReceptFormulier from "@/components/admin/ReceptFormulier";

export default async function NieuwReceptPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href="/admin/recepten"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-olive-700 transition-colors"
          >
            ← Recepten
          </Link>
          <h1 className="font-serif text-2xl text-neutral-900 mt-1">
            Nieuw recept
          </h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <ReceptFormulier />
      </main>
    </div>
  );
}
