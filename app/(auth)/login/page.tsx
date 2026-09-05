import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) redirect("/login?error=Informe%20e-mail%20e%20senha");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect("/login?error=E-mail%20ou%20senha%20incorretos");
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-korvix-gradient p-10 text-korvix-50 lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-korvix-400/20 ring-1 ring-inset ring-korvix-300/30"><span className="text-sm font-bold text-korvix-200">K</span></div><span className="text-[15px] font-semibold tracking-tight">KORVIX <span className="text-korvix-300">OS</span></span></div></div>
        <div className="relative max-w-md"><p className="text-xs font-medium uppercase tracking-wider text-korvix-300">Sistema operacional interno</p><h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">A operação da Korvix, organizada por processos — não por pessoas.</h1><p className="mt-4 text-[15px] leading-relaxed text-korvix-200/90">CRM, comercial, financeiro, comissões, audiovisual e agenda em um único lugar, com propriedade comercial e regras de comissão que nunca ficam ambíguas.</p></div>
        <div className="relative flex items-center gap-2 text-xs text-korvix-300"><ShieldCheck size={14} /><span>Acesso restrito à equipe interna da Korvix Digital</span></div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-korvix-900"><span className="text-sm font-bold text-korvix-200">K</span></div><span className="text-[15px] font-semibold tracking-tight text-ink-900">KORVIX <span className="text-korvix-600">OS</span></span></div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Entrar</h2><p className="mt-1.5 text-sm text-ink-500">Use suas credenciais internas da Korvix Digital.</p>
          {searchParams?.error ? <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{searchParams.error}</div> : null}
          <form className="mt-8 space-y-5" action={signIn}>
            <div><label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">E-mail</label><input id="email" name="email" type="email" autoComplete="email" placeholder="voce@korvixdigital.com" className="focus-ring w-full rounded-lg border border-ink-300 px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-500/60" required /></div>
            <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="password" className="block text-sm font-medium text-ink-700">Senha</label><Link href="/login" className="text-xs font-medium text-korvix-600 hover:text-korvix-700">Esqueci minha senha</Link></div><input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="focus-ring w-full rounded-lg border border-ink-300 px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-500/60" required /></div>
            <button type="submit" className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-korvix-800">Entrar<ArrowRight size={16} /></button>
          </form>
          <p className="mt-8 text-center text-xs text-ink-500">Acesso protegido por autenticação do Supabase.</p>
        </div>
      </div>
    </div>
  );
}
