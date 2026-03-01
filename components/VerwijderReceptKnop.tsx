"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerwijderReceptKnop({ id, titel }: { id: number; titel: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function verwijder() {
    if (!confirm(`Weet je zeker dat je "${titel}" wilt verwijderen?`)) return;
    setBezig(true);
    await fetch(`/api/admin/recepten/${id}`, { method: "DELETE" });
    router.push("/");
  }

  return (
    <button
      onClick={verwijder}
      disabled={bezig}
      title="Recept verwijderen"
      className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors px-2 py-1 rounded disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
      {bezig ? "Verwijderen…" : "Verwijder recept"}
    </button>
  );
}
