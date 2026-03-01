"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: wachtwoord }),
    });

    if (res.ok) {
      router.push("/admin/recepten");
    } else {
      setFout("Verkeerd wachtwoord");
      setBezig(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Wachtwoord</label>
        <input
          type="password"
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          className="input"
          autoFocus
        />
      </div>
      {fout && <p className="text-red-600 text-sm">{fout}</p>}
      <button
        type="submit"
        disabled={bezig}
        className="btn-primary w-full text-center disabled:opacity-50"
      >
        {bezig ? "Inloggen…" : "Inloggen"}
      </button>
    </form>
  );
}
