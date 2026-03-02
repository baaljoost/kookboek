"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: number;
}

export default function VoorstelActies({ id }: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState<"goedkeuren" | "afwijzen" | null>(null);

  async function goedkeuren() {
    setBezig("goedkeuren");
    const res = await fetch(`/api/admin/voorstellen/${id}`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("Goedkeuren mislukt");
      setBezig(null);
    }
  }

  async function afwijzen() {
    if (!confirm("Voorstel afwijzen?")) return;
    setBezig("afwijzen");
    const res = await fetch(`/api/admin/voorstellen/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("Afwijzen mislukt");
      setBezig(null);
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={goedkeuren}
        disabled={!!bezig}
        className="text-xs px-3 py-1.5 bg-olive-700 text-white hover:bg-olive-800 transition-colors disabled:opacity-50"
      >
        {bezig === "goedkeuren" ? "…" : "Goedkeuren"}
      </button>
      <button
        onClick={afwijzen}
        disabled={!!bezig}
        className="text-xs px-3 py-1.5 border border-neutral-300 text-neutral-600 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
      >
        {bezig === "afwijzen" ? "…" : "Afwijzen"}
      </button>
    </div>
  );
}
