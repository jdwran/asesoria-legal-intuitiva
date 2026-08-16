"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Info,
  Landmark,
  LoaderCircle,
  MapPin,
  Menu,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LegalEmptyState } from "@/components/legal-empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CaseElement,
  CaseElementType,
  getOfficialSources,
  initialElements,
  initialOrientation,
  LegalOrientation,
  type OfficialSource,
} from "@/lib/legal-data";
import {
  EXTERNAL_PROCESSING_COPY,
  ORIENTATION_FORM_ERRORS,
  PROCESSING_CONSENT_COPY,
  isOrientationFormReady,
} from "@/lib/orientation-form";

type NavKey = "resumen" | CaseElementType | "ruta";
type AnalysisProvider = "demo" | "open" | "openai";
type AnalysisMode = "ready" | "demo" | "ai";
type OrientationApiResponse = LegalOrientation & {
  mode?: "demo" | "ai";
  degraded?: boolean;
  provider?: AnalysisProvider;
  fallbackUsed?: boolean;
};

const ORIENTATION_REQUEST_TIMEOUT_MS = 90_000;

async function requestOrientation(input: {
  story: string;
  city: string;
  processingConsent: true;
}): Promise<OrientationApiResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(new DOMException("La solicitud tardó demasiado.", "TimeoutError")),
    ORIENTATION_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch("/api/orientar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const responseText = await response.text();
    let payload: unknown;

    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const serverMessage =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `No fue posible analizar el caso (${response.status}).`;
      throw new Error(serverMessage);
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("El servidor respondió en un formato inesperado.");
    }

    return payload as OrientationApiResponse;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("El análisis tardó demasiado. Intenta nuevamente en unos minutos.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

const navGroups: Array<{
  label: string;
  items: Array<{
    id: NavKey;
    label: string;
    icon: typeof FileText;
  }>;
}> = [
  {
    label: "Tu caso",
    items: [
      { id: "resumen", label: "Vista general", icon: FolderOpen },
      { id: "hechos", label: "Lo que pasó", icon: ClipboardCheck },
      { id: "personas", label: "Personas y entidades", icon: Users },
      { id: "fechas", label: "Fechas clave", icon: CalendarDays },
    ],
  },
  {
    label: "Lo que lo respalda",
    items: [
      { id: "pruebas", label: "Pruebas", icon: Paperclip },
      { id: "normas", label: "Fuentes oficiales", icon: BookOpen },
      { id: "documentos", label: "Documentos", icon: FileText },
    ],
  },
  {
    label: "Actuar",
    items: [{ id: "ruta", label: "Ruta recomendada", icon: Compass }],
  },
];

const typeLabels: Record<CaseElementType, string> = {
  hechos: "Hecho",
  personas: "Persona o entidad",
  pruebas: "Prueba",
  fechas: "Fecha clave",
  normas: "Fuente oficial",
  documentos: "Documento",
};

const urgencyStyles = {
  baja: "border-sky-200 bg-sky-50 text-sky-800",
  media: "border-amber-200 bg-amber-50 text-amber-800",
  alta: "border-rose-200 bg-rose-50 text-rose-800",
};

function CaseNavigation({
  activeSection,
  setActiveSection,
  elements,
  onAdd,
  caseTitle,
  city,
  completeness,
  onNavigate,
}: {
  activeSection: NavKey;
  setActiveSection: (section: NavKey) => void;
  elements: CaseElement[];
  onAdd: () => void;
  caseTitle: string;
  city: string;
  completeness: number;
  onNavigate?: () => void;
}) {
  const getCount = (id: NavKey) => {
    if (id === "resumen" || id === "ruta") return null;
    return elements.filter((element) => element.type === id).length;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <button
          className="group w-full text-left"
          onClick={() => {
            setActiveSection("resumen");
            onNavigate?.();
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Caso activo
            </span>
            <MoreHorizontal className="size-4 text-slate-500 transition group-hover:text-white" />
          </div>
          <p className="text-sm font-semibold leading-5 text-white">{caseTitle}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="size-3.5" />
            {city}
          </div>
        </button>
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[11px] text-slate-400">
            <span>{Math.round((completeness / 100) * 6)} de 6 tipos de pieza</span>
            <span className="font-medium text-emerald-300">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-1.5 bg-white/10 [&>div]:bg-emerald-400" />
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Piezas del caso">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeSection;
                const count = getCount(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      onNavigate?.();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-white/10 font-medium text-white shadow-sm"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Icon className={`size-4 ${active ? "text-emerald-300" : "text-slate-500"}`} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {count !== null && (
                      <span className={`text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Button
          onClick={onAdd}
          className="h-10 w-full bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300"
        >
          <Plus className="size-4" />
          Agregar al expediente
        </Button>
      </div>
    </div>
  );
}

export function LegalWorkspace() {
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const [activeSection, setActiveSection] = useState<NavKey>("resumen");
  const [elements, setElements] = useState<CaseElement[]>(initialElements);
  const [orientation, setOrientation] = useState<LegalOrientation>(initialOrientation);
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [caseDialogMode, setCaseDialogMode] = useState<"new" | "edit">("new");
  const [addOpen, setAddOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [story, setStory] = useState("");
  const [savedStory, setSavedStory] = useState("");
  const [city, setCity] = useState("");
  const [processingConsent, setProcessingConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("ready");
  const [analysisProvider, setAnalysisProvider] = useState<AnalysisProvider | null>(null);
  const [hasAnalyzedCase, setHasAnalyzedCase] = useState(false);
  const [analysisFallbackUsed, setAnalysisFallbackUsed] = useState(false);
  const [analysisDegraded, setAnalysisDegraded] = useState(false);
  const [notice, setNotice] = useState("IA lista para organizar tu caso");
  const [formError, setFormError] = useState("");
  const [triageAnswers, setTriageAnswers] = useState<Record<number, string>>({});
  const [triageSaved, setTriageSaved] = useState(false);
  const [triageError, setTriageError] = useState("");
  const [newElement, setNewElement] = useState<{
    type: CaseElementType;
    title: string;
    detail: string;
    date: string;
  }>({ type: "pruebas", title: "", detail: "", date: "" });

  const sources = useMemo(() => getOfficialSources(orientation.sourceIds), [orientation.sourceIds]);
  const savedSourceIds = useMemo(
    () => new Set(elements.filter((element) => element.type === "normas" && element.sourceId).map((element) => element.sourceId as string)),
    [elements],
  );
  const savedSources = useMemo(() => getOfficialSources([...savedSourceIds]), [savedSourceIds]);
  const suggestedSources = useMemo(
    () => sources.filter((source) => !savedSourceIds.has(source.id)),
    [savedSourceIds, sources],
  );
  const allRelevantSources = useMemo(
    () => [...new Map([...savedSources, ...sources].map((source) => [source.id, source])).values()],
    [savedSources, sources],
  );
  const isSummaryDocument = useMemo(
    () => ["resumen-familia", "resumen-urgente", "resumen-general"].includes(orientation.documentKind),
    [orientation.documentKind],
  );
  const evidenceCount = useMemo(
    () => elements.filter((element) => element.type === "pruebas").length,
    [elements],
  );

  useEffect(() => {
    if (!hasAnalyzedCase) return;
    const frame = window.requestAnimationFrame(() => {
      resultHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasAnalyzedCase]);

  const filteredElements = useMemo(() => {
    if (activeSection === "resumen" || activeSection === "ruta") return [];
    return elements.filter((element) => element.type === activeSection);
  }, [activeSection, elements]);

  const completeness = useMemo(() => {
    const covered = new Set(elements.map((element) => element.type)).size;
    return Math.min(100, Math.round((covered / 6) * 100));
  }, [elements]);

  const draftText = useMemo(() => {
    const requestsByDocumentKind: Partial<Record<LegalOrientation["documentKind"], string[]>> = {
      "arrendamiento-comunicacion": [
        "Informar por escrito la causa y el fundamento de la terminación comunicada.",
        "Remitir copia de los documentos que soportan dicha decisión.",
        "Precisar la fecha y el procedimiento que se propone seguir.",
      ],
      "reclamacion-laboral": [
        "Informar el estado de los salarios y prestaciones pendientes.",
        "Realizar el pago de los valores adeudados que sean reconocidos por el empleador.",
        "Entregar una respuesta escrita y los soportes de liquidación correspondientes.",
      ],
      "solicitud-salud": [
        "Dar respuesta prioritaria a la solicitud del servicio de salud ordenado.",
        "Informar la fecha, lugar y condiciones para prestar el servicio.",
        "Si existe una negativa, explicar por escrito sus razones y el canal para controvertirla.",
      ],
      "medida-proteccion": [
        "Valorar de manera inmediata la situación de riesgo descrita.",
        "Informar y adoptar las medidas de protección que correspondan dentro de sus competencias.",
        "Indicar un canal seguro para recibir notificaciones.",
      ],
      "relato-denuncia": [
        "Recibir este relato y orientar el canal competente para formalizar la denuncia.",
        "Registrar los anexos entregados y suministrar el número de noticia criminal o radicado.",
        "Informar un canal seguro para consultar el estado del trámite.",
      ],
      "solicitud-administrativa": [
        "Remitir copia íntegra del acto, expediente y constancia de notificación.",
        "Informar los recursos que proceden y la autoridad ante la cual deben presentarse.",
        "Dar una respuesta de fondo por el canal de notificación indicado.",
      ],
    };
    const summaryDocumentKinds: LegalOrientation["documentKind"][] = [
      "resumen-familia",
      "resumen-urgente",
      "resumen-general",
    ];

    if (summaryDocumentKinds.includes(orientation.documentKind)) {
      return `BORRADOR — ${orientation.recommendedDocument.toUpperCase()}

${city}, 15 de agosto de 2026

OBJETIVO
${orientation.documentReason}

LO QUE SE HA INFORMADO
${orientation.extractedFacts.map((fact, index) => `${index + 1}. ${fact}`).join("\n")}

PIEZAS DEL EXPEDIENTE
${elements.map((element, index) => `${index + 1}. [${typeLabels[element.type]}] ${element.title}: ${element.detail}${element.sourceUrl ? `\n   Fuente: ${element.sourceUrl}` : ""}`).join("\n") || "Aún no se han agregado piezas."}

PREGUNTAS PARA QUIEN REVISE EL CASO
${orientation.triageQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n") || "No se registraron preguntas pendientes."}

FUENTES SUGERIDAS PARA VERIFICAR
${allRelevantSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}

Este resumen organiza información para revisión humana. No es una contestación, recurso, denuncia ni documento radicado, y no suspende ni modifica ningún plazo.`;
    }

    const requests = requestsByDocumentKind[orientation.documentKind] ?? [];

    return `BORRADOR — ${orientation.recommendedDocument.toUpperCase()}

${city}, 15 de agosto de 2026

Señor(a)
[NOMBRE DE LA PERSONA O ENTIDAD DESTINATARIA]

Asunto: Solicitud relacionada con ${orientation.caseTitle.toLowerCase()}

Yo, [NOMBRE COMPLETO], identificado(a) con [TIPO Y NÚMERO DE DOCUMENTO], presento respetuosamente la siguiente solicitud:

HECHOS
${orientation.extractedFacts.map((fact, index) => `${index + 1}. ${fact}`).join("\n")}

SOLICITUDES
${requests.map((request, index) => `${index + 1}. ${request}`).join("\n")}

ANEXOS
${elements
  .filter((element) => element.type === "pruebas")
  .map((element, index) => `${index + 1}. ${element.title}`)
  .join("\n")}

Notificaciones: [CORREO / DIRECCIÓN]

Atentamente,
[NOMBRE COMPLETO]

FUENTES SUGERIDAS PARA VERIFICAR
${allRelevantSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}

Este es un borrador informativo. Revisa los datos y, si es posible, solicita orientación jurídica antes de radicarlo.`;
  }, [allRelevantSources, city, elements, orientation]);

  const draftFilename = useMemo(() => {
    const slug = orientation.recommendedDocument
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `borrador-${slug || "orientacion-legal"}.txt`;
  }, [orientation.recommendedDocument]);

  function openCaseDialog(mode: "new" | "edit") {
    setCaseDialogMode(mode);
    setStory(mode === "new" ? "" : savedStory);
    setProcessingConsent(false);
    setFormError("");
    setNewCaseOpen(true);
  }

  async function analyzeCase() {
    const cleanStory = story.trim();
    const cleanCity = city.trim();
    if (cleanStory.length < 12) {
      setFormError(ORIENTATION_FORM_ERRORS.story);
      return;
    }
    if (cleanCity.length < 2) {
      setFormError(ORIENTATION_FORM_ERRORS.city);
      return;
    }
    if (!processingConsent) {
      setFormError(ORIENTATION_FORM_ERRORS.consent);
      return;
    }
    setFormError("");
    setIsAnalyzing(true);
    setNotice("Organizando tu relato…");

    try {
      const result = await requestOrientation({ story: cleanStory, city: cleanCity, processingConsent: true });
      setOrientation(result);
      setSavedStory(cleanStory);
      setHasAnalyzedCase(true);
      setAnalysisMode(result.mode === "ai" ? "ai" : "demo");
      setAnalysisProvider(result.provider ?? (result.mode === "ai" ? "openai" : "demo"));
      setAnalysisFallbackUsed(Boolean(result.fallbackUsed));
      setAnalysisDegraded(Boolean(result.degraded));
      const detectedFacts = result.extractedFacts.map((fact, index) => ({
          id: `fact-${Date.now()}-${index}`,
          type: "hechos" as const,
          title: index === 0 ? "Relato inicial" : `Hecho detectado ${index + 1}`,
          detail: fact,
          status: "pendiente" as const,
        }));
      setElements((current) =>
        caseDialogMode === "new"
          ? detectedFacts
          : [
              ...detectedFacts,
              ...current.filter(
                (element) =>
                  !(
                    element.type === "hechos" &&
                    (element.title === "Relato inicial" || element.title.startsWith("Hecho detectado"))
                  ),
              ),
            ],
      );
      setTriageAnswers({});
      setTriageSaved(false);
      setTriageError("");
      setCompletedSteps([]);
      setActiveSection("resumen");
      setNewCaseOpen(false);
      setNotice(
        result.degraded
          ? "IA no disponible · se mostró una ruta de demostración"
          : result.provider === "open"
            ? "Caso organizado con un modelo abierto · revisa lo que entendimos"
            : result.fallbackUsed
              ? "El modelo abierto no respondió · OpenAI organizó el caso"
              : "Caso organizado con OpenAI · revisa lo que entendimos",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos analizar el caso.";
      setFormError(message);
      setNotice("No pudimos analizar el caso");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function refineCaseWithTriage() {
    setTriageError("");
    const confirmed = orientation.triageQuestions
      .slice(0, 2)
      .map((question, index) => ({ question, answer: triageAnswers[index]?.trim() ?? "" }))
      .filter((item) => item.answer);

    if (!confirmed.length) {
      setTriageError("Responde al menos una pregunta antes de actualizar la ruta.");
      setNotice("Responde al menos una pregunta para actualizar la ruta");
      return;
    }

    setIsRefining(true);
    setNotice("Actualizando la ruta con tus respuestas…");
    const timestamp = Date.now();
    const answerElements = confirmed.map((item, index) => ({
        id: `triage-${timestamp}-${index}`,
        type: "hechos" as const,
        title: `Dato confirmado ${index + 1}`,
        detail: `${item.question} ${item.answer}`,
        status: "listo" as const,
      }));

    try {
      const enrichedStory = `${savedStory}\n\nInformación adicional confirmada:\n${confirmed
        .map((item) => `- ${item.question} ${item.answer}`)
        .join("\n")}`;
      const result = await requestOrientation({ story: enrichedStory, city: city.trim(), processingConsent: true });
      setOrientation(result);
      setAnalysisMode(result.mode === "ai" ? "ai" : "demo");
      setAnalysisProvider(result.provider ?? (result.mode === "ai" ? "openai" : "demo"));
      setAnalysisFallbackUsed(Boolean(result.fallbackUsed));
      setAnalysisDegraded(Boolean(result.degraded));
      setCompletedSteps([]);
      setElements((current) => [...current, ...answerElements]);
      setTriageSaved(true);
      setTriageError("");
      setNotice(
        result.degraded
          ? "Respuestas guardadas · la ruta mostrada es solo demostrativa"
          : result.provider === "open"
            ? "Ruta actualizada con el modelo abierto"
            : result.fallbackUsed
              ? "Modelo abierto no disponible · ruta actualizada con OpenAI"
              : "Ruta actualizada con OpenAI",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Intenta de nuevo.";
      setTriageError(`No se guardaron las respuestas ni se actualizó la ruta. ${message}`);
      setNotice("No se guardaron las respuestas; intenta de nuevo");
    } finally {
      setIsRefining(false);
    }
  }

  function addElement() {
    if (!newElement.title.trim()) return;
    const item: CaseElement = {
      id: `${newElement.type}-${Date.now()}`,
      type: newElement.type,
      title: newElement.title.trim(),
      detail: newElement.detail.trim() || "Agregado por la persona usuaria.",
      date: newElement.date || undefined,
      status: "pendiente",
    };
    setElements((current) => [...current, item]);
    setActiveSection(newElement.type);
    setNewElement({ type: "pruebas", title: "", detail: "", date: "" });
    setAddOpen(false);
    setNotice(`${typeLabels[item.type]} agregado al expediente`);
  }

  function toggleStep(index: number) {
    setCompletedSteps((current) =>
      current.includes(index) ? current.filter((step) => step !== index) : [...current, index],
    );
  }

  function confirmElement(id: string) {
    setElements((current) =>
      current.map((element) => (element.id === id ? { ...element, status: "listo" } : element)),
    );
    setNotice("Dato confirmado");
  }

  function addOfficialSource(source: OfficialSource) {
    setElements((current) => {
      if (current.some((element) => element.type === "normas" && (element.sourceId === source.id || element.title === source.shortTitle))) {
        return current;
      }
      return [
        ...current,
        {
          id: `norm-${source.id}`,
          type: "normas",
          title: source.shortTitle,
          detail: `${source.title} · ${source.organization}`,
          status: "listo",
          sourceId: source.id,
          sourceUrl: source.url,
        },
      ];
    });
    setNotice(`${source.shortTitle} agregada al expediente`);
  }

  function downloadText(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice("Borrador descargado · revísalo antes de usarlo");
  }

  function downloadCaseFile() {
    const caseFile = `ORIENTADOR LEGAL — CARPETA DEL CASO

${orientation.caseTitle}
Categoría: ${orientation.category}
Ciudad: ${city}

LO QUE ENTENDIMOS
${orientation.plainSummary}

PIEZAS DEL EXPEDIENTE
${elements.map((element, index) => `${index + 1}. [${typeLabels[element.type]}] ${element.title}\n   ${element.detail}${element.sourceUrl ? `\n   Fuente: ${element.sourceUrl}` : ""}`).join("\n")}

RUTA SUGERIDA
${orientation.nextSteps.map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`).join("\n")}

FUENTES OFICIALES SUGERIDAS PARA VERIFICAR
${allRelevantSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}

AVISO
Orientación preliminar con fuentes oficiales sugeridas para verificación. No reemplaza la revisión de un profesional ni garantiza un resultado.`;
    downloadText("carpeta-orientador-legal.txt", caseFile);
  }

  const sectionTitle =
    navGroups.flatMap((group) => group.items).find((item) => item.id === activeSection)?.label ?? "Vista general";

  if (!hasAnalyzedCase) {
    return (
      <LegalEmptyState
        story={story}
        city={city}
        processingConsent={processingConsent}
        isAnalyzing={isAnalyzing}
        formError={formError}
        onStoryChange={(nextStory) => {
          setStory(nextStory);
          setFormError("");
        }}
        onCityChange={(nextCity) => {
          setCity(nextCity);
          setFormError("");
        }}
        onConsentChange={(nextProcessingConsent) => {
          setProcessingConsent(nextProcessingConsent);
          setFormError("");
        }}
        onSubmit={analyzeCase}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f3ee] text-slate-950">
      <div className="sr-only" role="status" aria-live="polite">{notice}</div>
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-slate-200/90 bg-[#fbfaf7]/95 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Sheet open={caseMenuOpen} onOpenChange={setCaseMenuOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir expediente" />}
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[310px] border-0 bg-[#102238] p-0 text-white">
              <SheetHeader className="sr-only">
                <SheetTitle>Expediente del caso</SheetTitle>
                <SheetDescription>Navega por las piezas de tu caso.</SheetDescription>
              </SheetHeader>
              <div className="h-full pt-16">
                <CaseNavigation
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                  elements={elements}
                  onAdd={() => {
                    setCaseMenuOpen(false);
                    setAddOpen(true);
                  }}
                  caseTitle={orientation.caseTitle}
                  city={city}
                  completeness={completeness}
                  onNavigate={() => setCaseMenuOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-[#102238] text-emerald-300 shadow-sm">
              <Scale className="size-[19px]" strokeWidth={2.2} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold tracking-tight text-[#102238]">Orientador Legal</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Colombia</p>
            </div>
          </div>

          <Separator orientation="vertical" className="mx-2 hidden h-7 md:block" />

          <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
            <FolderOpen className="size-4 text-slate-400" />
            <span className="truncate font-medium text-slate-700">{orientation.caseTitle}</span>
            <Badge variant="outline" className={`ml-1 rounded-md text-[10px] ${urgencyStyles[orientation.urgency]}`}>
              Prioridad {orientation.urgency}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 xl:flex" role="status" aria-live="polite">
            <Check className="size-3.5 text-emerald-600" />
            {notice}
          </span>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Buscar en el expediente (próximamente)" title="Búsqueda disponible en el siguiente corte" disabled>
            <Search className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Ayuda (próximamente)" title="Centro de ayuda disponible en el siguiente corte" disabled>
            <CircleHelp className="size-4" />
          </Button>
          <Button onClick={() => openCaseDialog("new")} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
            <Pencil className="size-4" />
            <span className="hidden sm:inline">{hasAnalyzedCase ? "Reemplazar caso" : "Crear mi caso"}</span>
            <span className="sm:hidden">{hasAnalyzedCase ? "Reemplazar" : "Crear caso"}</span>
          </Button>
          <div className="ml-1 grid size-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">LM</div>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[270px_minmax(0,1fr)] 2xl:grid-cols-[270px_minmax(560px,1fr)_360px]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] bg-[#102238] lg:block">
          <CaseNavigation
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            elements={elements}
            onAdd={() => setAddOpen(true)}
            caseTitle={orientation.caseTitle}
            city={city}
            completeness={completeness}
          />
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Expediente OL-2026-0815</span>
                  <ChevronRight className="size-3" />
                  <span className="text-slate-800">{sectionTitle}</span>
                </div>
                <h1
                  ref={resultHeadingRef}
                  tabIndex={-1}
                  className="font-serif text-3xl font-semibold tracking-[-0.025em] text-[#102238] outline-none sm:text-[2.2rem]"
                >
                  {activeSection === "resumen" ? orientation.caseTitle : sectionTitle}
                </h1>
                {activeSection === "resumen" && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {city}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-3.5" /> Creado hoy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-violet-500" />
                      {analysisMode === "ready"
                        ? "Listo para analizar con IA"
                        : analysisMode === "demo"
                          ? "Modo demostración"
                        : analysisProvider === "open"
                          ? "Organizado con IA abierta"
                          : analysisFallbackUsed
                            ? "OpenAI · respaldo"
                            : "Organizado con OpenAI"}
                    </span>
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon" aria-label="Más opciones del caso" />}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openCaseDialog("edit")}>
                    <Pencil className="size-4" /> Editar relato
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadCaseFile}>
                    <Download className="size-4" /> Descargar carpeta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {analysisMode === "demo" && (
              <section className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${analysisDegraded ? "border-rose-200 bg-rose-50 text-rose-950" : "border-amber-200 bg-amber-50 text-amber-950"}`} role="status">
                <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${analysisDegraded ? "text-rose-700" : "text-amber-700"}`} />
                <div>
                  <p className="text-sm font-semibold">
                    {analysisDegraded ? "La IA no estuvo disponible" : "Estás viendo el modo demostración"}
                  </p>
                  <p className="mt-1 text-xs leading-5 opacity-80">
                    La clasificación es heurística y no está validada para actuar. En esta demo pública usa solo datos ficticios; no incluyas nombres, documentos de identidad, direcciones ni información sensible. Confirma los hechos, abre las fuentes originales y busca revisión humana antes de presentar un documento o dejar vencer un plazo.
                  </p>
                </div>
              </section>
            )}

            {activeSection === "resumen" && (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ClipboardCheck className="size-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold text-slate-900">Esto fue lo que entendimos</h2>
                        <Button variant="ghost" size="sm" onClick={() => openCaseDialog("edit")} className="h-7 text-xs text-slate-500">
                          <Pencil className="size-3" /> Editar
                        </Button>
                      </div>
                      <p className="mt-2 text-[15px] leading-7 text-slate-600">{orientation.plainSummary}</p>
                    </div>
                  </div>
                  <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
                    <div className="bg-white px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Tipo de caso</p>
                      <p className="mt-1.5 text-sm font-semibold capitalize text-slate-800">{orientation.category}</p>
                    </div>
                    <div className="bg-white px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Piezas reunidas</p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-800">{elements.length} en el expediente</p>
                    </div>
                    <div className="bg-white px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Próxima acción</p>
                      <p className="mt-1.5 text-sm font-semibold text-[#173f6b]">{orientation.nextSteps[1]?.title ?? orientation.nextSteps[0]?.title}</p>
                    </div>
                  </div>
                </section>

                {!triageSaved && orientation.triageQuestions.length > 0 && (
                  <section className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                        <Info className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-amber-950">Dos datos para afinar tu ruta</p>
                            <p className="mt-1 text-sm text-amber-800/80">No son preguntas de chat: quedarán dentro del expediente.</p>
                          </div>
                          <Badge className="rounded-md bg-amber-100 text-amber-800">Por confirmar</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {orientation.triageQuestions.slice(0, 2).map((question, index) => (
                            <label key={question} className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-800">{question}</span>
                              <Input
                                value={triageAnswers[index] ?? ""}
                                onChange={(event) =>
                                  setTriageAnswers((current) => ({ ...current, [index]: event.target.value }))
                                }
                                placeholder="Escribe una respuesta corta"
                                className="border-amber-200 bg-white"
                              />
                            </label>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          disabled={isRefining}
                          className="mt-4 bg-amber-900 text-white hover:bg-amber-800"
                          onClick={refineCaseWithTriage}
                        >
                          {isRefining ? <LoaderCircle className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                          {isRefining ? "Actualizando ruta…" : "Guardar y actualizar ruta"}
                        </Button>
                        {triageError && (
                          <p className="mt-3 flex items-start gap-2 text-sm font-medium text-rose-700" role="alert">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            {triageError}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Expediente visual</p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Piezas de tu caso</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)} className="text-[#173f6b]">
                      <Plus className="size-4" /> Agregar pieza
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {elements.slice(0, 4).map((element) => (
                      <article key={element.id} className="group border-l-2 border-slate-300 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-emerald-500 hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="grid size-8 shrink-0 place-items-center bg-slate-50 text-slate-500">
                            {element.type === "pruebas" ? <Paperclip className="size-4" /> : <FileText className="size-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{element.title}</p>
                              {element.status === "listo" ? (
                                <Check className="size-4 shrink-0 text-emerald-600" />
                              ) : (
                                <span className="size-2 shrink-0 rounded-full bg-amber-400" />
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{element.detail}</p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                {typeLabels[element.type]}
                              </span>
                              {element.status !== "listo" && (
                                <button onClick={() => confirmElement(element.id)} className="text-xs font-medium text-[#173f6b] hover:underline">
                                  Confirmar dato
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-[#102238] px-5 py-5 text-white shadow-lg shadow-slate-900/5 sm:px-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-400 text-slate-950">
                        <FileCheck2 className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Tu siguiente resultado: {orientation.recommendedDocument}</p>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">{orientation.documentReason}</p>
                      </div>
                    </div>
                    <Button onClick={() => setDocumentOpen(true)} className="shrink-0 bg-white text-[#102238] hover:bg-slate-100">
                      Ver borrador
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "ruta" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Entender → preparar → actuar</p>
                      <p className="mt-1 text-sm text-slate-500">Marca cada paso cuando lo completes. La ruta se puede compartir con quien revise tu caso.</p>
                    </div>
                    <div className="min-w-40">
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>Progreso</span>
                        <span>{Math.round((completedSteps.length / orientation.nextSteps.length) * 100)}%</span>
                      </div>
                      <Progress value={(completedSteps.length / orientation.nextSteps.length) * 100} />
                    </div>
                  </div>
                </div>

                <ol className="space-y-0">
                  {orientation.nextSteps.map((step, index) => {
                    const complete = completedSteps.includes(index);
                    return (
                      <li key={step.title} className="relative grid grid-cols-[40px_1fr] gap-4 pb-5 last:pb-0">
                        {index < orientation.nextSteps.length - 1 && (
                          <span className="absolute left-5 top-10 h-[calc(100%-1.5rem)] w-px bg-slate-300" />
                        )}
                        <button
                          onClick={() => toggleStep(index)}
                          aria-label={complete ? `Marcar ${step.title} como pendiente` : `Marcar ${step.title} como completo`}
                          className={`relative z-10 grid size-10 place-items-center rounded-full border-2 transition ${
                            complete
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : index === completedSteps.length
                                ? "border-[#173f6b] bg-white text-[#173f6b]"
                                : "border-slate-300 bg-[#f4f3ee] text-slate-400"
                          }`}
                        >
                          {complete ? <Check className="size-4" /> : <span className="text-sm font-bold">{index + 1}</span>}
                        </button>
                        <article className={`rounded-xl border p-5 ${complete ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{step.title}</p>
                              <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.detail}</p>
                            </div>
                            <Badge variant="outline" className="rounded-md bg-white text-[10px]">
                              {complete ? "Completado" : index === completedSteps.length ? "Haz esto ahora" : "Después"}
                            </Badge>
                          </div>
                          <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                            <Info className="mt-0.5 size-3.5 shrink-0" />
                            <span>Disponibilidad, requisitos y duración varían según la entidad. Confírmalos en el canal oficial.</span>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {activeSection !== "resumen" && activeSection !== "ruta" && activeSection !== "documentos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm text-slate-600">
                    {filteredElements.length === 1 ? "1 pieza guardada" : `${filteredElements.length} piezas guardadas`} en esta sección.
                  </p>
                  <Button size="sm" onClick={() => setAddOpen(true)} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
                    <Plus className="size-4" /> Agregar
                  </Button>
                </div>

                {activeSection === "normas" && suggestedSources.map((source) => (
                  <article key={source.id} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                        <Landmark className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-slate-900">{source.shortTitle}</h2>
                          <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                            Fuente oficial
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{source.title}</p>
                        <p className="mt-3 text-xs text-slate-500">{source.organization} · verifica vigencia y contenido en el sitio original</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#173f6b] hover:underline">
                            Abrir fuente original <ExternalLink className="size-3.5" />
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={savedSourceIds.has(source.id)}
                            onClick={() => addOfficialSource(source)}
                          >
                            {savedSourceIds.has(source.id) ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                            {savedSourceIds.has(source.id) ? "En el expediente" : "Agregar al expediente"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {filteredElements.map((element) => (
                  <article key={element.id} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600">
                        {activeSection === "personas" ? <Users className="size-5" /> : activeSection === "fechas" ? <CalendarDays className="size-5" /> : activeSection === "pruebas" ? <Paperclip className="size-5" /> : activeSection === "normas" ? <Landmark className="size-5" /> : <ClipboardCheck className="size-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="font-semibold text-slate-900">{element.title}</h2>
                          <Badge variant="outline" className={`rounded-md text-[10px] ${element.status === "listo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                            {activeSection === "normas" ? "En el expediente" : element.status === "listo" ? "Confirmado" : "Por confirmar"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{element.detail}</p>
                        {element.date && <p className="mt-3 text-xs font-medium text-slate-500">Fecha: {element.date}</p>}
                        {element.sourceUrl && (
                          <a href={element.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#173f6b] hover:underline">
                            Abrir fuente guardada <ExternalLink className="size-3.5" />
                          </a>
                        )}
                        {element.status !== "listo" && (
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => confirmElement(element.id)}>
                            <Check className="size-3.5" /> Confirmar dato
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {filteredElements.length === 0 && activeSection !== "normas" && (
                  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
                    <div>
                      <div className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
                        <Plus className="size-5" />
                      </div>
                      <p className="mt-4 font-semibold text-slate-800">Aún no hay piezas aquí</p>
                      <p className="mt-1 text-sm text-slate-500">Agrega lo que ya tengas. Te mostraremos qué hace falta.</p>
                      <Button className="mt-4 bg-[#173f6b] text-white hover:bg-[#102f51]" onClick={() => setAddOpen(true)}>
                        Agregar primera pieza
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "documentos" && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
                  <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vista previa del borrador</p>
                      <h2 className="mt-1 font-serif text-xl font-semibold text-[#102238]">{orientation.recommendedDocument}</h2>
                    </div>
                    <Badge variant="outline" className={`rounded-md ${isSummaryDocument ? "border-sky-200 bg-sky-50 text-sky-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {isSummaryDocument ? "Resumen informativo" : "Completa los campos"}
                    </Badge>
                  </div>
                  <div className="max-h-[560px] overflow-auto whitespace-pre-wrap font-serif text-sm leading-7 text-slate-700">
                    {draftText}
                  </div>
                </div>
                <aside className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Antes de descargar</p>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      {isSummaryDocument ? (
                        <>
                          <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Revisa que hechos y fechas sean correctos.</li>
                          <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Llévalo a revisión humana antes de actuar.</li>
                        </>
                      ) : (
                        <>
                          <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Completa nombre e identificación.</li>
                          <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Verifica la persona o entidad destinataria.</li>
                        </>
                      )}
                      <li className="flex gap-2">
                        {evidenceCount > 0 ? <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />}
                        {evidenceCount > 0 ? `${evidenceCount} ${evidenceCount === 1 ? "prueba listada" : "pruebas listadas"}.` : "Aún no agregaste pruebas."}
                      </li>
                    </ul>
                  </div>
                  <Button className="w-full bg-[#173f6b] text-white hover:bg-[#102f51]" onClick={() => downloadText(draftFilename, draftText)}>
                    <Download className="size-4" /> Descargar borrador
                  </Button>
                  <Button variant="outline" className="w-full" onClick={downloadCaseFile}>
                    <FolderOpen className="size-4" /> Preparar carpeta
                  </Button>
                </aside>
              </div>
            )}

            <div className="mt-8 flex items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              <p>Orientación preliminar con fuentes oficiales sugeridas para verificación. No reemplaza la revisión de un profesional ni garantiza un resultado. Si hay riesgo inmediato, usa los canales de emergencia.</p>
            </div>
          </div>
        </main>

        <aside className="hidden border-l border-slate-200 bg-[#fbfaf7] 2xl:block">
          <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto px-5 py-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Guía para este paso</p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-[#102238]">Tu orientación</h2>
              </div>
              <div className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <Sparkles className="size-4" />
              </div>
            </div>

            <div className="space-y-3">
              <section className="border-l-2 border-indigo-500 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Scale className="size-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]">Tu derecho</p>
                </div>
                <h3 className="mt-3 text-sm font-semibold leading-5 text-slate-900">{orientation.rightTitle}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{orientation.rightExplanation}</p>
                <div className="mt-3 space-y-1.5">
                  {sources.map((source) => (
                    <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 text-xs font-medium text-[#173f6b] hover:underline">
                      <span className="truncate">{source.shortTitle}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </section>

              <section className="border-l-2 border-emerald-500 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ArrowRight className="size-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]">Qué hacer ahora</p>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{orientation.nextSteps[0]?.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{orientation.nextSteps[0]?.detail}</p>
                <Button variant="outline" size="sm" className="mt-3 h-8 w-full text-xs" onClick={() => setActiveSection("ruta")}>
                  Ver ruta completa <ChevronRight className="size-3" />
                </Button>
              </section>

              <section className="border-l-2 border-amber-500 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-2 text-amber-700">
                  <Building2 className="size-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]">A dónde ir gratis</p>
                </div>
                <div className="mt-3 space-y-3">
                  {orientation.freeHelp.map((help, index) => (
                    <div key={help.name} className={index > 0 ? "border-t border-slate-100 pt-3" : ""}>
                      <p className="text-sm font-semibold text-slate-900">{help.name}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{help.detail}</p>
                      <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-amber-800">
                        <MapPin className="mt-0.5 size-3 shrink-0" /> {help.channel}
                      </p>
                      {getOfficialSources([help.sourceId])[0] && (
                        <a
                          href={getOfficialSources([help.sourceId])[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#173f6b] hover:underline"
                        >
                          Ver canal oficial <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Expediente preparado</span>
                <span className="font-bold text-[#173f6b]">{completeness}%</span>
              </div>
              <Progress value={completeness} className="mt-2 h-1.5" />
              <Button variant="ghost" size="sm" className="mt-2 h-8 w-full justify-between px-0 text-xs text-[#173f6b] hover:bg-transparent" onClick={downloadCaseFile}>
                Preparar carpeta para revisión <Download className="size-3.5" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-4 right-4 z-30 2xl:hidden">
        <Sheet>
          <SheetTrigger
            render={<Button className="rounded-full bg-[#102238] px-4 text-white shadow-xl hover:bg-[#173f6b]" />}
          >
            <Sparkles className="size-4 text-emerald-300" /> Ver orientación
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto bg-[#fbfaf7] sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl text-[#102238]">Tu orientación</SheetTitle>
              <SheetDescription>Se construye con lo que confirmaste y enlaza fuentes oficiales para verificación.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <section className="border-l-2 border-indigo-500 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">Tu derecho</p>
                <h3 className="mt-2 font-semibold text-slate-900">{orientation.rightTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{orientation.rightExplanation}</p>
              </section>
              <section className="border-l-2 border-emerald-500 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Qué hacer ahora</p>
                <p className="mt-2 font-semibold text-slate-900">{orientation.nextSteps[0]?.title}</p>
                <p className="mt-1 text-sm text-slate-600">{orientation.nextSteps[0]?.detail}</p>
              </section>
              <section className="border-l-2 border-amber-500 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">A dónde ir gratis</p>
                {orientation.freeHelp.map((help) => (
                  <div key={help.name} className="mt-3">
                    <p className="font-semibold text-slate-900">{help.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{help.detail}</p>
                    <p className="mt-2 flex items-start gap-1 text-xs font-medium text-amber-800">
                      <MapPin className="mt-0.5 size-3 shrink-0" /> {help.channel}
                    </p>
                    {getOfficialSources([help.sourceId])[0] && (
                      <a href={getOfficialSources([help.sourceId])[0].url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#173f6b] hover:underline">
                        Ver canal oficial <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                ))}
              </section>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog
        open={newCaseOpen}
        onOpenChange={(open) => {
          setNewCaseOpen(open);
          if (!open) setFormError("");
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles className="size-5" />
            </div>
            <DialogTitle className="font-serif text-2xl text-[#102238]">
              {caseDialogMode === "new"
                ? hasAnalyzedCase
                  ? "Reemplaza el caso actual"
                  : "Organiza tu caso con IA"
                : "Edita tu relato"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {caseDialogMode === "new"
                ? hasAnalyzedCase
                  ? "La aplicación mantiene un expediente activo. Al organizar el nuevo relato reemplazarás el caso actual; descarga su carpeta antes si necesitas conservarlo."
                  : "Cuéntanos tu situación en palabras sencillas. La IA organizará los hechos y propondrá una ruta inicial para que la verifiques."
                : "Escríbelo como se lo contarías a alguien de confianza. No necesitas usar palabras legales: organizaremos la información contigo."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="story">Tu situación</Label>
              <Textarea
                id="story"
                value={story}
                onChange={(event) => setStory(event.target.value)}
                rows={6}
                minLength={12}
                maxLength={6000}
                required
                placeholder="Ejemplo: trabajo en un restaurante y no me pagan hace dos meses…"
                className="resize-none text-[15px] leading-6"
              />
              <p className="text-xs text-slate-500">
                {EXTERNAL_PROCESSING_COPY} Incluye solo los datos necesarios y evita documentos de identidad, direcciones, contraseñas o datos bancarios.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Municipio o ciudad</Label>
              <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ej. Cali, Valle del Cauca" minLength={2} maxLength={120} required />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={processingConsent}
                onChange={(event) => setProcessingConsent(event.target.checked)}
                className="mt-0.5 size-4 accent-[#173f6b]"
              />
              <span className="text-xs leading-5 text-slate-600">{PROCESSING_CONSENT_COPY}</span>
            </label>
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {formError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setNewCaseOpen(false)}>Cancelar</Button>
            <Button disabled={!isOrientationFormReady({ story, city, processingConsent }) || isAnalyzing} onClick={analyzeCase} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
              {isAnalyzing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {isAnalyzing ? "Organizando tu relato…" : "Organizar mi caso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#102238]">Agregar una pieza</DialogTitle>
            <DialogDescription>Guarda un hecho, una persona, una prueba o cualquier dato que ayude a entender tu caso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="element-type">Tipo de pieza</Label>
              <select
                id="element-type"
                value={newElement.type}
                onChange={(event) => setNewElement((current) => ({ ...current, type: event.target.value as CaseElementType }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="element-title">Nombre corto</Label>
              <Input id="element-title" value={newElement.title} onChange={(event) => setNewElement((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Captura del aviso por WhatsApp" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="element-detail">Por qué puede servir</Label>
              <Textarea id="element-detail" value={newElement.detail} onChange={(event) => setNewElement((current) => ({ ...current, detail: event.target.value }))} placeholder="Describe qué muestra o qué ocurrió" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="element-date">Fecha, si aplica</Label>
              <Input id="element-date" type="date" value={newElement.date} onChange={(event) => setNewElement((current) => ({ ...current, date: event.target.value }))} />
            </div>
            {newElement.type === "pruebas" && (
              <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
                <Upload className="size-4 shrink-0" /> Registra aquí la referencia; el archivo original no se carga ni se almacena.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button disabled={!newElement.title.trim()} onClick={addElement} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
              <Plus className="size-4" /> Agregar al expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#102238]">Borrador: {orientation.recommendedDocument}</DialogTitle>
            <DialogDescription>Los campos entre corchetes requieren revisión. El documento no se radica automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="my-2 max-h-[52vh] overflow-auto rounded-lg border border-slate-200 bg-[#fdfcf8] p-6 whitespace-pre-wrap font-serif text-sm leading-7 text-slate-700">
            {draftText}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Revisa nombres, fechas, destinatario y anexos. Si puedes, pide a un consultorio jurídico que lo revise antes de radicarlo.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentOpen(false)}>Volver al expediente</Button>
            <Button onClick={() => downloadText(draftFilename, draftText)} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
              <Download className="size-4" /> Descargar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
