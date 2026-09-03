"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  BadgePercent,
  BellRing,
  BookmarkPlus,
  Building2,
  Calendar,
  CalendarClock,
  Car,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Mail,
  Plus,
  Printer,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Square,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { AppScreen } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteFine,
  getEmptyFines,
  getEmptyUser,
  getFinesSnapshot,
  getUserSnapshot,
  saveFine,
  subscribeStorage,
  updateFine,
  type FineKind,
  type StoredFine,
  type UserProfile,
} from "@/lib/device-storage";
import { COLOMBIAN_BANKS, type PaymentInitiationResponse } from "@/lib/simit-payment";
import {
  bestAvailableDiscount,
  buildAgreementStatus,
  buildFineDeadlines,
  formatCurrency,
  formatLongDate,
  normalizeLookup,
  parseLocalDate,
  SIMIT_AGREEMENTS_URL,
  SIMIT_HOME_URL,
  SIMIT_PAYMENT_POINTS_URL,
  validateLookup,
  type FineDeadline,
  type LookupKind,
  type SimitAcuerdoItem,
  type SimitInfractionItem,
  type SimitQueryResult,
} from "@/lib/traffic-fines";

/** Un comparendo o acuerdo entra en "por vencer" cuando su plazo cae en 3 días o menos. */
export const ALERT_WINDOW_DAYS = 3;

export function countFinesNeedingAttention(fines: StoredFine[], today = new Date()): number {
  return fines.filter((fine) => {
    if (fine.paid || fine.notify === false) return false;
    if (fine.kind === "acuerdo_pago") {
      if (!fine.dueDate) return false;
      const due = parseLocalDate(fine.dueDate);
      if (!due) return false;
      const status = buildAgreementStatus(due, today, fine.amount);
      return status.daysLeft >= 0 && status.daysLeft <= (fine.alarmDaysBefore ?? ALERT_WINDOW_DAYS);
    }
    const imposed = parseLocalDate(fine.impositionDate);
    if (!imposed) return false;
    const best = bestAvailableDiscount(buildFineDeadlines(imposed, today, fine.amount));
    return best !== null && best.daysLeft <= (fine.alarmDaysBefore ?? ALERT_WINDOW_DAYS);
  }).length;
}

function emptyDraft(user: UserProfile) {
  return {
    kind: "comparendo" as FineKind,
    reference: "",
    impositionDate: "",
    dueDate: "",
    installmentNumber: 1,
    totalInstallments: 6,
    amount: "",
    city: user.city || "",
    reason: "",
    subject: user.plate || user.documentNumber || "",
    notify: true,
    alarmDaysBefore: 3,
  };
}

const permissionListeners = new Set<() => void>();

function subscribePermission(listener: () => void): () => void {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
}

function getPermission(): NotificationPermission | "no-soportado" {
  return typeof Notification === "undefined" ? "no-soportado" : Notification.permission;
}

function getServerPermission(): NotificationPermission {
  return "default";
}

export function FinesTracker({ onBack }: { onBack: () => void }) {
  const fines = useSyncExternalStore(subscribeStorage, getFinesSnapshot, getEmptyFines);
  const user = useSyncExternalStore(subscribeStorage, getUserSnapshot, getEmptyUser);
  const notifyState = useSyncExternalStore(subscribePermission, getPermission, getServerPermission);

  const [draft, setDraft] = useState(() => emptyDraft(user));
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const [lookupKind, setLookupKind] = useState<LookupKind>(user.documentNumber && !user.plate ? "documento" : "placa");
  const [lookupValue, setLookupValue] = useState(user.plate || user.documentNumber || "");
  const [lookupError, setLookupError] = useState("");

  // Estado de consulta SIMIT integrada
  const [isQueryingSimit, setIsQueryingSimit] = useState(false);
  const [simitQueryResult, setSimitQueryResult] = useState<SimitQueryResult | null>(null);
  const [simitQueryError, setSimitQueryError] = useState("");
  const [savedSuccessMsg, setSavedSuccessMsg] = useState("");

  // Modal para envío de correo
  const [emailModalFine, setEmailModalFine] = useState<{
    reference: string;
    kind: "comparendo" | "acuerdo_pago";
    reason?: string;
    amount?: number | null;
    subject?: string;
    dueDate?: string;
    impositionDate?: string;
    id?: string;
  } | null>(null);

  const [emailInput, setEmailInput] = useState(user.email || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState("");
  const [emailErrorMsg, setEmailErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "comparendos" | "acuerdos">("todos");

  // Estados para la Pasarela de Pagos SIMIT Oficial
  const [selectedFineIds, setSelectedFineIds] = useState<string[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"method" | "processing" | "receipt">("method");
  const [selectedGateway, setSelectedGateway] = useState<"pse" | "tarjeta" | "daviplata" | "liquidacion_pdf">("pse");
  const [selectedBank, setSelectedBank] = useState("1007"); // BANCOLOMBIA
  const [payerName, setPayerName] = useState("");
  const [payerDoc, setPayerDoc] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [personType, setPersonType] = useState<"natural" | "juridica">("natural");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardInstallments, setCardInstallments] = useState(1);
  const [daviplataPhone, setDaviplataPhone] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentInitiationResponse | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [expandedFineIds, setExpandedFineIds] = useState<string[]>([]);
  const [isSavedFinesExpanded, setIsSavedFinesExpanded] = useState(false);

  const savedTotalAmount = fines.reduce((sum, f) => sum + (f.paid ? 0 : (f.amount || 0)), 0);
  const savedComparendosCount = fines.filter((f) => f.kind !== "acuerdo_pago").length;
  const savedAcuerdosCount = fines.filter((f) => f.kind === "acuerdo_pago").length;

  function toggleExpandFine(id: string) {
    setExpandedFineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const notifiedRef = useRef(false);

  // Auto-llenar con datos del usuario si cambia
  useEffect(() => {
    if (user.email && !emailInput) {
      setEmailInput(user.email);
    }
  }, [user.email, emailInput]);

  useEffect(() => {
    if (simitQueryResult && Array.isArray(simitQueryResult.multas)) {
      setSelectedFineIds(simitQueryResult.multas.map((m) => m.id));
      if (simitQueryResult.infractor?.nombreCompleto) {
        setPayerName(simitQueryResult.infractor.nombreCompleto);
      }
      if (simitQueryResult.infractor?.numeroDocumento) {
        setPayerDoc(simitQueryResult.infractor.numeroDocumento);
      }
    }
  }, [simitQueryResult]);

  useEffect(() => {
    if (notifyState !== "granted" || notifiedRef.current) return;
    const pending = countFinesNeedingAttention(fines);
    if (pending === 0) return;
    notifiedRef.current = true;
    new Notification("Descuento o cuota por vencer", {
      body: `Tienes ${pending} obligación(es) de tránsito con fecha límite próxima.`,
      icon: "/icon-192.png",
    });
  }, [fines, notifyState]);

  const enableAlerts = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
    for (const listener of permissionListeners) listener();
  }, []);

  async function handleQuerySimit() {
    const problem = validateLookup(lookupKind, lookupValue);
    if (problem) {
      setLookupError(problem);
      return;
    }
    const clean = normalizeLookup(lookupValue);
    setLookupError("");
    setSimitQueryError("");
    setSavedSuccessMsg("");
    setIsQueryingSimit(true);
    setSimitQueryResult(null);

    try {
      const res = await fetch("/api/simit/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: lookupKind,
          valor: clean,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo completar la consulta en el SIMIT.");
      }

      setSimitQueryResult(data as SimitQueryResult);
      setDraft((prev) => ({ ...prev, subject: clean }));
    } catch (err) {
      setSimitQueryError(err instanceof Error ? err.message : "Error al conectar con la consulta SIMIT.");
    } finally {
      setIsQueryingSimit(false);
    }
  }

  function handleSaveExtractedFine(m: SimitInfractionItem) {
    saveFine({
      kind: "comparendo",
      reference: m.numeroComparendo,
      impositionDate: m.fecha,
      amount: m.valorBase,
      city: m.organismoTransito || "Colombia",
      reason: `${m.codigoInfraccion} - ${m.descripcionInfraccion}`,
      paid: m.estadoComparendo === "pagado",
      subject: m.placa || normalizeLookup(lookupValue),
      notify: true,
      alarmDaysBefore: 3,
    });
    setSavedSuccessMsg(`Comparendo N.° ${m.numeroComparendo} guardado en tus obligaciones.`);
    setTimeout(() => setSavedSuccessMsg(""), 4000);
  }

  function handleSaveExtractedAgreement(a: SimitAcuerdoItem) {
    saveFine({
      kind: "acuerdo_pago",
      reference: a.numeroAcuerdo,
      impositionDate: a.fechaSuscripcion || new Date().toISOString().split("T")[0],
      dueDate: a.fechaVencimiento,
      installmentNumber: a.cuotaActual,
      totalInstallments: a.totalCuotas,
      amount: a.valorCuota,
      city: a.organismoTransito || "Colombia",
      reason: `Cuota ${a.cuotaActual} de ${a.totalCuotas} - Convenio de pago`,
      paid: a.estado === "pagado",
      subject: normalizeLookup(lookupValue),
      notify: true,
      alarmDaysBefore: 3,
    });
    setSavedSuccessMsg(`Acuerdo de pago N.° ${a.numeroAcuerdo} guardado en tus obligaciones.`);
    setTimeout(() => setSavedSuccessMsg(""), 4000);
  }

  function handleOpenPaymentModal(
    itemsToPay?: SimitInfractionItem[],
    initialGateway?: "pse" | "tarjeta" | "daviplata" | "liquidacion_pdf",
  ) {
    if (itemsToPay && itemsToPay.length > 0) {
      setSelectedFineIds(itemsToPay.map((m) => m.id));
    }
    if (initialGateway) {
      setSelectedGateway(initialGateway);
    }
    setPaymentStep("method");
    setPaymentError("");
    setPaymentReceipt(null);
    setPayerName(simitQueryResult?.infractor?.nombreCompleto || user.name || "JULIAN CAMILO DUARTE HERNANDEZ");
    setPayerDoc(simitQueryResult?.infractor?.numeroDocumento || lookupValue || user.documentNumber || "");
    setPayerEmail(user.email || emailInput || "contribuyente@correo.com");
    setPayerPhone(user.phone || "3001234567");
    setIsPaymentModalOpen(true);
  }

  function handleToggleFineSelection(id: string) {
    setSelectedFineIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleToggleSelectAllFines() {
    if (!simitQueryResult || !Array.isArray(simitQueryResult.multas)) return;
    if (selectedFineIds.length === simitQueryResult.multas.length) {
      setSelectedFineIds([]);
    } else {
      setSelectedFineIds(simitQueryResult.multas.map((m) => m.id));
    }
  }

  async function handleExecutePayment() {
    if (!payerName.trim() || !payerDoc.trim() || !payerEmail.trim()) {
      setPaymentError("Por favor completa los datos del pagador (Nombre, Documento y Correo Electrónico).");
      return;
    }
    if (selectedGateway === "tarjeta" && (!cardNumber || !cardExp || !cardCvv)) {
      setPaymentError("Por favor completa los datos de la tarjeta de crédito o débito.");
      return;
    }
    if (selectedGateway === "daviplata" && !daviplataPhone) {
      setPaymentError("Por favor ingresa tu número de celular Daviplata.");
      return;
    }

    const itemsToPay = (simitQueryResult?.multas || []).filter((m) => selectedFineIds.includes(m.id));
    if (itemsToPay.length === 0) {
      setPaymentError("Selecciona al menos una obligación para realizar el pago o generar la liquidación.");
      return;
    }

    const totalAmount = itemsToPay.reduce((sum, item) => sum + item.valorPagar, 0);

    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      const res = await fetch("/api/simit/pagos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodoPago: selectedGateway,
          pagador: {
            nombres: payerName,
            apellidos: "",
            tipoDocumento: "CC",
            numeroDocumento: payerDoc,
            email: payerEmail,
            telefono: payerPhone || daviplataPhone || "3000000000",
            banco: selectedGateway === "pse" ? selectedBank : undefined,
            tipoPersona: personType,
          },
          items: itemsToPay.map((m) => ({
            idMulta: m.id,
            numeroComparendo: m.numeroComparendo,
            numeroResolucion: m.numeroResolucion,
            placa: m.placa,
            descripcion: m.descripcionInfraccion,
            organismoTransito: m.organismoTransito,
            valor: m.valorPagar,
          })),
          total: totalAmount,
          tarjetaData:
            selectedGateway === "tarjeta"
              ? {
                  numeroEnmascarado: `**** **** **** ${cardNumber.replace(/\s/g, "").slice(-4)}`,
                  franquicia: cardNumber.startsWith("4") ? "Visa" : cardNumber.startsWith("5") ? "Mastercard" : "Amex",
                  cuotas: cardInstallments,
                }
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exitoso) {
        throw new Error(data.error || "No se pudo procesar la transacción en la pasarela.");
      }

      setPaymentReceipt(data as PaymentInitiationResponse);
      setPaymentStep("receipt");

      // Si fue pago aprobado (PSE, Tarjeta o Daviplata), guardar como pagada en historial local
      if (selectedGateway !== "liquidacion_pdf") {
        itemsToPay.forEach((m) => {
          saveFine({
            kind: "comparendo",
            reference: m.numeroResolucion || m.numeroComparendo,
            impositionDate: m.fecha,
            amount: m.valorPagar,
            city: m.organismoTransito || "Colombia",
            reason: `${m.codigoInfraccion} - ${m.descripcionInfraccion} (PAGADO SIMIT Ref: ${data.referenciaPago})`,
            paid: true,
            subject: m.placa || payerDoc,
            notify: false,
            alarmDaysBefore: 0,
          });
        });
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Error al conectar con la pasarela de pagos.");
    } finally {
      setIsProcessingPayment(false);
    }
  }

  function handleAddManualFine() {
    const reference = draft.reference.trim();
    if (reference.length < 3) {
      setFormError(
        draft.kind === "acuerdo_pago"
          ? "Escribe el número del acuerdo o radicado de pago."
          : "Escribe el número del comparendo tal como aparece en la orden.",
      );
      return;
    }

    if (draft.kind === "acuerdo_pago") {
      if (!draft.dueDate) {
        setFormError("Indica la fecha de vencimiento de la cuota.");
        return;
      }
    } else {
      const imposed = parseLocalDate(draft.impositionDate);
      if (!imposed) {
        setFormError("Indica la fecha de imposición del comparendo.");
        return;
      }
      if (imposed.getTime() > Date.now()) {
        setFormError("La fecha de imposición no puede estar en el futuro.");
        return;
      }
    }

    const rawAmount = Number(draft.amount.replace(/[^\d]/g, ""));
    setFormError("");

    saveFine({
      kind: draft.kind,
      reference,
      impositionDate: draft.impositionDate || new Date().toISOString().split("T")[0],
      dueDate: draft.dueDate || undefined,
      installmentNumber: draft.kind === "acuerdo_pago" ? Number(draft.installmentNumber) || 1 : undefined,
      totalInstallments: draft.kind === "acuerdo_pago" ? Number(draft.totalInstallments) || 6 : undefined,
      amount: Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : null,
      city: draft.city.trim(),
      reason: draft.reason.trim(),
      paid: false,
      subject: normalizeLookup(draft.subject),
      notify: draft.notify,
      alarmDaysBefore: Number(draft.alarmDaysBefore) || 3,
    });

    setDraft(emptyDraft(user));
    setFormOpen(false);
  }

  async function handleSendEmailNotification(fineData: {
    reference: string;
    kind: "comparendo" | "acuerdo_pago";
    reason?: string;
    amount?: number | null;
    subject?: string;
    dueDate?: string;
    impositionDate?: string;
    id?: string;
  }) {
    const targetEmail = emailInput.trim() || user.email;
    if (!targetEmail || !targetEmail.includes("@")) {
      setEmailErrorMsg("Escribe un correo electrónico válido para enviar la alerta.");
      return;
    }

    setIsSendingEmail(true);
    setEmailErrorMsg("");
    setEmailSuccessMsg("");

    const isAgreement = fineData.kind === "acuerdo_pago";
    let deadlineText = "";
    let daysLeft = 0;
    let discountPct: number | undefined = undefined;

    if (isAgreement && fineData.dueDate) {
      const due = parseLocalDate(fineData.dueDate);
      if (due) {
        const st = buildAgreementStatus(due, new Date(), fineData.amount);
        deadlineText = formatLongDate(due);
        daysLeft = st.daysLeft;
      }
    } else if (fineData.impositionDate) {
      const imposed = parseLocalDate(fineData.impositionDate);
      if (imposed) {
        const dls = buildFineDeadlines(imposed, new Date(), fineData.amount);
        const best = bestAvailableDiscount(dls);
        if (best) {
          deadlineText = formatLongDate(best.deadline);
          daysLeft = best.daysLeft;
          discountPct = best.percentage;
        } else {
          deadlineText = "Descuentos vencidos";
          daysLeft = -1;
        }
      }
    }

    try {
      const res = await fetch("/api/notificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          userName: user.name || "Ciudadano(a)",
          reference: fineData.reference,
          kind: fineData.kind || "comparendo",
          subject: fineData.subject,
          daysLeft,
          deadlineText,
          amount: fineData.amount,
          discountPercentage: discountPct,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudo procesar el correo.");

      if (fineData.id) {
        updateFine(fineData.id, { lastEmailSentAt: new Date().toISOString() });
      }
      setEmailSuccessMsg(`Recordatorio preparado y registrado para ${targetEmail}`);

      setTimeout(() => {
        setEmailModalFine(null);
        setEmailSuccessMsg("");
      }, 2000);
    } catch (err) {
      setEmailErrorMsg(err instanceof Error ? err.message : "Error al procesar el recordatorio.");
    } finally {
      setIsSendingEmail(false);
    }
  }

  const filteredFines = fines.filter((fine) => {
    if (activeTab === "comparendos") return fine.kind !== "acuerdo_pago";
    if (activeTab === "acuerdos") return fine.kind === "acuerdo_pago";
    return true;
  });

  return (
    <AppScreen
      title="Comparendos y Multas (SIMIT)"
      subtitle="Consulta oficial directa, control de descuentos y alarmas"
      onBack={onBack}
    >
      {/* 1. SECCIÓN PRINCIPAL: CONSULTA DIRECTA OFICIAL AL SIMIT (ARRIBA) */}
      <section className="app-card space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Car className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Consulta Oficial SIMIT
              </h2>
              <p className="text-[11px] text-slate-500">
                Base de datos nacional de la Federación Colombiana de Municipios
              </p>
            </div>
          </div>
          <span className="pill-badge bg-emerald-50 text-emerald-800 border border-emerald-200">
            Conexión Oficial
          </span>
        </div>

        {/* Selector segmentado moderno tipo iOS */}
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setLookupKind("placa");
              setLookupError("");
              setSimitQueryResult(null);
              if (user.plate) setLookupValue(user.plate);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
              lookupKind === "placa"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Car className="size-3.5" />
            <span>Por Placa de Vehículo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLookupKind("documento");
              setLookupError("");
              setSimitQueryResult(null);
              if (user.documentNumber) setLookupValue(user.documentNumber);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
              lookupKind === "documento"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>Por Cédula / Documento</span>
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            value={lookupValue}
            onChange={(event) => {
              setLookupValue(event.target.value);
              setLookupError("");
            }}
            placeholder={lookupKind === "placa" ? "Ej. ABC123" : "Ej. 1065631508"}
            inputMode={lookupKind === "placa" ? "text" : "numeric"}
            maxLength={16}
            className="uppercase font-mono text-sm font-bold tracking-wider flex-1 h-10"
          />
          <Button
            type="button"
            disabled={isQueryingSimit}
            onClick={handleQuerySimit}
            className="shrink-0 bg-slate-900 text-white hover:bg-slate-800 px-5 text-xs font-bold h-10 shadow-xs"
          >
            {isQueryingSimit ? (
              <span className="flex items-center gap-1.5">
                <LoaderCircle className="size-3.5 animate-spin" /> Consultando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Search className="size-3.5" /> Consultar
              </span>
            )}
          </Button>
        </div>

        {lookupError && (
          <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 font-medium">
            <TriangleAlert className="size-4 shrink-0 text-rose-600" />
            <span>{lookupError}</span>
          </p>
        )}

        {/* RESULTADOS DE LA CONSULTA DIRECTA AL SIMIT */}
        {simitQueryResult && (
          <div className="space-y-3.5 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200">
            {/* Encabezado del resultado */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 uppercase bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {simitQueryResult.criterio.valor}
                  </span>
                  <span className="text-xs text-slate-500">
                    {simitQueryResult.criterio.tipo === "placa" ? "Vehículo" : "Conductor"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Total deudas oficiales en SIMIT:{" "}
                  <strong className="text-slate-900 font-bold">
                    {formatCurrency(simitQueryResult.resumen.totalGeneral)}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {simitQueryResult.multas.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleToggleSelectAllFines}
                    variant="outline"
                    className="text-xs h-7 border-slate-300"
                  >
                    {selectedFineIds.length === simitQueryResult.multas.length ? "Deseleccionar" : "Seleccionar todo"}
                  </Button>
                )}
              </div>
            </div>

            {/* Barra de Pago Masivo */}
            {selectedFineIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-900 p-3 text-white shadow-sm">
                <div>
                  <p className="text-xs font-bold">
                    {selectedFineIds.length} {selectedFineIds.length === 1 ? "obligación seleccionada" : "obligaciones seleccionadas"}
                  </p>
                  <p className="text-sm font-extrabold text-emerald-200">
                    Total:{" "}
                    {formatCurrency(
                      simitQueryResult.multas
                        .filter((m) => selectedFineIds.includes(m.id))
                        .reduce((sum, item) => sum + item.valorPagar, 0),
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenPaymentModal(undefined, "pse")}
                    className="bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold h-8 gap-1.5"
                  >
                    <CreditCard className="size-3.5 text-emerald-800" /> Pagar Selección (PSE)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPaymentModal(undefined, "liquidacion_pdf")}
                    className="bg-emerald-800/60 text-white hover:bg-emerald-800 border-emerald-700 text-xs h-8 gap-1.5"
                  >
                    <Download className="size-3.5" /> Cupón
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de Comparendos y Resoluciones */}
            {simitQueryResult.pazSalvo ? (
              <div className="rounded-xl bg-emerald-50/80 p-4 text-center text-emerald-900 border border-emerald-200">
                <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold">¡Paz y Salvo Oficial!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  No se registran comparendos ni multas pendientes en el SIMIT para {simitQueryResult.criterio.valor}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {simitQueryResult.multas.map((m) => {
                  const isSelected = selectedFineIds.includes(m.id);
                  const isExpanded = expandedFineIds.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`rounded-2xl border bg-white p-3.5 transition-all shadow-2xs space-y-2.5 ${
                        isSelected ? "border-slate-900 ring-1 ring-slate-900/10" : "border-slate-200/90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleFineSelection(m.id)}
                            className="mt-0.5 shrink-0 text-slate-900 hover:opacity-80"
                            aria-label="Seleccionar para pagar"
                          >
                            {isSelected ? (
                              <CheckSquare className="size-4.5 text-slate-900" />
                            ) : (
                              <Square className="size-4.5 text-slate-300" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`pill-badge ${
                                  m.tipo === "resolucion"
                                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                                    : m.tipo === "fotodeteccion"
                                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {m.tipo === "resolucion"
                                  ? "Resolución"
                                  : m.tipo === "fotodeteccion"
                                    ? "Fotomulta"
                                    : "Comparendo"}
                              </span>
                              {m.placa && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">
                                  {m.placa}
                                </span>
                              )}
                              <span className="text-[11px] font-mono font-bold text-slate-600">
                                {m.numeroResolucion ? `Res. ${m.numeroResolucion}` : `N.° ${m.numeroComparendo}`}
                              </span>
                            </div>

                            {/* Título recortado en preview + click para expandir */}
                            <button
                              type="button"
                              onClick={() => toggleExpandFine(m.id)}
                              className="text-left w-full group/title cursor-pointer mt-1 block"
                            >
                              <h4 className={`font-display text-xs font-bold text-slate-900 group-hover/title:text-blue-900 transition-colors ${isExpanded ? "" : "line-clamp-1"}`}>
                                {m.codigoInfraccion} · {m.descripcionInfraccion}
                              </h4>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                                <span className="text-slate-700 group-hover/title:underline">
                                  {isExpanded ? "Ocultar detalle" : "Ver más detalle"}
                                </span>
                                <ChevronDown className={`size-3 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                            </button>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                                <Calendar className="size-3 text-slate-500" />
                                <span>Fecha comparendo: <strong>{m.fecha}</strong></span>
                              </span>
                              <span className="text-[11px] text-slate-500">· {m.organismoTransito} {m.departamento ? `(${m.departamento})` : ""}</span>
                            </div>
                          </div>
                        </div>

                        {/* Monto de la Multa en la búsqueda */}
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Total</p>
                          <p className="text-sm font-extrabold text-slate-900">{formatCurrency(m.valorPagar)}</p>
                        </div>
                      </div>

                      {/* Acordeón Plegable de Descuentos / Detalles */}
                      {isExpanded && (
                        <div className="rounded-xl bg-slate-50 p-2.5 text-xs space-y-1.5 border border-slate-200/80">
                          {m.descuento50 && m.fechaLimite50 && (
                            <div className="flex justify-between text-slate-700 text-[11px]">
                              <span>50% Descuento (5 días hábiles):</span>
                              <span className="font-bold text-emerald-800">
                                {formatCurrency(m.descuento50)} (Hasta {m.fechaLimite50})
                              </span>
                            </div>
                          )}
                          {m.descuento25 && m.fechaLimite25 && (
                            <div className="flex justify-between text-slate-600 text-[11px]">
                              <span>25% Descuento (20 días hábiles):</span>
                              <span className="font-semibold text-slate-800">
                                {formatCurrency(m.descuento25)} (Hasta {m.fechaLimite25})
                              </span>
                            </div>
                          )}
                          {m.numeroResolucion && (
                            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                              Resolución Sancionatoria N.° {m.numeroResolucion} (Comparendo original: {m.numeroComparendo})
                            </p>
                          )}
                          <p className="text-[10px] text-slate-600 pt-0.5">
                            Organismo sancionador: <strong>{m.organismoTransito}</strong> {m.departamento ? `(${m.departamento})` : ""}
                          </p>
                        </div>
                      )}

                      {/* Barra de Acciones de la Tarjeta */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenPaymentModal([m], "pse")}
                          className="bg-emerald-700 text-white hover:bg-emerald-800 text-[11px] font-bold h-7 gap-1"
                        >
                          <CreditCard className="size-3" /> Pagar PSE / Tarjeta
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPaymentModal([m], "liquidacion_pdf")}
                          className="text-[11px] h-7 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <FileText className="size-3 text-slate-600" /> Cupón
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveExtractedFine(m)}
                          className="text-[11px] h-7 gap-1 text-slate-600 hover:text-slate-900"
                        >
                          <BookmarkPlus className="size-3" /> Guardar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEmailModalFine({
                              reference: m.numeroComparendo,
                              kind: "comparendo",
                              reason: `${m.codigoInfraccion} - ${m.descripcionInfraccion}`,
                              amount: m.valorPagar,
                              subject: m.placa || normalizeLookup(lookupValue),
                              impositionDate: m.fecha,
                              id: m.id,
                            })
                          }
                          className="text-xs gap-1.5 text-amber-900 border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 ml-auto"
                        >
                          <Mail className="size-3.5 text-amber-700" /> Alarma
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Acuerdos de Pago Extraídos de la Consulta */}
            {simitQueryResult.acuerdos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="font-display text-xs font-bold text-slate-900">
                  Acuerdos y Convenios de Pago Registrados
                </h3>
                {simitQueryResult.acuerdos.map((a: SimitAcuerdoItem) => (
                  <div key={a.id || a.numeroAcuerdo} className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="pill-badge bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Acuerdo Cuota {a.cuotaActual}/{a.totalCuotas}
                        </span>
                        <h4 className="font-display mt-1 text-xs font-bold text-slate-900">
                          Convenio N.° {a.numeroAcuerdo}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {a.organismoTransito} · Vence: {a.fechaVencimiento}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Valor Cuota</p>
                        <p className="text-sm font-extrabold text-indigo-900">{formatCurrency(a.valorCuota)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveExtractedAgreement(a)}
                        className="bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold h-7 gap-1"
                      >
                        <BookmarkPlus className="size-3" /> Guardar cuota
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEmailModalFine({
                            reference: a.numeroAcuerdo,
                            kind: "acuerdo_pago",
                            reason: `Cuota ${a.cuotaActual} de ${a.totalCuotas} - Acuerdo de pago`,
                            amount: a.valorCuota,
                            subject: normalizeLookup(lookupValue),
                            dueDate: a.fechaVencimiento,
                          })
                        }
                        className="text-xs gap-1.5 text-amber-900 border-amber-300 bg-amber-50/50 hover:bg-amber-100/60"
                      >
                        <Mail className="size-3.5 text-amber-700" /> Alarma por correo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. SECCIÓN: HISTORIAL DE OBLIGACIONES GUARDADAS (DESPLEGABLE CON TOTALES Y CANTIDADES, ABAJO DE LA BÚSQUEDA) */}
      <section className="app-card space-y-3.5">
        <button
          type="button"
          onClick={() => setIsSavedFinesExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-left gap-3 group cursor-pointer"
          aria-expanded={isSavedFinesExpanded}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-2xs">
              <BookmarkPlus className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-slate-900 truncate">
                  Historial de Comparendos Guardados
                </h2>
                <span className="pill-badge bg-slate-100 text-slate-800 border border-slate-200">
                  {fines.length} {fines.length === 1 ? "guardado" : "guardados"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {fines.length > 0
                  ? "Control de fechas límite, alarmas y pagos en este dispositivo"
                  : "No tienes comparendos guardados en este dispositivo"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 group-hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors">
            <span className="text-xs font-bold text-slate-800">
              {isSavedFinesExpanded ? "Ocultar" : "Ver historial"}
            </span>
            <ChevronDown
              className={`size-3.5 text-slate-600 transition-transform duration-200 ${
                isSavedFinesExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {/* 4 TARJETAS KPI DE RESUMEN: TOTAL $, CANTIDAD TOTAL, COMPARENDOS, ACUERDOS */}
        <div className="grid grid-cols-4 gap-2 pt-0.5">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Total Deuda</p>
            <p className="font-display mt-0.5 text-xs font-extrabold text-slate-900 truncate sm:text-sm">
              {formatCurrency(savedTotalAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Total</p>
            <p className="font-display mt-0.5 text-xs font-extrabold text-slate-900 sm:text-sm">
              {fines.length}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-2.5 text-center">
            <p className="text-[9px] font-bold text-amber-800 uppercase tracking-tight">Comparendos</p>
            <p className="font-display mt-0.5 text-xs font-extrabold text-amber-950 sm:text-sm">
              {savedComparendosCount}
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/50 p-2.5 text-center">
            <p className="text-[9px] font-bold text-indigo-800 uppercase tracking-tight">Acuerdos</p>
            <p className="font-display mt-0.5 text-xs font-extrabold text-indigo-950 sm:text-sm">
              {savedAcuerdosCount}
            </p>
          </div>
        </div>

        {/* CONTENIDO DESPLEGABLE: Filtros, registro manual y listado */}
        {isSavedFinesExpanded && (
          <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("todos")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeTab === "todos"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Todas ({fines.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("comparendos")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeTab === "comparendos"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Comparendos ({savedComparendosCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("acuerdos")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeTab === "acuerdos"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Acuerdos ({savedAcuerdosCount})
                </button>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setFormOpen((open) => !open)}
                variant={formOpen ? "secondary" : "outline"}
                className="text-xs h-7.5 gap-1.5 border-slate-300"
              >
                <Plus className="size-3" />
                <span>{formOpen ? "Cerrar" : "Registrar manual"}</span>
              </Button>
            </div>

            {/* FORMULARIO DE REGISTRO MANUAL */}
            {formOpen && (
              <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-display text-xs font-bold text-slate-900">Registrar comparendo o cuota manual</h3>
                  <p className="text-[11px] text-slate-500">Ingresa los datos para calcular fechas de descuento y programar alarmas.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, kind: "comparendo" })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition ${
                      draft.kind === "comparendo"
                        ? "border-slate-900 bg-slate-900/5 text-slate-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Car className="size-3.5" /> Comparendo / Fotomulta
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, kind: "acuerdo_pago" })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition ${
                      draft.kind === "acuerdo_pago"
                        ? "border-slate-900 bg-slate-900/5 text-slate-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <FileSpreadsheet className="size-3.5" /> Acuerdo de pago (Cuota)
                  </button>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="fine-ref-top" className="text-xs">
                      {draft.kind === "acuerdo_pago" ? "N.° de acuerdo o convenio" : "Número del comparendo"}
                    </Label>
                    <Input
                      id="fine-ref-top"
                      value={draft.reference}
                      onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
                      placeholder={draft.kind === "acuerdo_pago" ? "Ej. AP-2026-0045" : "Ej. 11001000000012345678"}
                      maxLength={40}
                      className="text-xs h-8"
                      required
                    />
                  </div>

                  {draft.kind === "acuerdo_pago" ? (
                    <div className="space-y-1">
                      <Label htmlFor="fine-due-top" className="text-xs">Fecha de vencimiento de la cuota</Label>
                      <Input
                        id="fine-due-top"
                        type="date"
                        value={draft.dueDate}
                        onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="fine-date-top" className="text-xs">Fecha de imposición del comparendo</Label>
                      <Input
                        id="fine-date-top"
                        type="date"
                        value={draft.impositionDate}
                        onChange={(e) => setDraft({ ...draft, impositionDate: e.target.value })}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  )}

                  {draft.kind === "acuerdo_pago" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="fine-inst-num-top" className="text-xs">N.° Cuota</Label>
                        <Input
                          id="fine-inst-num-top"
                          type="number"
                          min={1}
                          max={120}
                          value={draft.installmentNumber}
                          onChange={(e) => setDraft({ ...draft, installmentNumber: Number(e.target.value) })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fine-inst-tot-top" className="text-xs">De un total de</Label>
                        <Input
                          id="fine-inst-tot-top"
                          type="number"
                          min={1}
                          max={120}
                          value={draft.totalInstallments}
                          onChange={(e) => setDraft({ ...draft, totalInstallments: Number(e.target.value) })}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="fine-amount-top" className="text-xs">
                      {draft.kind === "acuerdo_pago" ? "Valor de la cuota (COP)" : "Valor total (opcional)"}
                    </Label>
                    <Input
                      id="fine-amount-top"
                      inputMode="numeric"
                      value={draft.amount}
                      onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                      placeholder="Ej. 250000"
                      maxLength={12}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fine-subj-top" className="text-xs">Placa o Cédula vinculada</Label>
                    <Input
                      id="fine-subj-top"
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      placeholder="Ej. ABC123"
                      maxLength={16}
                      className="uppercase text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fine-city-top" className="text-xs">Municipio u Organismo de Tránsito</Label>
                    <Input
                      id="fine-city-top"
                      value={draft.city}
                      onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                      placeholder="Ej. Valledupar / Bogotá"
                      maxLength={80}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fine-reason-top" className="text-xs">Infracción o detalle (opcional)</Label>
                    <Input
                      id="fine-reason-top"
                      value={draft.reason}
                      onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                      placeholder={draft.kind === "acuerdo_pago" ? "Ej. Cuota convenio" : "Ej. C02 - Técnico mecánica"}
                      maxLength={140}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.notify}
                      onChange={(e) => setDraft({ ...draft, notify: e.target.checked })}
                      className="size-3.5 accent-slate-900"
                    />
                    <span className="text-[11px]">Activar alarma para esta obligación</span>
                  </label>

                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span>Avisarme con</span>
                    <select
                      value={draft.alarmDaysBefore}
                      onChange={(e) => setDraft({ ...draft, alarmDaysBefore: Number(e.target.value) })}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs"
                    >
                      <option value={1}>1 día de anticipación</option>
                      <option value={3}>3 días de anticipación</option>
                      <option value={5}>5 días de anticipación</option>
                      <option value={7}>7 días de anticipación</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">
                    <TriangleAlert className="size-3.5 shrink-0 text-rose-600" /> {formError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} className="text-xs h-7">
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddManualFine} className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-7">
                    Guardar obligación
                  </Button>
                </div>
              </div>
            )}

            {/* LISTADO DE TARJETAS GUARDADAS */}
            {filteredFines.length === 0 && !formOpen ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  No hay obligaciones guardadas en esta pestaña.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {filteredFines.map((fine) => (
                  <FineCardItem
                    key={fine.id}
                    fine={fine}
                    onTogglePaid={() => updateFine(fine.id, { paid: !fine.paid })}
                    onToggleNotify={() => updateFine(fine.id, { notify: fine.notify === false })}
                    onDelete={() => deleteFine(fine.id)}
                    onRequestEmailAlert={() =>
                      setEmailModalFine({
                        reference: fine.reference,
                        kind: fine.kind || "comparendo",
                        reason: fine.reason,
                        amount: fine.amount,
                        subject: fine.subject,
                        dueDate: fine.dueDate,
                        impositionDate: fine.impositionDate,
                        id: fine.id,
                      })
                    }
                    onPayOnline={() => {
                      handleOpenPaymentModal([
                        {
                          id: `stored-${fine.id}`,
                          numeroComparendo: fine.reference,
                          numeroResolucion: fine.reference.startsWith("202") ? fine.reference : undefined,
                          fecha: fine.impositionDate || new Date().toISOString().split("T")[0],
                          valorBase: fine.amount || 0,
                          valorPagar: fine.amount || 0,
                          organismoTransito: fine.city || "SIMIT",
                          codigoInfraccion: "INF",
                          descripcionInfraccion: fine.reason || "Obligación de tránsito",
                          placa: fine.subject || "",
                          tipo: fine.kind === "acuerdo_pago" ? "comparendo" : "comparendo",
                          estadoComparendo: fine.paid ? "pagado" : "vigente",
                          estadoDescuento: "vencido",
                          requiereCurso: false,
                        },
                      ], "pse");
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* DIÁLOGO PARA ENVIAR ALERTA POR CORREO */}
      <Dialog open={Boolean(emailModalFine)} onOpenChange={(open) => !open && setEmailModalFine(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800">
              <Mail className="size-5" />
            </div>
            <DialogTitle className="font-display text-lg text-[#102238]">Enviar Alerta a mi Correo</DialogTitle>
            <DialogDescription className="text-xs leading-5">
              Te enviaremos un correo con las fechas límite, el descuento aplicable y el enlace directo de pago en el SIMIT.
            </DialogDescription>
          </DialogHeader>

          {emailModalFine && (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {emailModalFine.kind === "acuerdo_pago" ? "Acuerdo de Pago" : "Comparendo"} N.° {emailModalFine.reference}
                </p>
                <p className="mt-1 font-semibold text-slate-900">{emailModalFine.reason || "Obligación de tránsito"}</p>
                {emailModalFine.amount && (
                  <p className="mt-0.5 text-xs text-slate-600">Valor registrado: {formatCurrency(emailModalFine.amount)}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="target-email">Enviar recordatorio a:</Label>
                <Input
                  id="target-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>

              {emailErrorMsg && (
                <p className="flex items-center gap-1.5 text-xs text-rose-700" role="alert">
                  <AlertCircle className="size-4 shrink-0" /> {emailErrorMsg}
                </p>
              )}

              {emailSuccessMsg && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700" role="status">
                  <CheckCircle2 className="size-4 shrink-0" /> {emailSuccessMsg}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEmailModalFine(null)}>
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSendingEmail}
              onClick={() => emailModalFine && handleSendEmailNotification(emailModalFine)}
              className="bg-[#173f6b] text-white hover:bg-[#102f51]"
            >
              {isSendingEmail ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {isSendingEmail ? "Enviando..." : "Enviar alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. MODAL DE PASARELA DE PAGOS OFICIAL SIMIT (PSE / TARJETA / DAVIPLATA / CUPÓN) */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          if (!open && !isProcessingPayment) {
            setIsPaymentModalOpen(false);
            setPaymentReceipt(null);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="size-5 text-emerald-600" />
              <DialogTitle className="font-display text-lg font-bold text-[#102238]">
                {paymentStep === "receipt"
                  ? "Comprobante Oficial de Pago SIMIT"
                  : "Pasarela Oficial de Pagos SIMIT"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {paymentStep === "receipt"
                ? "Tu transacción ha sido validada y registrada en el sistema de la Federación Colombiana de Municipios."
                : "Realiza el pago seguro en línea o descarga el cupón bancario sin salir de la plataforma."}
            </DialogDescription>
          </DialogHeader>

          {paymentStep === "receipt" && paymentReceipt ? (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 text-center space-y-2">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="font-display text-base font-bold text-emerald-950">
                  {paymentReceipt.metodoPago === "liquidacion_pdf"
                    ? "¡Cupón de Pago Generado Exitosamente!"
                    : "¡Transacción de Pago Aprobada!"}
                </h3>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {paymentReceipt.mensaje}
                </p>
              </div>

              {/* Recibo Detallado */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Referencia de Pago Oficial:</span>
                  <span className="font-mono font-bold text-[#173f6b]">{paymentReceipt.referenciaPago}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">ID Transacción SIMIT:</span>
                  <span className="font-mono text-slate-800">{paymentReceipt.idTransaccion}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Titular del Pago:</span>
                  <span className="font-semibold text-slate-800">{paymentReceipt.detallesTransaccion?.titular}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Documento:</span>
                  <span className="font-mono text-slate-800">{paymentReceipt.detallesTransaccion?.documento}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Método de Pago:</span>
                  <span className="font-bold uppercase text-[#173f6b]">{paymentReceipt.metodoPago}</span>
                </div>
                {paymentReceipt.detallesTransaccion?.banco && (
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500">Entidad Financiera:</span>
                    <span className="font-semibold text-slate-800">{paymentReceipt.detallesTransaccion.banco}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 text-sm font-bold text-[#102238]">
                  <span>Total Pagado / Liquidado:</span>
                  <span className="text-base text-emerald-800">{formatCurrency(paymentReceipt.totalPagar)}</span>
                </div>
              </div>

              {/* Código de barras simulado para liquidación */}
              {paymentReceipt.codigoBarras && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-center space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Código de Barras de Recaudo Oficial
                  </p>
                  <div className="h-10 mx-auto w-full max-w-sm flex items-center justify-center bg-slate-100 rounded font-mono text-[10px] text-slate-600 overflow-hidden px-2 tracking-widest">
                    ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
                  </div>
                  <p className="font-mono text-[10px] text-slate-500">{paymentReceipt.codigoBarras}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs gap-1.5"
                >
                  <Printer className="size-3.5" /> Imprimir Comprobante
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  size="sm"
                  className="flex-1 bg-[#173f6b] text-white hover:bg-[#102f51] text-xs font-bold"
                >
                  Finalizar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Resumen de multas a pagar */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-2 border border-slate-200">
                <div className="flex justify-between font-bold text-[#102238] border-b border-slate-200 pb-1.5">
                  <span>Obligaciones seleccionadas:</span>
                  <span>
                    {(simitQueryResult?.multas || []).filter((m) => selectedFineIds.includes(m.id)).length} multa(s)
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {(simitQueryResult?.multas || [])
                    .filter((m) => selectedFineIds.includes(m.id))
                    .map((m) => (
                      <div key={m.id} className="flex justify-between text-slate-600 text-[11px]">
                        <span className="truncate pr-2">
                          {m.numeroResolucion ? `Res. ${m.numeroResolucion}` : m.numeroComparendo} · {m.codigoInfraccion} ({m.placa})
                        </span>
                        <span className="font-semibold shrink-0">{formatCurrency(m.valorPagar)}</span>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#173f6b] border-t border-slate-200 pt-1.5">
                  <span>Total a pagar:</span>
                  <span>
                    {formatCurrency(
                      (simitQueryResult?.multas || [])
                        .filter((m) => selectedFineIds.includes(m.id))
                        .reduce((sum, item) => sum + item.valorPagar, 0),
                    )}
                  </span>
                </div>
              </div>

              {/* Selector de pasarelas */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Selecciona la Pasarela de Pago SIMIT:</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway("pse")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition gap-1.5 ${
                      selectedGateway === "pse"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="size-5 text-emerald-700" />
                    <span>PSE</span>
                    <span className="text-[10px] font-normal text-slate-500">Débito cuenta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGateway("tarjeta")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition gap-1.5 ${
                      selectedGateway === "tarjeta"
                        ? "border-[#173f6b] bg-slate-50 text-[#173f6b] shadow-xs ring-1 ring-[#173f6b]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="size-5 text-[#173f6b]" />
                    <span>Tarjeta</span>
                    <span className="text-[10px] font-normal text-slate-500">Crédito / Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGateway("daviplata")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition gap-1.5 ${
                      selectedGateway === "daviplata"
                        ? "border-rose-600 bg-rose-50 text-rose-900 shadow-xs ring-1 ring-rose-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="size-5 text-rose-700" />
                    <span>Daviplata</span>
                    <span className="text-[10px] font-normal text-slate-500">Billetera móvil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGateway("liquidacion_pdf")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition gap-1.5 ${
                      selectedGateway === "liquidacion_pdf"
                        ? "border-amber-600 bg-amber-50 text-amber-900 shadow-xs ring-1 ring-amber-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <FileText className="size-5 text-amber-700" />
                    <span>Cupón Banco</span>
                    <span className="text-[10px] font-normal text-slate-500">Código de barras</span>
                  </button>
                </div>
              </div>

              {/* Formulario de Pagador */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-white">
                <h4 className="text-xs font-bold text-[#102238] border-b border-slate-100 pb-1">
                  Datos del Pagador / Contribuyente
                </h4>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="payer-name" className="text-xs">
                      Nombre completo o Razón Social
                    </Label>
                    <Input
                      id="payer-name"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="Nombre del titular"
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="payer-doc" className="text-xs">
                      Número de Documento / NIT
                    </Label>
                    <Input
                      id="payer-doc"
                      value={payerDoc}
                      onChange={(e) => setPayerDoc(e.target.value)}
                      placeholder="Número de identificación"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="payer-email" className="text-xs">
                      Correo para envío de Comprobante
                    </Label>
                    <Input
                      id="payer-email"
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="payer-phone" className="text-xs">
                      Teléfono Celular
                    </Label>
                    <Input
                      id="payer-phone"
                      type="tel"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="3001234567"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* Campos específicos por pasarela */}
                {selectedGateway === "pse" && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="pse-bank" className="text-xs">
                          Selecciona tu Banco / Billetera PSE
                        </Label>
                        <select
                          id="pse-bank"
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#173f6b]"
                        >
                          {COLOMBIAN_BANKS.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="pse-person" className="text-xs">
                          Tipo de Persona
                        </Label>
                        <select
                          id="pse-person"
                          value={personType}
                          onChange={(e) => setPersonType(e.target.value as "natural" | "juridica")}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#173f6b]"
                        >
                          <option value="natural">Persona Natural</option>
                          <option value="juridica">Persona Jurídica (Empresa)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {selectedGateway === "tarjeta" && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <Label htmlFor="card-num" className="text-xs">
                        Número de Tarjeta
                      </Label>
                      <Input
                        id="card-num"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4500 0000 0000 0000"
                        maxLength={19}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="card-exp" className="text-xs">
                          Vence (MM/AA)
                        </Label>
                        <Input
                          id="card-exp"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value)}
                          placeholder="12/28"
                          maxLength={5}
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="card-cvv" className="text-xs">
                          CVV
                        </Label>
                        <Input
                          id="card-cvv"
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          maxLength={4}
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="card-inst" className="text-xs">
                          Cuotas
                        </Label>
                        <select
                          id="card-inst"
                          value={cardInstallments}
                          onChange={(e) => setCardInstallments(Number(e.target.value))}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 shadow-xs"
                        >
                          {[1, 2, 3, 6, 12, 24, 36].map((c) => (
                            <option key={c} value={c}>
                              {c} cuota{c > 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {selectedGateway === "daviplata" && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <Label htmlFor="davi-phone" className="text-xs">
                        Número de Celular Daviplata
                      </Label>
                      <Input
                        id="davi-phone"
                        type="tel"
                        value={daviplataPhone}
                        onChange={(e) => setDaviplataPhone(e.target.value)}
                        placeholder="3001234567"
                        maxLength={10}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                )}
              </div>

              {paymentError && (
                <p
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200"
                >
                  <AlertCircle className="size-4 shrink-0" /> {paymentError}
                </p>
              )}

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isProcessingPayment}
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isProcessingPayment}
                  onClick={handleExecutePayment}
                  className="bg-emerald-700 text-white hover:bg-emerald-800 font-bold text-xs gap-1.5"
                >
                  {isProcessingPayment ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  {isProcessingPayment
                    ? "Conectando con Pasarela SIMIT..."
                    : selectedGateway === "liquidacion_pdf"
                      ? "Generar Cupón Oficial"
                      : `Confirmar Pago en ${selectedGateway.toUpperCase()}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppScreen>
  );
}

function FineCardItem({
  fine,
  onTogglePaid,
  onToggleNotify,
  onDelete,
  onRequestEmailAlert,
  onPayOnline,
}: {
  fine: StoredFine;
  onTogglePaid: () => void;
  onToggleNotify: () => void;
  onDelete: () => void;
  onRequestEmailAlert: () => void;
  onPayOnline: () => void;
}) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isAgreement = fine.kind === "acuerdo_pago";

  if (isAgreement) {
    const due = fine.dueDate ? parseLocalDate(fine.dueDate) : null;
    const status = due ? buildAgreementStatus(due, new Date(), fine.amount) : null;

    return (
      <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                Acuerdo de Pago {fine.installmentNumber && fine.totalInstallments ? `(Cuota ${fine.installmentNumber}/${fine.totalInstallments})` : ""}
              </span>
              {fine.subject && <span className="text-xs font-mono text-slate-500 font-bold">{fine.subject}</span>}
            </div>

            {/* Título recortado en preview + botón interactivo para ver más detalle */}
            <button
              type="button"
              onClick={() => setIsDetailOpen((prev) => !prev)}
              className="text-left w-full group/title cursor-pointer mt-1 block"
            >
              <h3 className={`font-display text-xs font-bold text-slate-900 group-hover/title:text-indigo-900 transition-colors ${isDetailOpen ? "" : "line-clamp-1"}`}>
                {fine.reason || `Convenio N.° ${fine.reference}`}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                <span className="text-slate-700 group-hover/title:underline">
                  {isDetailOpen ? "Ocultar detalle" : "Ver más detalle"}
                </span>
                <ChevronDown className={`size-3 text-slate-500 transition-transform duration-200 ${isDetailOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* Fecha del comparendo / acuerdo */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                <Calendar className="size-3 text-indigo-600" />
                Fecha vencimiento: <strong>{due ? formatLongDate(due) : (fine.dueDate || "N/D")}</strong>
              </span>
              <span className="font-mono font-semibold text-slate-700">N.º {fine.reference}</span>
              {fine.city && <span>· {fine.city}</span>}
            </div>
          </div>

          {/* Monto de la Multa / Cuota y Estado */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Cuota</p>
            <p className="text-sm font-extrabold text-indigo-900">
              {formatCurrency(fine.amount || 0)}
            </p>
            <div className="mt-1">
              {fine.paid ? (
                <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                  Pagada
                </span>
              ) : status ? (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    status.status === "vencido"
                      ? "bg-slate-100 text-slate-600"
                      : status.daysLeft <= ALERT_WINDOW_DAYS
                        ? "bg-rose-50 text-rose-700 font-bold"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {status.status === "vencido"
                    ? "Cuota vencida"
                    : status.daysLeft === 0
                      ? "Vence HOY"
                      : `${status.daysLeft}d restantes`}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Detalle Expandido */}
        {isDetailOpen && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 space-y-1.5 border border-slate-200/80">
            <p className="text-slate-700 font-medium">
              Descripción completa: <strong>{fine.reason || `Acuerdo de pago N.° ${fine.reference}`}</strong>
            </p>
            {due && (
              <div className="flex justify-between text-slate-600">
                <span>Fecha límite exigible:</span>
                <span className="font-semibold text-slate-800">{formatLongDate(due)}</span>
              </div>
            )}
            {fine.city && (
              <p className="text-slate-500 text-[11px]">
                Organismo de Tránsito: {fine.city}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {!fine.paid && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={onPayOnline}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1.5"
              >
                <CreditCard className="size-3.5" /> Pagar Cuota en Línea (PSE)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onRequestEmailAlert} className="text-xs">
                <Mail className="size-3.5 text-amber-700" /> Alarma por correo
              </Button>
            </>
          )}

          <Button type="button" size="sm" variant="ghost" onClick={onTogglePaid} className="text-xs">
            {fine.paid ? "Marcar como pendiente" : "Marcar como pagada"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="text-xs text-slate-400 hover:text-rose-700 ml-auto">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </li>
    );
  }

  // Tarjeta de comparendo tradicional
  const imposed = parseLocalDate(fine.impositionDate);
  const deadlines = imposed ? buildFineDeadlines(imposed, new Date(), fine.amount) : [];
  const best = bestAvailableDiscount(deadlines);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Comparendo
            </span>
            {fine.subject && <span className="text-xs font-mono font-bold text-slate-600">{fine.subject}</span>}
          </div>

          {/* Título recortado en preview + botón interactivo para ver más detalle */}
          <button
            type="button"
            onClick={() => setIsDetailOpen((prev) => !prev)}
            className="text-left w-full group/title cursor-pointer mt-1 block"
          >
            <h3 className={`font-display text-xs font-bold text-slate-900 group-hover/title:text-blue-900 transition-colors ${isDetailOpen ? "" : "line-clamp-1"}`}>
              {fine.reason || "Comparendo de tránsito"}
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
              <span className="text-slate-700 group-hover/title:underline">
                {isDetailOpen ? "Ocultar detalle" : "Ver más detalle"}
              </span>
              <ChevronDown className={`size-3 text-slate-500 transition-transform duration-200 ${isDetailOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Fecha del comparendo */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <Calendar className="size-3 text-slate-500" />
              Fecha comparendo: <strong>{imposed ? formatLongDate(imposed) : (fine.impositionDate || "N/D")}</strong>
            </span>
            <span className="font-mono font-semibold text-slate-700">N.º {fine.reference}</span>
            {fine.city && <span>· {fine.city}</span>}
          </div>
        </div>

        {/* Monto de la Multa y Estado */}
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Monto</p>
          <p className="text-sm font-extrabold text-slate-900">
            {formatCurrency(fine.amount || 0)}
          </p>
          <div className="mt-1">
            {fine.paid ? (
              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                Pagado
              </span>
            ) : best ? (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  best.daysLeft <= ALERT_WINDOW_DAYS ? "bg-rose-50 text-rose-700 font-bold" : "bg-amber-50 text-amber-700"
                }`}
              >
                {best.daysLeft === 0 ? "Vence hoy" : `${best.daysLeft}d desc.`}
              </span>
            ) : (
              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                Sin descuento
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detalle Expandido (Plazos de descuento, información oficial) */}
      {isDetailOpen && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs border border-slate-200/80">
          <p className="text-slate-700 font-medium leading-relaxed">
            Infracción registrada: <strong>{fine.reason || "Comparendo de tránsito oficial"}</strong>
          </p>
          {fine.city && (
            <p className="text-[11px] text-slate-500">
              Organismo de tránsito competente: <strong>{fine.city}</strong>
            </p>
          )}

          {!fine.paid && (
            <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
              {deadlines.map((deadline) => (
                <DiscountRow key={deadline.id} deadline={deadline} />
              ))}
              {!best && (
                <p className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] leading-5 text-slate-600">
                  Los términos de descuento del 50% y 25% ya expiraron. Puedes pagar la totalidad liquidada en línea con PSE o Tarjeta.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        {!fine.paid && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={onPayOnline}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1.5"
            >
              <CreditCard className="size-3.5" /> Pagar en Línea (PSE / Tarjeta)
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onRequestEmailAlert} className="text-xs">
              <Mail className="size-3.5 text-amber-700" /> Alarma por correo
            </Button>
          </>
        )}

        <Button type="button" size="sm" variant="ghost" onClick={onTogglePaid} className="text-xs">
          {fine.paid ? "Marcar como pendiente" : "Marcar como pagado"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="text-xs text-slate-400 hover:text-rose-700 ml-auto">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

function DiscountRow({ deadline }: { deadline: FineDeadline }) {
  const vencido = deadline.status === "vencido";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${
        vencido ? "bg-slate-50 text-slate-400" : "bg-emerald-50/60 text-slate-700"
      }`}
    >
      {vencido ? (
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
      ) : (
        <BadgePercent className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
      )}
      <div className="min-w-0 text-xs leading-5">
        <p className={vencido ? "" : "font-semibold"}>
          {deadline.percentage}% de descuento
          {deadline.amount !== null && !vencido && <> · {formatCurrency(deadline.amount)}</>}
        </p>
        <p className="text-[11px]">
          {vencido ? "Venció el" : "Hasta el"} {formatLongDate(deadline.deadline)} ({deadline.businessDays} días hábiles).
          {!vencido && " " + deadline.requirement}
        </p>
      </div>
    </div>
  );
}
