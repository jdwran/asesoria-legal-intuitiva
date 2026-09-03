"use client";

import type { EmptyStateCasePayload } from "@/components/empty-state";

/**
 * Persistencia local, solo en el dispositivo. No hay servidor de cuentas ni
 * sincronización: si la persona borra los datos del navegador, esto se va con
 * ellos. Por eso las pantallas que lo usan lo dicen en voz alta y ofrecen
 * borrar; un expediente legal guardado a escondidas sería peor que no guardarlo.
 *
 * Se expone como store externo (`subscribe` + snapshots) para consumirlo con
 * `useSyncExternalStore`: así las pantallas no copian el estado en `useState`
 * dentro de un efecto, el contador del inicio se actualiza solo, y el render
 * del servidor parte de listas vacías sin romper la hidratación.
 */

const CASES_KEY = "orientador:casos:v1";
const FINES_KEY = "orientador:comparendos:v1";
const USER_KEY = "orientador:usuario:v1";

export interface UserProfile {
  name: string;
  email: string;
  documentType: "CC" | "CE" | "TI" | "NIT" | "PASAPORTE";
  documentNumber: string;
  plate: string;
  phone?: string;
  city?: string;
  emailAlertsEnabled: boolean;
}

export interface StoredCase {
  id: string;
  createdAt: string;
  title: string;
  city: string;
  category: string;
  urgency: string;
  nextStep: string;
  payload: EmptyStateCasePayload;
}

export type FineKind = "comparendo" | "acuerdo_pago";

export interface StoredFine {
  id: string;
  createdAt: string;
  /** Tipo de obligación: comparendo o cuota de acuerdo de pago */
  kind?: FineKind;
  /** Número del comparendo o número del acuerdo de pago */
  reference: string;
  /** Fecha de imposición o inicio en formato YYYY-MM-DD. */
  impositionDate: string;
  /** Fecha límite o de vencimiento (para acuerdos de pago o fecha fijada) */
  dueDate?: string;
  /** Número de cuota actual y total de cuotas en acuerdo de pago */
  installmentNumber?: number;
  totalInstallments?: number;
  amount: number | null;
  city: string;
  reason: string;
  paid: boolean;
  /** Placa o documento con el que se consultó, si la persona lo registró. */
  subject: string;
  /** Los avisos son decisión de la persona, comparendo por comparendo. */
  notify: boolean;
  /** Días de anticipación para la alarma/correo */
  alarmDaysBefore?: number;
  /** Fecha del último correo enviado */
  lastEmailSentAt?: string;
}

const EMPTY_CASES: StoredCase[] = [];
const EMPTY_FINES: StoredFine[] = [];
export const EMPTY_USER_PROFILE: UserProfile = {
  name: "",
  email: "",
  documentType: "CC",
  documentNumber: "",
  plate: "",
  phone: "",
  city: "",
  emailAlertsEnabled: true,
};

const listeners = new Set<() => void>();
let casesCache: StoredCase[] = EMPTY_CASES;
let finesCache: StoredFine[] = EMPTY_FINES;
let userCache: UserProfile = EMPTY_USER_PROFILE;
let hydrated = false;

function read<T>(key: string, defaultValue: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    // Almacenamiento lleno, bloqueado o con datos corruptos: preferimos el
    // valor por defecto antes que romper la pantalla.
    return defaultValue;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin espacio o en modo privado: la sesión sigue funcionando en memoria.
  }
}

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  casesCache = read<StoredCase[]>(CASES_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  finesCache = read<StoredFine[]>(FINES_KEY, []).sort((a, b) => b.impositionDate.localeCompare(a.impositionDate));
  userCache = read<UserProfile>(USER_KEY, EMPTY_USER_PROFILE);
  hydrated = true;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCasesSnapshot(): StoredCase[] {
  ensureHydrated();
  return casesCache;
}

export function getFinesSnapshot(): StoredFine[] {
  ensureHydrated();
  return finesCache;
}

export function getUserSnapshot(): UserProfile {
  ensureHydrated();
  return userCache;
}

/** El servidor no tiene almacenamiento: siempre la misma lista o perfil vacío. */
export function getEmptyCases(): StoredCase[] {
  return EMPTY_CASES;
}

export function getEmptyFines(): StoredFine[] {
  return EMPTY_FINES;
}

export function getEmptyUser(): UserProfile {
  return EMPTY_USER_PROFILE;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveUserProfile(profile: UserProfile): void {
  ensureHydrated();
  userCache = { ...profile };
  write(USER_KEY, userCache);
  emit();
}

export function clearUserProfile(): void {
  ensureHydrated();
  userCache = { ...EMPTY_USER_PROFILE };
  write(USER_KEY, userCache);
  emit();
}

export function saveCase(payload: EmptyStateCasePayload, existingId?: string): string {
  ensureHydrated();
  const id = existingId || payload.id || newId();
  const payloadWithId: EmptyStateCasePayload = { ...payload, id };
  const record: StoredCase = {
    id,
    createdAt: new Date().toISOString(),
    title: payload.orientation.caseTitle,
    city: payload.city,
    category: payload.orientation.category,
    urgency: payload.orientation.urgency,
    nextStep: payload.orientation.nextSteps[0]?.title ?? "",
    payload: payloadWithId,
  };
  casesCache = [record, ...casesCache.filter((item) => item.id !== id)];
  write(CASES_KEY, casesCache);
  emit();
  return id;
}

export function updateCase(id: string, patch: Partial<EmptyStateCasePayload>): void {
  ensureHydrated();
  casesCache = casesCache.map((item) => {
    if (item.id === id) {
      const mergedPayload: EmptyStateCasePayload = {
        ...item.payload,
        ...patch,
        id,
      };
      return {
        ...item,
        title: mergedPayload.orientation.caseTitle,
        city: mergedPayload.city,
        category: mergedPayload.orientation.category,
        urgency: mergedPayload.orientation.urgency,
        nextStep: mergedPayload.orientation.nextSteps[0]?.title ?? item.nextStep,
        payload: mergedPayload,
      };
    }
    return item;
  });
  write(CASES_KEY, casesCache);
  emit();
}

export function deleteCase(id: string): void {
  ensureHydrated();
  casesCache = casesCache.filter((item) => item.id !== id);
  write(CASES_KEY, casesCache);
  emit();
}

export function saveFine(fine: Omit<StoredFine, "id" | "createdAt">): void {
  ensureHydrated();
  const record: StoredFine = {
    ...fine,
    kind: fine.kind || "comparendo",
    alarmDaysBefore: fine.alarmDaysBefore ?? 3,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  finesCache = [record, ...finesCache].sort((a, b) => b.impositionDate.localeCompare(a.impositionDate));
  write(FINES_KEY, finesCache);
  emit();
}

export function updateFine(id: string, patch: Partial<StoredFine>): void {
  ensureHydrated();
  finesCache = finesCache.map((item) => (item.id === id ? { ...item, ...patch } : item));
  write(FINES_KEY, finesCache);
  emit();
}

export function deleteFine(id: string): void {
  ensureHydrated();
  finesCache = finesCache.filter((item) => item.id !== id);
  write(FINES_KEY, finesCache);
  emit();
}
