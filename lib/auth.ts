import { cookies } from "next/headers";

const SESSION_COOKIE = "kookboek_admin";
const SESSION_VALUE = "authenticated";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function checkPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is niet ingesteld");
  return password === adminPassword;
}

export { SESSION_COOKIE, SESSION_VALUE };
