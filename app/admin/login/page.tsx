import LoginFormulier from "@/components/admin/LoginFormulier";
import { veiligTerugAdres } from "@/lib/terugAdres";

// /admin/login?terug=/recepten/... : na inloggen terug naar die (interne) pagina
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ terug?: string | string[] }> }) {
  const { terug } = await searchParams;
  return <LoginFormulier terug={veiligTerugAdres(terug)} />;
}
