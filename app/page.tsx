"use client";

import { useState, useSyncExternalStore } from "react";

import { AppHome, type AppDestination } from "@/components/app-home";
import { CaseTracking } from "@/components/case-tracking";
import { demoCase, EmptyState, type EmptyStateCasePayload } from "@/components/empty-state";
import { countFinesNeedingAttention, FinesTracker } from "@/components/fines-tracker";
import { LegalWorkspace } from "@/components/legal-workspace";
import {
  getCasesSnapshot,
  getEmptyCases,
  getEmptyFines,
  getFinesSnapshot,
  saveCase,
  subscribeStorage,
} from "@/lib/device-storage";

type Screen = "inicio" | AppDestination;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("inicio");
  const [activeCase, setActiveCase] = useState<EmptyStateCasePayload | null>(null);
  // Los contadores del inicio salen del mismo store que las pantallas: guardar o
  // borrar en cualquiera de ellas los actualiza sin pasarse callbacks entre sí.
  const cases = useSyncExternalStore(subscribeStorage, getCasesSnapshot, getEmptyCases);
  const fines = useSyncExternalStore(subscribeStorage, getFinesSnapshot, getEmptyFines);

  function startCase(payload: EmptyStateCasePayload) {
    // Se guarda aquí, y no al abrir un caso del seguimiento, para no duplicarlo
    // cada vez que se reabre.
    saveCase(payload);
    setActiveCase(payload);
  }

  function backToHome() {
    setActiveCase(null);
    setScreen("inicio");
  }

  if (activeCase) {
    return <LegalWorkspace initialCase={activeCase} onExit={backToHome} />;
  }

  if (screen === "orientacion") {
    return <EmptyState onCaseReady={startCase} onBack={backToHome} />;
  }

  if (screen === "seguimiento") {
    return <CaseTracking onBack={backToHome} onOpenCase={setActiveCase} />;
  }

  if (screen === "comparendos") {
    return <FinesTracker onBack={backToHome} />;
  }

  return (
    <AppHome
      onNavigate={setScreen}
      onDemo={() => setActiveCase(demoCase)}
      caseCount={cases.length}
      fineAlerts={countFinesNeedingAttention(fines)}
    />
  );
}
