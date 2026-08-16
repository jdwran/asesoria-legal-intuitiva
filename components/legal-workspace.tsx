"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Cloud,
  CloudOff,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Info,
  Landmark,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Scale,
  Save,
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
import { PreliminaryOrientation } from "@/components/preliminary-orientation";
import {
  type CaseBlockSuggestion,
  getCaseOutputs,
  getColombianProcedureSteps,
  getSuggestedCaseBlocks,
} from "@/lib/case-guidance";
import type { CaseSessionSnapshot } from "@/lib/case-session";
import { DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION } from "@/lib/detailed-guidance";
import {
  CaseElement,
  CaseElementType,
  getOfficialSources,
  getPreliminaryLegalCitations,
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

type NavKey = "resumen" | "expediente" | "ruta" | "resultados";
type AnalysisProvider = "demo" | "open" | "openai";
type AnalysisMode = "ready" | "demo" | "ai";
type AccountState = "checking" | "anonymous" | "active" | "unavailable";
type SaveState = "ready" | "saving" | "saved" | "error" | "conflict";
type SavedAccount = { displayName: string };
type OrientationApiResponse = LegalOrientation & {
  mode?: "demo" | "ai";
  degraded?: boolean;
  provider?: AnalysisProvider;
  fallbackUsed?: boolean;
};

const ORIENTATION_REQUEST_TIMEOUT_MS = 90_000;
const SESSION_SAVE_DEBOUNCE_MS = 800;

function AccountSessionStatus({
  account,
  saveState,
  onRetry,
  onSignOut,
}: {
  account: SavedAccount;
  saveState: SaveState;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const statusLabel =
    saveState === "saving"
      ? "Guardando…"
      : saveState === "saved"
        ? "Guardado"
        : saveState === "error"
          ? "No se pudo guardar"
          : saveState === "conflict"
            ? "Cambios en otra pestaña"
            : "Listo para guardar";
  const StatusIcon = saveState === "error" || saveState === "conflict" ? CloudOff : saveState === "ready" ? Save : Cloud;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
      <StatusIcon
        aria-hidden="true"
        className={`size-3.5 shrink-0 ${saveState === "error" || saveState === "conflict" ? "text-rose-600" : "text-emerald-600"}`}
      />
      <span className="hidden max-w-32 truncate font-semibold text-slate-800 sm:inline" title={account.displayName}>
        {account.displayName}
      </span>
      <span className="sr-only sm:not-sr-only" aria-live="polite">
        {statusLabel}
      </span>
      {saveState === "error" && (
        <button type="button" onClick={onRetry} className="font-semibold text-[#173f6b] hover:underline">
          Reintentar
        </button>
      )}
      {saveState === "conflict" && (
        <button type="button" onClick={() => window.location.reload()} className="font-semibold text-[#173f6b] hover:underline">
          Recargar
        </button>
      )}
      <a
        href="/signout-with-chatgpt?return_to=%2F"
        onClick={onSignOut}
        className="grid size-6 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        aria-label="Cerrar sesión y retirar el expediente de este dispositivo"
        title="Cerrar sesión"
      >
        <LogOut className="size-3.5" />
      </a>
    </div>
  );
}

function AccountSessionLoader() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#f4f3ee] px-6 text-[#102238]">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" role="status">
        <LoaderCircle className="size-5 animate-spin text-emerald-600" />
        <div>
          <p className="text-sm font-semibold">Restaurando tu sesión</p>
          <p className="mt-0.5 text-xs text-slate-500">Estamos recuperando tu expediente guardado.</p>
        </div>
      </div>
    </div>
  );
}

function AccountSessionUnavailable() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#f4f3ee] px-6 text-[#102238]">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm" role="alert">
        <CloudOff className="mx-auto size-7 text-amber-700" aria-hidden="true" />
        <h1 className="mt-3 font-serif text-2xl font-semibold">No pudimos restaurar tu sesión</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Para no reemplazar tu expediente guardado con uno vacío, espera un momento e inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 min-h-11 rounded-lg bg-[#173f6b] px-4 py-2 text-sm font-bold text-white hover:bg-[#102f51]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

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
    label: "Tu recorrido",
    items: [
      { id: "resumen", label: "Inicio", icon: FolderOpen },
      { id: "expediente", label: "Completar mi caso", icon: ClipboardCheck },
      { id: "ruta", label: "Pasos y trámites", icon: Compass },
      { id: "resultados", label: "Mis resultados", icon: FileCheck2 },
    ],
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
    if (id === "expediente") return elements.length;
    return null;
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

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Recorrido del caso">
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
                    aria-current={active ? "page" : undefined}
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
          Agregar un bloque
        </Button>
      </div>
    </div>
  );
}

export function LegalWorkspace({ identityAvailable = false }: { identityAvailable?: boolean }) {
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const triageSectionRef = useRef<HTMLElement>(null);
  const [activeSection, setActiveSection] = useState<NavKey>("resumen");
  const [elements, setElements] = useState<CaseElement[]>(initialElements);
  const [orientation, setOrientation] = useState<LegalOrientation>(initialOrientation);
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [caseDialogMode, setCaseDialogMode] = useState<"new" | "edit">("new");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CaseBlockSuggestion | null>(null);
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
  const [editingPreliminaryStory, setEditingPreliminaryStory] = useState(false);
  const [detailedGuidanceAcknowledged, setDetailedGuidanceAcknowledged] = useState(false);
  const [detailedGuidanceAcceptedAt, setDetailedGuidanceAcceptedAt] = useState<string | null>(null);
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
  const [accountState, setAccountState] = useState<AccountState>(identityAvailable ? "checking" : "anonymous");
  const [account, setAccount] = useState<SavedAccount | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("ready");
  const saveStateRef = useRef<SaveState>("ready");
  const accountEnabledRef = useRef(false);
  const sessionRevisionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const pendingSnapshotRef = useRef<CaseSessionSnapshot | null>(null);
  const lastPersistedSnapshotRef = useRef<string | null>(null);

  const updateSaveState = useCallback((nextState: SaveState) => {
    saveStateRef.current = nextState;
    setSaveState(nextState);
  }, []);

  const resetPrivateWorkspace = useCallback(() => {
    accountEnabledRef.current = false;
    sessionRevisionRef.current = 0;
    saveInFlightRef.current = false;
    pendingSnapshotRef.current = null;
    lastPersistedSnapshotRef.current = null;
    setAccount(null);
    setAccountState("anonymous");
    updateSaveState("ready");
    setActiveSection("resumen");
    setElements(initialElements);
    setOrientation(initialOrientation);
    setCompletedSteps([0]);
    setNewCaseOpen(false);
    setCaseMenuOpen(false);
    setAddOpen(false);
    setSelectedSuggestion(null);
    setDocumentOpen(false);
    setStory("");
    setSavedStory("");
    setCity("");
    setProcessingConsent(false);
    setIsAnalyzing(false);
    setIsRefining(false);
    setAnalysisMode("ready");
    setAnalysisProvider(null);
    setHasAnalyzedCase(false);
    setAnalysisFallbackUsed(false);
    setAnalysisDegraded(false);
    setEditingPreliminaryStory(false);
    setDetailedGuidanceAcknowledged(false);
    setDetailedGuidanceAcceptedAt(null);
    setNotice("IA lista para organizar tu caso");
    setFormError("");
    setTriageAnswers({});
    setTriageSaved(false);
    setTriageError("");
    setNewElement({ type: "pruebas", title: "", detail: "", date: "" });
  }, [updateSaveState]);

  const signOut = useCallback(() => {
    resetPrivateWorkspace();
  }, [resetPrivateWorkspace]);

  const preliminaryLegalCitations = useMemo(
    () => getPreliminaryLegalCitations(orientation, savedStory),
    [orientation, savedStory],
  );
  const sources = useMemo(
    () =>
      [
        ...new Map(
          getOfficialSources([
            ...orientation.sourceIds,
            ...preliminaryLegalCitations.map((source) => source.id),
          ]).map((source) => [source.id, source]),
        ).values(),
      ],
    [orientation.sourceIds, preliminaryLegalCitations],
  );
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
  const caseSuggestions = useMemo(
    () => getSuggestedCaseBlocks(orientation, elements),
    [elements, orientation],
  );
  const procedureSteps = useMemo(
    () => getColombianProcedureSteps(orientation, city),
    [city, orientation],
  );
  const caseOutputs = useMemo(
    () => getCaseOutputs(orientation, elements, completedSteps),
    [completedSteps, elements, orientation],
  );
  const nextProcedureIndex = procedureSteps.findIndex((_, index) => !completedSteps.includes(index));
  const nextProcedure = procedureSteps[nextProcedureIndex === -1 ? procedureSteps.length - 1 : nextProcedureIndex];
  const needsTriage = !triageSaved && orientation.triageQuestions.length > 0;
  const caseSessionSnapshot = useMemo<CaseSessionSnapshot>(
    () => ({
      schemaVersion: 1,
      draft: { story, city },
      case: hasAnalyzedCase
        ? {
            savedStory,
            orientation,
            elements,
            completedStepIds: completedSteps.flatMap((index) => {
              const stepId = procedureSteps[index]?.id;
              return stepId ? [stepId] : [];
            }),
            triageAnswers: Object.fromEntries(
              Object.entries(triageAnswers).map(([index, answer]) => [String(index), answer]),
            ),
            triageSaved,
            detailedGuidanceAcknowledgement: detailedGuidanceAcceptedAt
              ? {
                  acceptedAt: detailedGuidanceAcceptedAt,
                  version: DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION,
                }
              : undefined,
            analysis: {
              mode: analysisMode,
              provider: analysisProvider,
              fallbackUsed: analysisFallbackUsed,
              degraded: analysisDegraded,
            },
          }
        : null,
    }),
    [
      analysisDegraded,
      analysisFallbackUsed,
      analysisMode,
      analysisProvider,
      city,
      completedSteps,
      detailedGuidanceAcceptedAt,
      elements,
      hasAnalyzedCase,
      orientation,
      procedureSteps,
      savedStory,
      story,
      triageAnswers,
      triageSaved,
    ],
  );

  const persistPendingSession = useCallback(
    async function persistPendingSession() {
      if (!accountEnabledRef.current || saveInFlightRef.current || !pendingSnapshotRef.current) return;

      saveInFlightRef.current = true;
      let stopped = false;

      while (accountEnabledRef.current && pendingSnapshotRef.current && !stopped) {
        const snapshot: CaseSessionSnapshot = pendingSnapshotRef.current;
        const serializedSnapshot = JSON.stringify(snapshot);
        pendingSnapshotRef.current = null;
        updateSaveState("saving");

        try {
          const response = await fetch("/api/session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              snapshot,
              expectedRevision: sessionRevisionRef.current,
            }),
          });

          if (response.status === 409) {
            if (!pendingSnapshotRef.current) pendingSnapshotRef.current = snapshot;
            updateSaveState("conflict");
            stopped = true;
            continue;
          }

          if (response.status === 401 || response.status === 403) {
            resetPrivateWorkspace();
            stopped = true;
            continue;
          }

          if (!response.ok) throw new Error("save_failed");

          const payload = (await response.json()) as { revision?: unknown };
          if (typeof payload.revision !== "number" || !Number.isInteger(payload.revision)) {
            throw new Error("invalid_revision");
          }

          sessionRevisionRef.current = payload.revision;
          lastPersistedSnapshotRef.current = serializedSnapshot;
          updateSaveState("saved");
        } catch {
          if (!pendingSnapshotRef.current) pendingSnapshotRef.current = snapshot;
          updateSaveState("error");
          stopped = true;
        }
      }

      saveInFlightRef.current = false;
      if (!stopped && accountEnabledRef.current && pendingSnapshotRef.current) {
        window.queueMicrotask(() => void persistPendingSession());
      }
    },
    [resetPrivateWorkspace, updateSaveState],
  );

  useEffect(() => {
    if (!identityAvailable) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    let cancelled = false;

    async function restoreSavedSession() {
      try {
        const response = await fetch("/api/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (!cancelled) setAccountState("anonymous");
          return;
        }
        if (!response.ok) throw new Error("session_unavailable");

        const payload = (await response.json()) as {
          account?: { displayName?: unknown };
          session?: { snapshot?: CaseSessionSnapshot; revision?: unknown } | null;
        };
        if (!payload.account || typeof payload.account.displayName !== "string") {
          throw new Error("invalid_account");
        }
        if (cancelled) return;

        const savedSession = payload.session ?? null;
        if (savedSession) {
          if (!savedSession.snapshot || typeof savedSession.revision !== "number") {
            throw new Error("invalid_session");
          }

          const snapshot = savedSession.snapshot;
          setStory(snapshot.draft.story);
          setCity(snapshot.draft.city);
          setProcessingConsent(false);
          sessionRevisionRef.current = savedSession.revision;
          lastPersistedSnapshotRef.current = JSON.stringify(snapshot);

          if (snapshot.case) {
            const restoredCase = snapshot.case;
            const restoredProcedureSteps = getColombianProcedureSteps(restoredCase.orientation, snapshot.draft.city);
            const completedIds = new Set(restoredCase.completedStepIds);
            const restoredTriageAnswers = Object.entries(restoredCase.triageAnswers).reduce<Record<number, string>>(
              (answers, [index, answer]) => {
                const numericIndex = Number(index);
                if (Number.isInteger(numericIndex) && numericIndex >= 0) answers[numericIndex] = answer;
                return answers;
              },
              {},
            );

            setSavedStory(restoredCase.savedStory);
            setOrientation(restoredCase.orientation);
            setElements(restoredCase.elements);
            setCompletedSteps(
              restoredProcedureSteps.flatMap((step, index) => (completedIds.has(step.id) ? [index] : [])),
            );
            setTriageAnswers(restoredTriageAnswers);
            setTriageSaved(restoredCase.triageSaved);
            setDetailedGuidanceAcceptedAt(
              restoredCase.detailedGuidanceAcknowledgement?.acceptedAt ?? null,
            );
            setDetailedGuidanceAcknowledged(
              Boolean(restoredCase.detailedGuidanceAcknowledgement),
            );
            setEditingPreliminaryStory(false);
            setAnalysisMode(restoredCase.analysis.mode);
            setAnalysisProvider(restoredCase.analysis.provider);
            setAnalysisFallbackUsed(restoredCase.analysis.fallbackUsed);
            setAnalysisDegraded(restoredCase.analysis.degraded);
            setHasAnalyzedCase(true);
            setNotice("Sesión restaurada · tus cambios se guardarán automáticamente");
          } else {
            setHasAnalyzedCase(false);
            setDetailedGuidanceAcceptedAt(null);
            setDetailedGuidanceAcknowledged(false);
            setNotice("Borrador restaurado · tus cambios se guardarán automáticamente");
          }
        } else {
          sessionRevisionRef.current = 0;
          setNotice("Guardado seguro activado");
        }

        accountEnabledRef.current = true;
        setAccount({ displayName: payload.account.displayName });
        updateSaveState(savedSession ? "saved" : "ready");
        setAccountState("active");
      } catch {
        if (!cancelled) setAccountState("unavailable");
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void restoreSavedSession();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [identityAvailable, updateSaveState]);

  useEffect(() => {
    if (accountState !== "active" || !accountEnabledRef.current) return;
    if (
      sessionRevisionRef.current === 0 &&
      lastPersistedSnapshotRef.current === null &&
      !caseSessionSnapshot.case &&
      !caseSessionSnapshot.draft.story.trim() &&
      !caseSessionSnapshot.draft.city.trim()
    ) {
      return;
    }

    const serializedSnapshot = JSON.stringify(caseSessionSnapshot);
    if (serializedSnapshot === lastPersistedSnapshotRef.current) {
      if (
        saveInFlightRef.current ||
        saveStateRef.current === "error" ||
        saveStateRef.current === "conflict"
      ) {
        pendingSnapshotRef.current = caseSessionSnapshot;
      } else {
        pendingSnapshotRef.current = null;
      }
      return;
    }

    pendingSnapshotRef.current = caseSessionSnapshot;
    if (saveStateRef.current === "error" || saveStateRef.current === "conflict") return;
    const timeout = window.setTimeout(() => void persistPendingSession(), SESSION_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [accountState, caseSessionSnapshot, persistPendingSession]);

  useEffect(() => {
    if (!hasAnalyzedCase) return;
    const frame = window.requestAnimationFrame(() => {
      resultHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasAnalyzedCase]);

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

RUTA DE TRÁMITES SUGERIDA
${procedureSteps.map((step, index) => `${index + 1}. ${step.title}\n   Entidad: ${step.entity}\n   Canal: ${step.channel}\n   Qué obtener: ${step.expectedOutput}\n   Después: ${step.nextAction}`).join("\n")}

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

RUTA DE TRÁMITES SUGERIDA
${procedureSteps.map((step, index) => `${index + 1}. ${step.title}\n   Entidad: ${step.entity}\n   Canal: ${step.channel}\n   Qué reunir: ${step.requirements.join("; ")}\n   Qué obtener: ${step.expectedOutput}\n   Después: ${step.nextAction}`).join("\n")}

Notificaciones: [CORREO / DIRECCIÓN]

Atentamente,
[NOMBRE COMPLETO]

FUENTES SUGERIDAS PARA VERIFICAR
${allRelevantSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}

Este es un borrador informativo. Revisa los datos y, si es posible, solicita orientación jurídica antes de radicarlo.`;
  }, [allRelevantSources, city, elements, orientation, procedureSteps]);

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
      setEditingPreliminaryStory(false);
      setDetailedGuidanceAcknowledged(false);
      setDetailedGuidanceAcceptedAt(null);
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
          ? "IA no disponible · se mostró una respuesta preliminar de demostración"
          : result.provider === "open"
            ? "Respuesta preliminar lista con un modelo abierto"
            : result.fallbackUsed
              ? "El modelo abierto no respondió · respuesta preliminar lista con OpenAI"
              : "Respuesta preliminar lista con OpenAI",
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
    setActiveSection("expediente");
    setNewElement({ type: "pruebas", title: "", detail: "", date: "" });
    setSelectedSuggestion(null);
    setAddOpen(false);
    setNotice(`${typeLabels[item.type]} agregado al expediente`);
  }

  function openSuggestedBlock(suggestion: CaseBlockSuggestion) {
    setSelectedSuggestion(suggestion);
    setNewElement({
      type: suggestion.type,
      title: suggestion.title,
      detail: "",
      date: "",
    });
    setAddOpen(true);
  }

  function openCustomBlock() {
    setSelectedSuggestion(null);
    setNewElement({ type: "pruebas", title: "", detail: "", date: "" });
    setAddOpen(true);
  }

  function goToNextAction() {
    if (needsTriage) {
      triageSectionRef.current?.focus({ preventScroll: true });
      triageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setActiveSection("ruta");
  }

  function continueToDetailedGuidance() {
    if (!detailedGuidanceAcknowledged) return;

    setDetailedGuidanceAcceptedAt(new Date().toISOString());
    setActiveSection("resumen");
    setNotice("Aceptación registrada · análisis detallado habilitado");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = needsTriage ? triageSectionRef.current : resultHeadingRef.current;
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function editPreliminaryStory() {
    setStory(savedStory);
    setProcessingConsent(false);
    setHasAnalyzedCase(false);
    setDetailedGuidanceAcknowledged(false);
    setDetailedGuidanceAcceptedAt(null);
    setEditingPreliminaryStory(true);
    setFormError("");
    setNotice("Edita el relato y vuelve a solicitar una respuesta preliminar");
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
${procedureSteps.map((step, index) => `${index + 1}. ${step.title}\n   ${step.detail}\n   Entidad: ${step.entity}\n   Canal: ${step.channel}\n   Requisitos: ${step.requirements.join("; ")}\n   Resultado esperado: ${step.expectedOutput}\n   Siguiente: ${step.nextAction}`).join("\n")}

FUENTES OFICIALES SUGERIDAS PARA VERIFICAR
${allRelevantSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}

AVISO
Orientación preliminar con fuentes oficiales sugeridas para verificación. No reemplaza la revisión de un profesional ni garantiza un resultado.`;
    downloadText("carpeta-orientador-legal.txt", caseFile);
  }

  const sectionTitle =
    navGroups.flatMap((group) => group.items).find((item) => item.id === activeSection)?.label ?? "Vista general";
  const accountIndicator =
    accountState === "active" && account ? (
      <AccountSessionStatus
        account={account}
        saveState={saveState}
        onRetry={() => void persistPendingSession()}
        onSignOut={signOut}
      />
    ) : null;

  if (accountState === "checking") return <AccountSessionLoader />;
  if (accountState === "unavailable") return <AccountSessionUnavailable />;

  if (!hasAnalyzedCase || editingPreliminaryStory) {
    return (
      <LegalEmptyState
        accountIndicator={accountIndicator}
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

  if (!detailedGuidanceAcceptedAt) {
    return (
      <PreliminaryOrientation
        accountIndicator={accountIndicator}
        orientation={orientation}
        city={city}
        citations={preliminaryLegalCitations}
        analysisMode={analysisMode}
        analysisDegraded={analysisDegraded}
        acknowledged={detailedGuidanceAcknowledged}
        onAcknowledgedChange={setDetailedGuidanceAcknowledged}
        onContinue={continueToDetailedGuidance}
        onEditStory={editPreliminaryStory}
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
                    openCustomBlock();
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
          {accountIndicator}
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 xl:flex" role="status" aria-live="polite">
            <Check className="size-3.5 text-emerald-600" />
            {notice}
          </span>
          <Button onClick={() => openCaseDialog("new")} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
            <Pencil className="size-4" />
            <span className="hidden sm:inline">Nuevo caso</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] bg-[#102238] lg:block">
          <CaseNavigation
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            elements={elements}
            onAdd={openCustomBlock}
            caseTitle={orientation.caseTitle}
            city={city}
            completeness={completeness}
          />
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
          <div className="mx-auto max-w-5xl">
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
                <section className="overflow-hidden rounded-2xl bg-[#102238] text-white shadow-lg shadow-slate-900/10">
                  <div className="grid gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400 text-slate-950">
                        {needsTriage ? <Info className="size-5" /> : <ArrowRight className="size-5" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                          Haz esto ahora
                        </p>
                        <h2 className="mt-2 font-serif text-2xl font-semibold">
                          {needsTriage ? "Confirma los datos que cambian tu ruta" : nextProcedure?.title}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                          {needsTriage
                            ? "Son máximo dos respuestas. Se guardan como hechos del expediente y afinan los trámites sugeridos."
                            : nextProcedure?.detail}
                        </p>
                        {!needsTriage && nextProcedure && (
                          <p className="mt-3 text-xs font-medium text-emerald-200">
                            Resultado esperado: {nextProcedure.expectedOutput}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button onClick={goToNextAction} className="shrink-0 bg-white text-[#102238] hover:bg-slate-100">
                      {needsTriage ? "Responder ahora" : "Ver paso y requisitos"}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </section>

                {!triageSaved && orientation.triageQuestions.length > 0 && (
                  <section
                    ref={triageSectionRef}
                    tabIndex={-1}
                    className="scroll-mt-24 rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 outline-none sm:p-6"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                        <Info className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-amber-950">Confirma solo lo necesario</p>
                            <p className="mt-1 text-sm text-amber-800/80">Tus respuestas quedarán como bloques confirmados del expediente.</p>
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

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ClipboardCheck className="size-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold text-slate-900">Esto fue lo que entendimos</h2>
                        <Button variant="ghost" size="sm" onClick={() => openCaseDialog("edit")} className="h-8 text-xs text-slate-500">
                          <Pencil className="size-3" /> Corregir
                        </Button>
                      </div>
                      <p className="mt-2 text-[15px] leading-7 text-slate-600">{orientation.plainSummary}</p>
                    </div>
                  </div>
                  <div className="grid gap-px border-t border-slate-100 bg-slate-100 md:grid-cols-2">
                    <div className="bg-white px-5 py-4 sm:px-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Lo que te protege</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{orientation.rightTitle}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-600">{orientation.rightExplanation}</p>
                    </div>
                    <div className="bg-white px-5 py-4 sm:px-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Fuentes para verificar</p>
                      <div className="mt-2 space-y-2">
                        {sources.map((source) => (
                          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#173f6b] hover:underline">
                            <span>{source.shortTitle}</span>
                            <ExternalLink className="size-3.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Personaliza tu expediente</p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Bloques sugeridos para tu caso</h2>
                      <p className="mt-1 text-sm text-slate-500">Agrega solo los que te sirvan. Nada se incorpora sin tu confirmación.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveSection("expediente")} className="hidden text-[#173f6b] sm:inline-flex">
                      Ver expediente <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {caseSuggestions.slice(0, 3).map((suggestion) => (
                      <article key={suggestion.id} className="flex min-h-48 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            {typeLabels[suggestion.type]}
                          </span>
                          <Plus className="size-4 text-emerald-600" />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">{suggestion.title}</h3>
                        <p className="mt-2 flex-1 text-xs leading-5 text-slate-600">{suggestion.reason}</p>
                        <Button variant="outline" size="sm" className="mt-4 w-full text-[#173f6b]" onClick={() => openSuggestedBlock(suggestion)}>
                          Agregar este bloque
                        </Button>
                      </article>
                    ))}
                  </div>
                  {caseSuggestions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-600">
                      Ya agregaste los bloques prioritarios. Puedes crear uno propio desde “Completar mi caso”.
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeSection === "ruta" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">Tu ruta operativa en Colombia</p>
                        <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                          Verificada 15 ago 2026
                        </Badge>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Cada paso indica qué reunir, dónde hacerlo, qué comprobante guardar y qué sigue. Confirma disponibilidad y términos en el canal oficial.
                      </p>
                    </div>
                    <div className="min-w-40">
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>Progreso</span>
                        <span>{Math.round((completedSteps.length / procedureSteps.length) * 100)}%</span>
                      </div>
                      <Progress value={(completedSteps.length / procedureSteps.length) * 100} />
                    </div>
                  </div>
                </div>

                <ol className="space-y-0">
                  {procedureSteps.map((step, index) => {
                    const complete = completedSteps.includes(index);
                    const stepSources = getOfficialSources(step.sourceIds);
                    return (
                      <li key={step.title} className="relative grid grid-cols-[40px_1fr] gap-4 pb-5 last:pb-0">
                        {index < procedureSteps.length - 1 && (
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
                        <article className={`overflow-hidden rounded-xl border ${complete ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                          <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#173f6b]">{step.stage}</p>
                              <p className="font-semibold text-slate-900">{step.title}</p>
                              <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.detail}</p>
                            </div>
                            <Badge variant="outline" className="rounded-md bg-white text-[10px]">
                              {complete ? "Completado" : index === completedSteps.length ? "Haz esto ahora" : "Después"}
                            </Badge>
                          </div>

                          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Dónde y cómo</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{step.entity}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{step.channel}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Qué debes reunir</p>
                              <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                                {step.requirements.map((requirement) => (
                                  <li key={requirement} className="flex gap-2">
                                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                                    <span>{requirement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Qué debes obtener</p>
                            <p className="mt-1.5 text-sm font-semibold text-emerald-950">{step.expectedOutput}</p>
                            <p className="mt-2 text-xs leading-5 text-emerald-900/75"><strong>Después:</strong> {step.nextAction}</p>
                          </div>

                          <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-500 sm:grid-cols-2">
                            <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0" /> {step.timing}</p>
                            <p className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0" /> {step.cost}</p>
                          </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/70 px-5 py-3">
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {stepSources.map((source) => (
                                <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#173f6b] hover:underline">
                                  {source.shortTitle} <ExternalLink className="size-3" />
                                </a>
                              ))}
                            </div>
                            <Button variant={complete ? "outline" : "default"} size="sm" onClick={() => toggleStep(index)} className={complete ? "" : "bg-[#173f6b] text-white hover:bg-[#102f51]"}>
                              {complete ? "Marcar pendiente" : "Marcar completado"}
                            </Button>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ol>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Apoyo gratuito o público</p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Dónde pedir ayuda para este caso</h2>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {orientation.freeHelp.map((help) => {
                      const helpSource = getOfficialSources([help.sourceId])[0];
                      return (
                        <article key={help.name} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                              <Building2 className="size-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">{help.name}</h3>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{help.detail}</p>
                              <p className="mt-2 text-xs font-medium text-amber-800">{help.channel}</p>
                              {helpSource && (
                                <a href={helpSource.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#173f6b] hover:underline">
                                  Ver canal oficial <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeSection === "expediente" && (
              <div className="space-y-6">
                <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Un expediente que se adapta a tu caso</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Agrega bloques sugeridos o crea uno propio. Tú decides qué incorporar y qué confirmar.</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>{elements.length} bloques</span>
                      <span aria-hidden="true">·</span>
                      <span>{completeness}% de tipos cubiertos</span>
                    </div>
                  </div>
                  <Button onClick={openCustomBlock} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
                    <Plus className="size-4" /> Crear bloque propio
                  </Button>
                </section>

                {caseSuggestions.length > 0 && (
                  <section>
                    <div className="mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Sugerencias según tu relato</p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Completa lo que puede cambiar la ruta</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {caseSuggestions.map((suggestion) => (
                        <article key={suggestion.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline" className="rounded-md text-[10px]">{typeLabels[suggestion.type]}</Badge>
                            <span className="text-[10px] font-bold text-emerald-700">SUGERIDO</span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-slate-900">{suggestion.title}</h3>
                          <p className="mt-2 flex-1 text-xs leading-5 text-slate-600">{suggestion.reason}</p>
                          <Button variant="outline" size="sm" className="mt-4 w-full text-[#173f6b]" onClick={() => openSuggestedBlock(suggestion)}>
                            <Plus className="size-3.5" /> Agregar y completar
                          </Button>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Lo que ya agregaste</p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Bloques de tu expediente</h2>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {elements.map((element) => (
                      <article key={element.id} className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex items-start gap-4">
                          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600">
                            {element.type === "personas" ? <Users className="size-5" /> : element.type === "fechas" ? <CalendarDays className="size-5" /> : element.type === "pruebas" ? <Paperclip className="size-5" /> : element.type === "normas" ? <Landmark className="size-5" /> : <ClipboardCheck className="size-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="font-semibold text-slate-900">{element.title}</h3>
                              <Badge variant="outline" className={`rounded-md text-[10px] ${element.status === "listo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                                {element.status === "listo" ? "Confirmado" : "Por confirmar"}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{element.detail}</p>
                            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{typeLabels[element.type]}</p>
                            {element.date && <p className="mt-2 text-xs font-medium text-slate-500">Fecha: {element.date}</p>}
                            {element.sourceUrl && (
                              <a href={element.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#173f6b] hover:underline">
                                Abrir fuente guardada <ExternalLink className="size-3.5" />
                              </a>
                            )}
                            {element.status !== "listo" && (
                              <Button variant="outline" size="sm" className="mt-4" onClick={() => confirmElement(element.id)}>
                                <Check className="size-3.5" /> Confirmar bloque
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {suggestedSources.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Trazabilidad</p>
                      <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Fuentes oficiales sugeridas</h2>
                      <p className="mt-1 text-sm text-slate-500">Ábrelas y verifica su vigencia antes de actuar; puedes guardarlas como bloques del expediente.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {suggestedSources.map((source) => (
                        <article key={source.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start gap-3">
                            <Landmark className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900">{source.shortTitle}</h3>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{source.organization}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#173f6b] hover:underline">
                                  Abrir original <ExternalLink className="size-3" />
                                </a>
                                <button onClick={() => addOfficialSource(source)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                                  <Plus className="size-3" /> Guardar como bloque
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeSection === "resultados" && (
              <div className="space-y-6">
                <section>
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Salidas reutilizables</p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold text-[#102238]">Lo que obtienes con tu expediente</h2>
                    <p className="mt-1 text-sm text-slate-500">Cada resultado muestra su estado y la acción necesaria para terminarlo.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {caseOutputs.map((output) => (
                      <article key={output.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid size-10 place-items-center rounded-lg bg-slate-50 text-[#173f6b]">
                            <FileCheck2 className="size-5" />
                          </div>
                          <Badge variant="outline" className={`rounded-md text-[10px] ${output.status === "listo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : output.status === "en-proceso" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                            {output.status === "listo" ? "Listo" : output.status === "en-proceso" ? "En proceso" : "Pendiente"}
                          </Badge>
                        </div>
                        <h3 className="mt-4 font-semibold text-slate-900">{output.title}</h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{output.detail}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 w-full text-[#173f6b]"
                          onClick={() => {
                            if (output.id === "ruta") setActiveSection("ruta");
                            else if (output.id === "borrador") setDocumentOpen(true);
                            else if (output.id === "carpeta") downloadCaseFile();
                            else setActiveSection("expediente");
                          }}
                        >
                          {output.actionLabel} <ArrowRight className="size-3.5" />
                        </Button>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
                    <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Vista previa del borrador</p>
                        <h2 className="mt-1 font-serif text-xl font-semibold text-[#102238]">{orientation.recommendedDocument}</h2>
                      </div>
                      <Badge variant="outline" className={`rounded-md ${isSummaryDocument ? "border-sky-200 bg-sky-50 text-sky-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {isSummaryDocument ? "Resumen informativo" : "Requiere revisión"}
                      </Badge>
                    </div>
                    <div className="max-h-[520px] overflow-auto whitespace-pre-wrap font-serif text-sm leading-7 text-slate-700">
                      {draftText}
                    </div>
                  </div>
                  <aside className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Antes de usarlo</p>
                      <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                        <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Revisa hechos, fechas, destinatario y solicitudes.</li>
                        <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Este archivo no se radica automáticamente.</li>
                        <li className="flex gap-2">
                          {evidenceCount > 0 ? <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />}
                          {evidenceCount > 0 ? `${evidenceCount} ${evidenceCount === 1 ? "prueba registrada" : "pruebas registradas"}.` : "Aún no registraste pruebas."}
                        </li>
                      </ul>
                    </div>
                    <Button className="w-full bg-[#173f6b] text-white hover:bg-[#102f51]" onClick={() => downloadText(draftFilename, draftText)}>
                      <Download className="size-4" /> Descargar borrador
                    </Button>
                    <Button variant="outline" className="w-full" onClick={downloadCaseFile}>
                      <FolderOpen className="size-4" /> Descargar carpeta
                    </Button>
                  </aside>
                </section>
              </div>
            )}

            <div className="mt-8 flex items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              <p>Orientación preliminar con fuentes oficiales sugeridas para verificación. No reemplaza la revisión de un profesional ni garantiza un resultado. Si hay riesgo inmediato, usa los canales de emergencia.</p>
            </div>
          </div>
        </main>

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
              {isAnalyzing ? "Organizando tu relato…" : "Ver respuesta preliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setSelectedSuggestion(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-[#102238]">
              {selectedSuggestion ? `Agregar: ${selectedSuggestion.title}` : "Crear un bloque para tu caso"}
            </DialogTitle>
            <DialogDescription>
              {selectedSuggestion
                ? selectedSuggestion.reason
                : "Guarda un hecho, una persona, una prueba o cualquier dato que ayude a entender tu caso."}
            </DialogDescription>
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
              <Label htmlFor="element-detail">Información del bloque</Label>
              <Textarea id="element-detail" value={newElement.detail} onChange={(event) => setNewElement((current) => ({ ...current, detail: event.target.value }))} placeholder={selectedSuggestion?.prompt ?? "Describe qué muestra o qué ocurrió"} />
              {selectedSuggestion && <p className="text-xs leading-5 text-slate-500">{selectedSuggestion.prompt}</p>}
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
            <Button disabled={!newElement.title.trim() || !newElement.detail.trim()} onClick={addElement} className="bg-[#173f6b] text-white hover:bg-[#102f51]">
              <Plus className="size-4" /> Agregar bloque
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
