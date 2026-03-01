"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerwijderKnop({ id, titel }: { id: number; titel: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function verwijder() {
    if (!confirm(`Weet je zeker dat je "${titel}" wilt verwijderen?`)) return;
    setBezig(true);
    await fetch(`/api/admin/recepten/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={verwijder}
      disabled={bezig}
      className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 disabled:opacity-50"
    >
      {bezig ? "…" : "Verwijder"}
    </button>
  );
}
