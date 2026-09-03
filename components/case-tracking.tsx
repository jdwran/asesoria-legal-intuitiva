"use client";

import { useSyncExternalStore } from "react";
import { ClipboardList, Info, Trash2 } from "lucide-react";

import { AppScreen } from "@/components/app-shell";
import type { EmptyStateCasePayload } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { deleteCase, getCasesSnapshot, getEmptyCases, subscribeStorage } from "@/lib/device-storage";

const urgencyTone: Record<string, string> = {
  alta: "bg-rose-50 text-rose-700",
  media: "bg-amber-50 text-amber-700",
  baja: "bg-emerald-50 text-emerald-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export function CaseTracking({
  onBack,
  onOpenCase,
}: {
  onBack: () => void;
  onOpenCase: (payload: EmptyStateCasePayload) => void;
}) {
  const cases = useSyncExternalStore(subscribeStorage, getCasesSnapshot, getEmptyCases);

  return (
    <AppScreen title="Mis Expedientes" subtitle="Casos guardados en este dispositivo" onBack={onBack}>
      {cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700 shadow-2xs">
            <ClipboardList className="size-6" />
          </div>
          <h2 className="font-display text-sm font-bold text-slate-900">No tienes expedientes guardados</h2>
          <p className="mx-auto max-w-xs text-xs text-slate-500 leading-relaxed">
            Los casos que analices y organices con el orientador legal quedarán almacenados aquí para retomarlos cuando desees.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item.id} className="app-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-900">{item.title}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {item.city} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <span
                  className={`pill-badge border ${
                    item.urgency === "alta"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : item.urgency === "media"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  Urgencia {item.urgency}
                </span>
              </div>

              {item.nextStep && (
                <p className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200/70">
                  <span className="font-bold text-slate-800">Siguiente paso:</span> {item.nextStep}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenCase(item.payload)}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-8 px-4 shadow-xs"
                >
                  Abrir expediente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteCase(item.id)}
                  className="text-xs h-8 text-slate-400 hover:text-rose-700 ml-auto"
                >
                  <Trash2 className="size-3.5" />
                  <span>Eliminar</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-3 text-[11px] leading-4 text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
        <span>
          Tus expedientes se guardan <strong className="font-semibold text-slate-700">exclusivamente en este dispositivo</strong> para proteger tu privacidad.
        </span>
      </p>
    </AppScreen>
  );
}
