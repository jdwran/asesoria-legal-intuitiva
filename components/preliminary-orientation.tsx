"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Landmark,
  Pencil,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY } from "@/lib/detailed-guidance";
import type { LegalOrientation, VerifiedLegalCitation } from "@/lib/legal-data";

const categoryLabels: Record<LegalOrientation["category"], string> = {
  arrendamiento: "Arrendamiento",
  laboral: "Laboral",
  salud: "Salud",
  familia: "Familia",
  penal: "Penal y atención a víctimas",
  administrativo: "Administrativo",
  otro: "Ruta por definir",
};

const urgencyStyles: Record<LegalOrientation["urgency"], string> = {
  baja: "border-sky-200 bg-sky-50 text-sky-800",
  media: "border-amber-200 bg-amber-50 text-amber-800",
  alta: "border-rose-200 bg-rose-50 text-rose-800",
};

const legalKindLabels: Record<VerifiedLegalCitation["legal"]["kind"], string> = {
  constitucion: "Constitución",
  ley: "Ley",
  codigo: "Código",
  decreto: "Decreto",
  sentencia: "Sentencia",
};

type PreliminaryOrientationProps = {
  accountIndicator?: ReactNode;
  orientation: LegalOrientation;
  city: string;
  citations: VerifiedLegalCitation[];
  analysisMode: "ready" | "demo" | "ai";
  analysisDegraded: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (acknowledged: boolean) => void;
  onContinue: () => void;
  onEditStory: () => void;
};

export function PreliminaryOrientation({
  accountIndicator,
  orientation,
  city,
  citations,
  analysisMode,
  analysisDegraded,
  acknowledged,
  onAcknowledgedChange,
  onContinue,
  onEditStory,
}: PreliminaryOrientationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const norms = useMemo(
    () => citations.filter((source) => source.legal.kind !== "sentencia"),
    [citations],
  );
  const precedents = useMemo(
    () => citations.filter((source) => source.legal.kind === "sentencia"),
    [citations],
  );
  const highlightedCitations = useMemo(
    () => [...norms.slice(0, 1), ...precedents.slice(0, 1)],
    [norms, precedents],
  );

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [orientation.caseTitle]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f3ee] text-[#102238]">
      <header className="border-b border-slate-200/80 bg-[#fbfaf7] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#102238] text-emerald-300">
              <Scale className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-xl font-bold tracking-tight sm:text-2xl">Orientador Legal</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Colombia</p>
            </div>
          </div>
          {accountIndicator}
        </div>
      </header>

      <main className="px-4 py-7 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <section aria-labelledby="preliminary-heading">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Respuesta preliminar
              </Badge>
              <Badge variant="outline" className="rounded-md border-slate-200 bg-white text-slate-700">
                {categoryLabels[orientation.category]}
              </Badge>
              <Badge variant="outline" className={`rounded-md ${urgencyStyles[orientation.urgency]}`}>
                Prioridad {orientation.urgency}
              </Badge>
            </div>
            <h1
              id="preliminary-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.025em] outline-none sm:text-4xl"
            >
              {orientation.caseTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Esta es una primera lectura jurídica basada solo en tu relato para {city}. Confirma los hechos y abre las fuentes originales antes de tomar una decisión.
            </p>
          </section>

          {analysisMode === "demo" && (
            <section
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                analysisDegraded
                  ? "border-rose-200 bg-rose-50 text-rose-950"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
              role="status"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">
                  {analysisDegraded ? "La IA no estuvo disponible" : "Resultado generado en modo demostración"}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-80">
                  La clasificación es heurística. Las referencias jurídicas sí provienen del catálogo curado, pero su aplicación a tus hechos requiere verificación humana.
                </p>
              </div>
            </section>
          )}

          {orientation.urgency === "alta" && (
            <section className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950" role="alert">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-700" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">No esperes al análisis detallado si existe un riesgo o plazo actual</p>
                <p className="mt-1 text-xs leading-5 text-rose-900/80">
                  Si hay peligro para la vida o la integridad, usa primero los canales de emergencia. Si recibiste una notificación, audiencia o término, conserva el documento completo y busca revisión jurídica humana hoy.
                </p>
                {orientation.nextSteps[0] && (
                  <p className="mt-2 text-xs leading-5 text-rose-950">
                    <strong>Haz esto ahora:</strong> {orientation.nextSteps[0].title}. {orientation.nextSteps[0].detail}
                  </p>
                )}
                {orientation.freeHelp.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-rose-950">
                    {orientation.freeHelp.slice(0, 2).map((resource) => (
                      <li key={`${resource.name}-${resource.sourceId}`}>
                        <strong>{resource.name}:</strong> {resource.channel}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="grid gap-px bg-slate-100 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="bg-white p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Lo que entendimos</p>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">{orientation.plainSummary}</p>
              </div>
              <div className="bg-white p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Lo que indican las fuentes relacionadas</p>
                <h2 className="mt-3 font-serif text-xl font-semibold text-slate-950">Lectura jurídica preliminar</h2>
                <div className="mt-2 space-y-3 text-sm leading-6 text-slate-600">
                  {highlightedCitations.map((source) => (
                    <p key={source.id}>
                      <strong className="text-slate-900">{source.legal.citation}:</strong>{" "}
                      {source.legal.proposition}
                    </p>
                  ))}
                  {highlightedCitations.length === 0 && (
                    <p>No se identificó una regla concreta con suficiente respaldo para resumirla aquí. Solicita revisión jurídica humana antes de actuar.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="legal-support-heading">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                <Landmark className="size-[18px]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Sustento jurídico inicial</p>
                <h2 id="legal-support-heading" className="mt-1 font-serif text-2xl font-semibold">
                  Normas, códigos y sentencias relacionadas
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Esta es una relación preliminar entre tu relato y reglas generales. Cada sentencia resolvió hechos distintos: no decide tu caso ni garantiza un resultado. Su pertinencia depende de confirmar documentos, fechas, jurisdicción, competencia y términos.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <CitationGroup title="Normas y códigos" citations={norms} />
              <CitationGroup title="Jurisprudencia" citations={precedents} />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#173f6b]/20 bg-white shadow-sm" aria-labelledby="continue-heading">
            <div className="border-b border-slate-100 bg-[#102238] px-5 py-5 text-white sm:px-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">Tú decides el siguiente paso</p>
              <h2 id="continue-heading" className="mt-2 font-serif text-2xl font-semibold">¿Quieres avanzar a un análisis más detallado?</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                La siguiente etapa hará preguntas para precisar los hechos, las pruebas y los posibles trámites. El análisis automatizado puede contener errores u omisiones, interpretar mal tu relato o no detectar un plazo. No radica documentos ni sustituye la revisión jurídica humana.
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => onAcknowledgedChange(event.target.checked)}
                  aria-describedby="detailed-guidance-warning"
                  className="mt-0.5 size-4 shrink-0 accent-[#173f6b]"
                />
                <span id="detailed-guidance-warning" className="text-sm leading-6 text-slate-700">
                  {DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY}
                </span>
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  disabled={!acknowledged}
                  onClick={onContinue}
                  className="min-h-11 bg-[#173f6b] px-5 text-white hover:bg-[#102f51]"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Continuar con el análisis detallado
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="outline" onClick={onEditStory} className="min-h-11">
                  <Pencil className="size-4" aria-hidden="true" />
                  Corregir mi relato
                </Button>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                También puedes detenerte aquí y llevar esta respuesta preliminar y sus fuentes a un consultorio jurídico o entidad de orientación. Continuar no implica renunciar a tus derechos ni exonera a la plataforma de las obligaciones que le correspondan por ley.
              </p>
            </div>
          </section>

          <footer className="flex items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Catálogo jurídico verificado el 15 de agosto de 2026. La vigencia, los términos y la aplicación concreta deben comprobarse nuevamente antes de actuar.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function CitationGroup({
  title,
  citations,
}: {
  title: string;
  citations: VerifiedLegalCitation[];
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {citations.map((source) => (
          <article key={source.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700">
                {legalKindLabels[source.legal.kind]}
              </Badge>
              <span className="text-[10px] font-semibold text-slate-400">
                Verificada {source.legal.verifiedAt}
              </span>
            </div>
            <h4 className="mt-3 text-sm font-semibold leading-5 text-slate-950">{source.legal.citation}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-700">{source.legal.proposition}</p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
              <strong>Alcance:</strong> {source.legal.scopeNote}
            </p>
            {source.legal.effectiveAsOf && (
              <p className="mt-2 text-xs font-medium text-emerald-700">{source.legal.effectiveAsOf}</p>
            )}
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#173f6b] hover:underline"
            >
              Abrir fuente oficial
              <span className="sr-only">: {source.legal.citation} (abre en otra pestaña)</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </article>
        ))}
        {citations.length === 0 && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            {title === "Jurisprudencia"
              ? "No se seleccionó una sentencia concreta porque el relato aún no permite relacionar un precedente sin especular. Esto no significa que no exista jurisprudencia pertinente."
              : "No hay una norma concreta seleccionada con la información disponible. Solicita revisión jurídica humana antes de actuar."}
          </div>
        )}
      </div>
    </div>
  );
}
