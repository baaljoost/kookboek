import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { controleerSessieToken, maakSessieToken, SESSIE_DUUR_MS } from "./sessie";

export const SESSION_COOKIE = "kookboek_admin";

// Voor pagina's en routes: is er een geldige, getekende sessie?
// Dit is de enige controle waar het weekmenu op leunt. De cookie
// `kookboek_modus` (lib/modus.ts) is een weergavevoorkeur en telt niet.
export async function isIngelogd(): Promise<boolean> {
  const cookieStore = await cookies();
  return controleerSessieToken(cookieStore.get(SESSION_COOKIE)?.value);
}

// Oude naam, zelfde controle.
export const isAuthenticated = isIngelogd;

export function checkPassword(password: unknown): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is niet ingesteld");
  if (typeof password !== "string") return false;
  // Hashen maakt beide kanten even lang, zodat timingSafeEqual kan vergelijken.
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(adminPassword).digest();
  return timingSafeEqual(a, b);
}

// Zet de sessiecookie op een antwoord. Gooit als SESSION_SECRET ontbreekt;
// de login faalt dan dicht.
export async function sessieCookie() {
  return {
    naam: SESSION_COOKIE,
    waarde: await maakSessieToken(),
    opties: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: Math.floor(SESSIE_DUUR_MS / 1000),
      path: "/",
    },
  };
}
