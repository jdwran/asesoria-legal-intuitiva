"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Marco común de las pantallas secundarias de la versión app: barra superior
 * con retroceso y un contenedor con las áreas seguras ya resueltas, para que
 * cada módulo nuevo no vuelva a resolver notch y barra de gestos por su cuenta.
 */
export function AppScreen({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 backdrop-blur-md transition-all">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              aria-label="Volver al inicio"
              className="size-8 rounded-full border border-slate-200/70 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display truncate text-sm font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="truncate text-[11px] font-medium text-slate-500">{subtitle}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 pt-4 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
    </div>
  );
}
