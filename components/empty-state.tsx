"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Eraser,
  FileText,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneCall,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getEmptyUser,
  getUserSnapshot,
  subscribeStorage,
} from "@/lib/device-storage";
import {
  CaseElement,
  initialElements,
  initialOrientation,
  LegalOrientation,
} from "@/lib/legal-data";

export interface EmptyStateCasePayload {
  id?: string;
  story: string;
  city: string;
  orientation: LegalOrientation;
  elements: CaseElement[];
  mode: "demo" | "ai";
  degraded: boolean;
}

const demoStory = "Me quieren desalojar del apartamento en cinco días. Me avisaron por WhatsApp y tengo contrato escrito.";

export const demoCase: EmptyStateCasePayload = {
  story: demoStory,
  city: "Bogotá, D. C.",
  orientation: initialOrientation,
  elements: initialElements,
  mode: "demo",
  degraded: false,
};

interface StoryExample {
  id: string;
  label: string;
  story: string;
}

interface StoryExampleGroup {
  title: string;
  items: StoryExample[];
}

const storyExampleGroups: StoryExampleGroup[] = [
  {
    title: "Vivienda y arriendo",
    items: [
      {
        id: "arriendo-desalojo",
        label: "Me piden entregar el inmueble sin cumplir el preaviso",
        story:
          "Tengo contrato de arriendo de [vivienda / local] en [municipio o barrio] desde [fecha de inicio]. El arrendador me pidió entregar el inmueble el [fecha] por [WhatsApp / llamada / carta], dándome solo [número] días. El contrato [está vigente / venció el ...] y voy al día con el canon de [valor mensual].",
      },
      {
        id: "arriendo-problemas",
        label: "Problemas con el canon, reparaciones o depósito",
        story:
          "Tengo contrato de arriendo en [dirección o barrio] desde [fecha]. El arrendador [subió el canon, no me devuelve el depósito, no hace reparaciones] y en concreto lo que pasó fue [descripción breve]. Le pedí una explicación por escrito el [fecha] por [medio] y no he recibido respuesta.",
      },
    ],
  },
  {
    title: "Trabajo",
    items: [
      {
        id: "laboral-salario",
        label: "No me pagan salario o prestaciones",
        story:
          "Trabajo en [nombre de la empresa] desde [fecha de ingreso] como [cargo]. No me han pagado [salario, horas extras o prestaciones] correspondiente a [periodo pendiente]. Tengo [contrato escrito, desprendibles, mensajes] como soporte y ya reclamé por [medio] el [fecha del reclamo] sin recibir respuesta.",
      },
      {
        id: "laboral-despido",
        label: "Me despidieron y no me liquidaron",
        story:
          "Trabajé en [nombre de la empresa] desde [fecha de ingreso] hasta [fecha de salida] como [cargo]. Me despidieron el [fecha] y me dijeron que [motivo que me dieron]. No me han pagado la liquidación ni [prestaciones pendientes]. Tengo [contrato, comprobantes de pago, mensajes] como soporte.",
      },
    ],
  },
  {
    title: "Salud",
    items: [
      {
        id: "salud-negacion",
        label: "EPS o IPS niega o demora un servicio",
        story:
          "Estoy afiliado a la EPS [nombre]. El médico me ordenó [examen, cirugía, medicamento, terapia] el [fecha] y la EPS [no ha autorizado o negó] el servicio. Mi situación de salud hoy es [descripción breve]. Radiqué la solicitud el [fecha] con el radicado [número].",
      },
    ],
  },
  {
    title: "Familia",
    items: [
      {
        id: "familia-alimentos",
        label: "No me pagan la cuota alimentaria",
        story:
          "Tengo [cuántos] hijos de [edades]. El padre o la madre no paga la cuota alimentaria desde [fecha]. [Sí o no] existe un acuerdo o una decisión de una autoridad que fije la cuota. Los gastos mensuales de [alimentación, estudio, transporte] son aproximadamente [valor] y me comunico con esa persona por [medio].",
      },
      {
        id: "familia-custodia",
        label: "Custodia o visitas de mis hijos",
        story:
          "Mi hijo de [edad] vive con [con quién vive]. Quiero definir [la custodia o el régimen de visitas] porque [motivo breve]. [Sí o no] existe un acuerdo previo ante una autoridad y actualmente nos comunicamos por [medio].",
      },
    ],
  },
  {
    title: "Denuncias",
    items: [
      {
        id: "penal-denuncia",
        label: "Fui víctima de un robo, estafa o agresión",
        story:
          "El [fecha] en [lugar] fui víctima de [robo, estafa, agresión]. Lo que pasó fue [descripción breve de los hechos]. De la persona sé [datos que conozco]. Tengo [chats, recibos, fotos, testigos] como evidencia y sobre la denuncia: [ya denuncié con radicado número, o aún no he denunciado].",
      },
    ],
  },
  {
    title: "Entidades y juzgados",
    items: [
      {
        id: "administrativo-multa",
        label: "Recibí una multa o resolución de una entidad",
        story:
          "La entidad [nombre] me notificó [una multa, un comparendo, una resolución] el [fecha] por [motivo que indica el documento]. No estoy de acuerdo porque [razón breve]. Tengo [soportes que tengo] y el documento indica [recursos y plazos que aparecen allí].",
      },
      {
        id: "judicial-notificacion",
        label: "Me llegó una notificación o citación judicial",
        story:
          "Me llegó una notificación del juzgado [nombre o número] el [fecha], sobre un proceso de [tipo] con radicado [número]. Me la entregaron por [medio] y el documento dice que tengo [plazo que indica] para responder. Tengo [copia del documento y anexos].",
      },
    ],
  },
];

const placeholderPattern = /\[[^\][]+\]/g;

function buildElementsFromFacts(facts: string[]): CaseElement[] {
  return facts.map((fact, index) => ({
    id: `fact-${Date.now()}-${index}`,
    type: "hechos" as const,
    title: index === 0 ? "Relato inicial" : `Hecho detectado ${index + 1}`,
    detail: fact,
    status: "pendiente" as const,
  }));
}

export function EmptyState({
  onCaseReady,
  onBack,
}: {
  onCaseReady: (payload: EmptyStateCasePayload) => void;
  onBack: () => void;
}) {
  const user = useSyncExternalStore(subscribeStorage, getUserSnapshot, getEmptyUser);
  const [story, setStory] = useState("");
  const [city, setCity] = useState(user.city || "");
  const [consent, setConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [formError, setFormError] = useState("");
  const storyRef = useRef<HTMLTextAreaElement>(null);
  const pendingExampleRef = useRef<StoryExample | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (user.city && !city) {
      setCity(user.city);
    }
  }, [user.city, city]);

  const pendingPlaceholders = story.match(placeholderPattern)?.length ?? 0;

  function focusFirstPlaceholder() {
    const target = storyRef.current;
    if (!target) return;
    const match = placeholderPattern.exec(target.value);
    placeholderPattern.lastIndex = 0;
    if (match && typeof match.index === "number") {
      target.focus();
      target.setSelectionRange(match.index, match.index + match[0].length);
    }
  }

  function applyExample(example: StoryExample) {
    pendingExampleRef.current = example;
    setStory(example.story);
    setFormError("");
  }

  function clearStory() {
    pendingExampleRef.current = null;
    setStory("");
    setFormError("");
  }

  function toggleVoiceDictation() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFormError("Tu navegador no soporta dictado por voz. Puedes escribir tu caso en el cuadro de texto.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-CO";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(" ");
        setStory((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setFormError("No se pudo iniciar el micrófono. Revisa los permisos de audio en tu navegador.");
    }
  }

  async function handleSubmit() {
    const cleanStory = story.trim();
    const cleanCity = city.trim();

    if (cleanStory.length < 12) {
      setFormError("Cuéntanos qué pasó con más detalle para poder orientarte.");
      return;
    }
    if (!cleanCity) {
      setFormError("Indica el municipio o ciudad para saber qué autoridades aplican.");
      return;
    }
    if (!consent) {
      setFormError("Debes autorizar el procesamiento de tu relato para continuar.");
      return;
    }

    setFormError("");
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/orientar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story: cleanStory,
          city: cleanCity,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No fue posible analizar el caso");
      const result = payload as LegalOrientation & { mode?: "demo" | "ai"; degraded?: boolean };
      onCaseReady({
        story: cleanStory,
        city: cleanCity,
        orientation: result,
        elements: buildElementsFromFacts(result.extractedFacts),
        mode: result.mode === "ai" ? "ai" : "demo",
        degraded: Boolean(result.degraded),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos analizar el caso.";
      setFormError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900">
      {/* Header moderno */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
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
            <div>
              <h1 className="font-display text-sm font-bold text-slate-900">Orientador Legal</h1>
              <p className="text-[11px] text-slate-500 font-medium">Asesoría jurídica ciudadana con IA</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start gap-4 px-5 pt-5 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Líneas de emergencia compactas */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px]">
            <ShieldAlert className="size-3.5 text-rose-600 shrink-0" />
            <span>¿Emergencia inmediata? Contacto directo:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <a
              href="tel:123"
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 shadow-2xs border border-rose-200 hover:bg-rose-50"
            >
              <PhoneCall className="size-2.5" /> Policía 123
            </a>
            <a
              href="tel:155"
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-purple-700 shadow-2xs border border-purple-200 hover:bg-purple-50"
            >
              <PhoneCall className="size-2.5" /> Línea Púrpura 155
            </a>
            <a
              href="tel:141"
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-2xs border border-blue-200 hover:bg-blue-50"
            >
              <PhoneCall className="size-2.5" /> Niñez ICBF 141
            </a>
            <a
              href="tel:122"
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-2xs border border-slate-200 hover:bg-slate-50"
            >
              <PhoneCall className="size-2.5" /> Fiscalía 122
            </a>
          </div>
        </div>

        {/* Tarjeta de relato principal */}
        <div className="app-card space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="empty-state-story" className="text-xs font-bold text-slate-900">
                Describe tu situación o problema
              </Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleVoiceDictation}
                  title="Dictar por voz"
                  className="gap-1 text-[11px] h-7 px-2.5"
                >
                  {isListening ? (
                    <MicOff className="size-3 animate-pulse" />
                  ) : (
                    <Mic className="size-3 text-slate-600" />
                  )}
                  {isListening ? "Escuchando..." : "Dictar"}
                </Button>

                <DropdownMenu
                  onOpenChange={(open) => {
                    if (!open) requestAnimationFrame(focusFirstPlaceholder);
                  }}
                  onOpenChangeComplete={(open) => {
                    if (!open) focusFirstPlaceholder();
                  }}
                >
                  <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="text-[11px] h-7 px-2.5" />}>
                    <FileText className="text-emerald-600 size-3" />
                    <span>Plantillas</span>
                    <ChevronDown className="text-slate-400 size-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-[min(60dvh,26rem)] w-[min(21rem,calc(100vw-3rem))] p-1.5"
                  >
                    {storyExampleGroups.map((group) => (
                      <Fragment key={group.title}>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="px-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            {group.title}
                          </DropdownMenuLabel>
                          {group.items.map((item) => (
                            <DropdownMenuItem
                              key={item.id}
                              onClick={() => applyExample(item)}
                              className="items-start gap-2.5 px-2 py-2 text-xs whitespace-normal"
                            >
                              <FileText className="mt-0.5 text-emerald-600 size-3.5 shrink-0" />
                              <span>{item.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                      </Fragment>
                    ))}
                    <DropdownMenuItem
                      onClick={clearStory}
                      className="gap-2.5 px-2 py-2 text-xs text-slate-500"
                    >
                      <Eraser className="size-3.5" />
                      Escribir desde cero
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Textarea
              id="empty-state-story"
              ref={storyRef}
              value={story}
              onChange={(event) => setStory(event.target.value)}
              rows={5}
              minLength={12}
              maxLength={6000}
              placeholder="Escribe lo que ocurrió en tus propias palabras (fechas, personas involucradas, qué te solicitan o reclaman)..."
              className="w-full resize-none text-xs leading-relaxed rounded-2xl border-slate-200 bg-white"
            />

            {pendingPlaceholders > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>
                  {pendingPlaceholders === 1
                    ? "Queda 1 campo [entre corchetes] por completar."
                    : `Quedan ${pendingPlaceholders} campos [entre corchetes] por completar.`}
                </span>
              </p>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="empty-state-city" className="text-xs">Municipio o ciudad del caso</Label>
              <Input
                id="empty-state-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ej. Bogotá, D.C."
                minLength={2}
                maxLength={120}
                className="text-xs h-9"
              />
            </div>
            <Button
              type="button"
              disabled={isAnalyzing}
              onClick={handleSubmit}
              className="self-end bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-9 px-5 shadow-xs"
            >
              {isAnalyzing ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {isAnalyzing ? "Analizando normas..." : "Orientarme Ahora"}
            </Button>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 size-3.5 accent-slate-900"
            />
            <span className="text-[11px] leading-4 text-slate-600">
              Autorizo organizar mi caso con el orientador legal. Los datos no salen de tu dispositivo.
            </span>
          </label>

          {formError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              <AlertTriangle className="size-4 shrink-0 text-rose-600" /> {formError}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Orientación ciudadana informativa · Normas y jurisprudencia colombiana
        </p>
      </main>
    </div>
  );
}
