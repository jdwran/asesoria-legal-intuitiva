"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BellRing,
  Car,
  CheckCircle2,
  ClipboardList,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";

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
  getEmptyUser,
  getUserSnapshot,
  saveUserProfile,
  subscribeStorage,
  type UserProfile,
} from "@/lib/device-storage";

export type AppDestination = "orientacion" | "seguimiento" | "comparendos";

export function AppHome({
  onNavigate,
  onDemo,
  caseCount,
  fineAlerts,
}: {
  onNavigate: (destination: AppDestination) => void;
  onDemo: () => void;
  caseCount: number;
  fineAlerts: number;
}) {
  const user = useSyncExternalStore(subscribeStorage, getUserSnapshot, getEmptyUser);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(user);
  const [savedNotice, setSavedNotice] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");

  function openProfileModal() {
    setProfileDraft(user);
    setSavedNotice(false);
    setProfileOpen(true);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    saveUserProfile({
      ...profileDraft,
      name: profileDraft.name.trim(),
      email: profileDraft.email.trim(),
      documentNumber: profileDraft.documentNumber.trim(),
      plate: profileDraft.plate.trim().toUpperCase(),
      city: profileDraft.city?.trim() || "",
      phone: profileDraft.phone?.trim() || "",
    });
    setSavedNotice(true);
    setTimeout(() => {
      setProfileOpen(false);
      setSavedNotice(false);
    }, 800);
  }

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = quickQuery.trim();
    if (!clean) return;

    // Si parece una placa (6 caracteres alfa-numéricos), ir a comparendos
    const isPlate = /^[A-Za-z]{3}[0-9]{2}[0-9A-Za-z]?$/.test(clean.replace(/\s+/g, ""));
    if (isPlate) {
      onNavigate("comparendos");
    } else {
      onNavigate("orientacion");
    }
  }

  const hasUserProfile = Boolean(user.name || user.email || user.plate);

  const TOPIC_CHIPS = [
    { label: "🏠 Arriendo y desalojo", dest: "orientacion" as AppDestination },
    { label: "🚗 Multas SIMIT", dest: "comparendos" as AppDestination },
    { label: "🏥 Negación EPS", dest: "orientacion" as AppDestination },
    { label: "💼 Despido laboral", dest: "orientacion" as AppDestination },
    { label: "👶 Cuota alimentaria", dest: "orientacion" as AppDestination },
    { label: "💳 Estafas y fraudes", dest: "orientacion" as AppDestination },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f8fafc] text-slate-900 selection:bg-sky-100 selection:text-sky-900">
      {/* Cabecera superior moderna con avatar/perfil */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3.5 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Scale className="size-4.5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-tight text-slate-900">Orientador Legal</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Colombia</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openProfileModal}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            {hasUserProfile ? (
              <>
                <UserCheck className="size-3.5 text-emerald-600" />
                <span className="max-w-28 truncate sm:max-w-40 font-medium">
                  {user.name || user.plate || user.email}
                </span>
              </>
            ) : (
              <>
                <User className="size-3.5 text-slate-500" />
                <span>Mi perfil</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Cuerpo principal */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] space-y-6">
        {/* Hero minimalista con barra de consulta directa */}
        <section className="space-y-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            ¿En qué podemos ayudarte?
          </h1>
          <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
            Asesoría jurídica con normas colombianas, consulta de multas SIMIT y minutas oficiales sin intermediarios.
          </p>

          {/* Barra de consulta estilo Asistente / Copilot */}
          <form onSubmit={handleQuickSubmit} className="relative mt-2">
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Describe tu caso o escribe una placa (ej. ABC123)..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-xs font-medium text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-3 focus:ring-slate-100"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-xl bg-slate-900 text-white shadow-xs transition hover:bg-slate-800 active:scale-90"
              aria-label="Iniciar consulta"
            >
              <ArrowRight className="size-4" />
            </button>
          </form>

          {/* Chips horizontales de temas frecuentes */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TOPIC_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => onNavigate(chip.dest)}
                className="rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 active:scale-95 shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tarjetas Principales Modernas (Grid 2 Columnas) */}
        <section className="grid gap-3.5 sm:grid-cols-2">
          {/* TARJETA 1: ASESORÍA Y MINUTAS */}
          <button
            type="button"
            onClick={() => onNavigate("orientacion")}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                  <Scale className="size-5.5" />
                </div>
                <span className="pill-badge bg-sky-50 text-sky-700 border border-sky-200/60">
                  <Sparkles className="size-3" /> IA Legal
                </span>
              </div>
              <h2 className="font-display mt-3.5 text-base font-bold text-slate-900 group-hover:text-sky-950">
                Asesoría y Orientación Legal
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Cuéntanos tu situación. Evaluamos tu caso con normas vigentes y redactamos tu derecho de petición o tutela.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-sky-700">
              <span>Iniciar asesoría</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* TARJETA 2: MULTAS Y SIMIT */}
          <button
            type="button"
            onClick={() => onNavigate("comparendos")}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                  <Car className="size-5.5" />
                </div>
                {fineAlerts > 0 ? (
                  <span className="pill-badge bg-rose-50 text-rose-800 border border-rose-200">
                    <BellRing className="size-3 animate-pulse" /> {fineAlerts} por vencer
                  </span>
                ) : (
                  <span className="pill-badge bg-slate-100 text-slate-800 border border-slate-200">
                    SIMIT Oficial
                  </span>
                )}
              </div>
              <h2 className="font-display mt-3.5 text-base font-bold text-slate-900 group-hover:text-amber-950">
                Consulta de Multas y Pago PSE
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Consulta por placa o cédula en tiempo real, revisa descuentos del 50% y realiza pagos en línea seguros.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-amber-800">
              <span>Consultar y pagar multas</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </section>

        {/* Acceso a Seguimiento de Casos Guardados */}
        {caseCount > 0 && (
          <section>
            <button
              type="button"
              onClick={() => onNavigate("seguimiento")}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-2xs transition hover:border-slate-300 hover:shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <ClipboardList className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">Tus expedientes guardados</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {caseCount} caso{caseCount === 1 ? "" : "s"} guardado{caseCount === 1 ? "" : "s"} en este equipo
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-slate-400" />
            </button>
          </section>
        )}

        {/* Pie minimalista */}
        <footer className="pt-2 text-center text-[11px] text-slate-400 space-y-1.5">
          <p>Orientación ciudadana informativa · Privacidad 100% en tu dispositivo</p>
          <button
            type="button"
            onClick={onDemo}
            className="font-semibold text-slate-600 hover:text-slate-900 hover:underline"
          >
            Ver expediente de demostración
          </button>
        </footer>
      </main>

      {/* DIÁLOGO / MODAL DE PERFIL DE USUARIO */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <DialogHeader>
              <div className="mb-1 grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-800">
                <User className="size-4.5" />
              </div>
              <DialogTitle className="font-display text-base font-bold text-slate-900">
                Mis Datos de Contacto
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Guarda tus datos para autocompletar trámites y recibir recordatorios por correo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Label htmlFor="user-name" className="text-xs">Nombre completo</Label>
                <Input
                  id="user-name"
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  maxLength={80}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="user-email" className="text-xs flex items-center gap-1.5">
                  <Mail className="size-3 text-slate-400" /> Correo para alarmas
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  value={profileDraft.email}
                  onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  maxLength={100}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-2">
                <div className="space-y-1">
                  <Label htmlFor="user-doc-type" className="text-xs">Tipo</Label>
                  <select
                    id="user-doc-type"
                    value={profileDraft.documentType}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        documentType: e.target.value as UserProfile["documentType"],
                      })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-white px-2.5 py-1 text-xs font-medium shadow-xs"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">PAS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="user-doc-num" className="text-xs">Número de documento</Label>
                  <Input
                    id="user-doc-num"
                    inputMode="numeric"
                    value={profileDraft.documentNumber}
                    onChange={(e) => setProfileDraft({ ...profileDraft, documentNumber: e.target.value })}
                    placeholder="1065631508"
                    maxLength={16}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="user-plate" className="text-xs">Placa vinculada</Label>
                  <Input
                    id="user-plate"
                    value={profileDraft.plate}
                    onChange={(e) => setProfileDraft({ ...profileDraft, plate: e.target.value.toUpperCase() })}
                    placeholder="LWH63D"
                    maxLength={10}
                    className="uppercase text-xs h-9 font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="user-city" className="text-xs">Ciudad / Municipio</Label>
                  <Input
                    id="user-city"
                    value={profileDraft.city || ""}
                    onChange={(e) => setProfileDraft({ ...profileDraft, city: e.target.value })}
                    placeholder="Valledupar"
                    maxLength={50}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <input
                  type="checkbox"
                  checked={profileDraft.emailAlertsEnabled}
                  onChange={(e) => setProfileDraft({ ...profileDraft, emailAlertsEnabled: e.target.checked })}
                  className="mt-0.5 size-3.5 accent-slate-900"
                />
                <span className="text-[11px] leading-4 text-slate-600">
                  Recibir alertas por correo cuando un comparendo o cuota esté por vencer.
                </span>
              </label>

              {savedNotice && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200" role="status">
                  <CheckCircle2 className="size-3.5" /> Datos guardados correctamente.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setProfileOpen(false)} className="text-xs">
                Cerrar
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold">
                Guardar datos
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

