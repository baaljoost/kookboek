import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  if (await isAuthenticated()) {
    redirect("/admin/recepten");
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl text-neutral-900 mb-8 text-center">
          Het Kookboek
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
