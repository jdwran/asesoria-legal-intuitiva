import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Scale, ShieldCheck } from "lucide-react";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { AccountRegistrationForm } from "@/app/acceso/account-registration-form";
import {
  isValidRegistrationGate,
  REGISTRATION_GATE_COOKIE,
} from "@/lib/account-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acceso privado — Orientador Legal",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AccessPage() {
  const cookieStore = await cookies();
  const gate = cookieStore.get(REGISTRATION_GATE_COOKIE)?.value;
  if (
    !(await isValidRegistrationGate(
      gate,
      process.env.ACCOUNT_REGISTRATION_TOKEN,
    ))
  ) {
    notFound();
  }

  const user = await requireChatGPTUser("/acceso");

  return (
    <main className="min-h-[100dvh] bg-[#f4f3ee] px-4 py-10 text-slate-950 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#102238] text-emerald-300 shadow-sm">
            <Scale className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold tracking-tight text-[#102238]">Orientador Legal</p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Acceso privado
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
            <ShieldCheck className="size-4" aria-hidden="true" /> Invitación verificada
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-[-0.025em] text-[#102238] sm:text-4xl">
            Activa el guardado privado de tus sesiones
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Este portal no aparece en la navegación pública. Revisa y acepta la autorización
            específica antes de crear tu cuenta de almacenamiento.
          </p>
        </div>

        <AccountRegistrationForm displayName={user.displayName} />

        <p className="mt-6 text-xs leading-5 text-slate-500">
          La cuenta permite restaurar el trabajo, pero no convierte a Orientador Legal en tu
          abogado ni crea secreto profesional.
        </p>
      </div>
    </main>
  );
}
