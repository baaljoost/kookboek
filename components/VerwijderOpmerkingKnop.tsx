"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  slug: string;
  opmerkingId: number;
}

export default function VerwijderOpmerkingKnop({ slug, opmerkingId }: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function verwijder() {
    if (!confirm("Opmerking verwijderen?")) return;
    setBezig(true);
    await fetch(`/api/recepten/${slug}/opmerkingen`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opmerkingId }),
    });
    router.refresh();
    setBezig(false);
  }

  return (
    <button
      type="button"
      onClick={verwijder}
      disabled={bezig}
      className="text-xs text-neutral-300 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Opmerking verwijderen"
    >
      {bezig ? "…" : "Verwijderen"}
    </button>
  );
}
