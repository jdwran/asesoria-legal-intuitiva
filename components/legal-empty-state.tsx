"use client";

import { type ReactNode, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  LoaderCircle,
  Send,
  ShieldCheck,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EXTERNAL_PROCESSING_COPY,
  ORIENTATION_FORM_ERRORS,
  ORIENTATION_FORM_LIMITS,
  PROCESSING_CONSENT_COPY,
  isOrientationFormReady,
} from "@/lib/orientation-form";
import {
  featuredStoryTemplates,
  getStoryTemplate,
  storyTemplates,
  type StoryTemplate,
} from "@/lib/story-templates";

const moreStoryTemplates = storyTemplates.filter((template) => !template.featured);

const categoryLabels = {
  arrendamiento: "Vivienda",
  laboral: "Trabajo",
  salud: "Salud",
  familia: "Familia",
  penal: "Seguridad",
  administrativo: "Entidades públicas",
  otro: "Judicial",
} as const;

type LegalEmptyStateProps = {
  accountIndicator?: ReactNode;
  story: string;
  city: string;
  processingConsent: boolean;
  isAnalyzing: boolean;
  formError: string;
  onStoryChange: (story: string) => void;
  onCityChange: (city: string) => void;
  onConsentChange: (processingConsent: boolean) => void;
  onSubmit: () => void | Promise<void>;
};

export function LegalEmptyState({
  accountIndicator,
  story,
  city,
  processingConsent,
  isAnalyzing,
  formError,
  onStoryChange,
  onCityChange,
  onConsentChange,
  onSubmit,
}: LegalEmptyStateProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [storyTouched, setStoryTouched] = useState(false);
  const [cityTouched, setCityTouched] = useState(false);
  const [consentTouched, setConsentTouched] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState("");

  const storyIsValid = story.trim().length >= ORIENTATION_FORM_LIMITS.storyMin;
  const cityIsValid = city.trim().length >= ORIENTATION_FORM_LIMITS.cityMin;
  const canSubmit = isOrientationFormReady({ story, city, processingConsent });
  const showStoryError = storyTouched && !storyIsValid;
  const showCityError = cityTouched && !cityIsValid;
  const showConsentError = consentTouched && !processingConsent;
  const showCityGuidance = storyIsValid && !cityIsValid && !cityTouched;
  const showConsentGuidance = storyIsValid && cityIsValid && !processingConsent && !consentTouched;
  const appliedTemplate = appliedTemplateId ? getStoryTemplate(appliedTemplateId) : undefined;
  const templateDraftIsValid =
    templateDraft.trim().length >= ORIENTATION_FORM_LIMITS.storyMin &&
    templateDraft.length <= ORIENTATION_FORM_LIMITS.storyMax;

  function openTemplateEditor(template: StoryTemplate, initialDraft = template.story) {
    setSelectedTemplate(template);
    setTemplateDraft(initialDraft);
    setTemplateOpen(true);
  }

  function applyTemplate() {
    if (!selectedTemplate || !templateDraftIsValid) return;
    const nextStory = templateDraft.trim();
    onStoryChange(nextStory);
    setAppliedTemplateId(selectedTemplate.id);
    setStoryTouched(true);
    setTemplateOpen(false);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const firstPlaceholder = nextStory.match(/\[[^\]]+\]/);
      if (firstPlaceholder?.index !== undefined) {
        textarea.setSelectionRange(
          firstPlaceholder.index,
          firstPlaceholder.index + firstPlaceholder[0].length,
        );
      } else {
        textarea.setSelectionRange(nextStory.length, nextStory.length);
      }
    });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f4f3ee] text-[#102238]">
      <header className="shrink-0 border-b border-slate-200/80 bg-[#fbfaf7] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ShieldCheck className="size-8 shrink-0 text-emerald-600" strokeWidth={2} />
            <div className="min-w-0">
              <h1 className="font-serif text-xl font-bold tracking-tight text-[#102238] sm:text-2xl">
                Orientador Legal
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Asesoría gratuita, rápida y en palabras sencillas.
              </p>
            </div>
          </div>
          {accountIndicator}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <section
          aria-label="Ejemplos de relato"
          className="flex flex-1 items-start overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 sm:[align-items:safe_center]"
        >
          <div className="mx-auto w-full max-w-3xl">
            {isAnalyzing && (
              <div
                role="status"
                aria-live="polite"
                className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-[#102238] shadow-sm"
              >
                <LoaderCircle className="size-5 animate-spin text-emerald-600" />
                Organizando tu relato…
              </div>
            )}

            <div className="mb-5 text-center sm:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Ejemplos de relato</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[#102238] sm:text-3xl">
                Empieza tu relato con un ejemplo
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Elige un caso parecido, ajusta lo que está entre corchetes y borra lo que no aplique.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {featuredStoryTemplates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  disabled={isAnalyzing}
                  onClick={() => openTemplateEditor(template)}
                  title={template.description}
                  className="h-auto min-h-11 whitespace-normal rounded-full border-[#173f6b]/20 bg-[#fbfaf7] px-4 py-2.5 text-left text-[#102238] shadow-sm hover:border-[#173f6b]/40 hover:bg-white"
                >
                  <FileText className="size-4 shrink-0 text-emerald-700" />
                  {template.label}
                </Button>
              ))}
            </div>

            <div className="mt-2 flex justify-center sm:justify-start">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isAnalyzing}
                      className="h-10 px-3 text-[#173f6b]"
                    />
                  }
                >
                  Ver {moreStoryTemplates.length} ejemplos más
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-[min(70dvh,30rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto border border-slate-200 bg-[#fbfaf7] p-1.5"
                >
                  {moreStoryTemplates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => openTemplateEditor(template)}
                      className="min-h-14 items-start whitespace-normal px-3 py-2.5 text-[#102238]"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                      <span>
                        <span className="block font-semibold">{template.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{template.description}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </section>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setStoryTouched(true);
            setCityTouched(true);
            setConsentTouched(true);
            if (canSubmit && !isAnalyzing) void onSubmit();
          }}
          className="sticky bottom-0 max-h-[min(60dvh,calc(100dvh-12rem))] shrink-0 overflow-y-auto overscroll-contain border-t border-slate-200/90 bg-[#fbfaf7] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(16,34,56,0.06)] sm:px-6 sm:pt-4"
        >
          <div className="mx-auto max-w-3xl space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="empty-story" className="text-sm font-semibold text-[#102238]">
                  Tu relato
                </Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">{story.length}/{ORIENTATION_FORM_LIMITS.storyMax}</span>
              </div>
              <Textarea
                ref={textareaRef}
                id="empty-story"
                name="story"
                value={story}
                onChange={(event) => {
                  onStoryChange(event.target.value);
                  if (!event.target.value.trim()) setAppliedTemplateId(null);
                }}
                onBlur={() => setStoryTouched(true)}
                disabled={isAnalyzing}
                required
                aria-required="true"
                minLength={ORIENTATION_FORM_LIMITS.storyMin}
                maxLength={ORIENTATION_FORM_LIMITS.storyMax}
                rows={4}
                aria-invalid={showStoryError || undefined}
                aria-describedby={showStoryError ? "empty-story-error" : undefined}
                placeholder="Escribe aquí tu problema o elige un ejemplo de relato arriba…"
                className={`${appliedTemplate ? "h-36 max-h-52 sm:h-44" : "h-24 max-h-36 sm:h-28"} resize-none overflow-y-auto bg-white px-3 py-3 text-base leading-6 shadow-sm [field-sizing:fixed]`}
              />
              {appliedTemplate && (
                <div className="mt-2 flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
                  <span><strong>Ejemplo elegido:</strong> {appliedTemplate.label}. Sigue ajustando tu relato y los campos entre corchetes.</span>
                  <button type="button" onClick={() => openTemplateEditor(appliedTemplate, story)} className="shrink-0 text-left font-semibold text-[#173f6b] hover:underline">
                    Volver a editarla
                  </button>
                </div>
              )}
              {showStoryError && (
                <p id="empty-story-error" role="alert" className="mt-1.5 text-xs leading-5 text-rose-700">
                  {ORIENTATION_FORM_ERRORS.story}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <Label htmlFor="empty-city" className="sr-only">
                  Municipio o ciudad
                </Label>
                <Input
                  id="empty-city"
                  name="city"
                  value={city}
                  onChange={(event) => onCityChange(event.target.value)}
                  onBlur={() => setCityTouched(true)}
                  disabled={isAnalyzing}
                  required
                  aria-required="true"
                  minLength={ORIENTATION_FORM_LIMITS.cityMin}
                  maxLength={ORIENTATION_FORM_LIMITS.cityMax}
                  aria-invalid={showCityError || undefined}
                  aria-describedby={showCityError || showCityGuidance ? "empty-city-error" : undefined}
                  placeholder="Tu municipio o ciudad"
                  className="h-11 bg-white text-base shadow-sm"
                />
                {(showCityError || showCityGuidance) && (
                  <p
                    id="empty-city-error"
                    role={showCityError ? "alert" : undefined}
                    className={`mt-1.5 text-xs leading-5 ${showCityError ? "text-rose-700" : "text-muted-foreground"}`}
                  >
                    {ORIENTATION_FORM_ERRORS.city}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={!canSubmit || isAnalyzing}
                className="h-11 shrink-0 bg-[#173f6b] px-5 text-white hover:bg-[#102f51] sm:self-start"
              >
                <Send className="size-4" />
                Enviar relato
              </Button>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-slate-600">
              <input
                type="checkbox"
                name="processingConsent"
                checked={processingConsent}
                onChange={(event) => {
                  setConsentTouched(true);
                  onConsentChange(event.target.checked);
                }}
                onBlur={() => setConsentTouched(true)}
                disabled={isAnalyzing}
                required
                aria-invalid={showConsentError || undefined}
                aria-describedby={showConsentError || showConsentGuidance ? "empty-consent-error" : undefined}
                className="mt-0.5 size-4 shrink-0 accent-[#173f6b]"
              />
              <span>{PROCESSING_CONSENT_COPY}</span>
            </label>
            {(showConsentError || showConsentGuidance) && (
              <p
                id="empty-consent-error"
                role={showConsentError ? "alert" : undefined}
                className={`text-xs leading-5 ${showConsentError ? "text-rose-700" : "text-muted-foreground"}`}
              >
                {ORIENTATION_FORM_ERRORS.consent}
              </p>
            )}

            <p className="text-[11px] leading-4 text-muted-foreground">
              {EXTERNAL_PROCESSING_COPY}
            </p>

            {formError && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {formError}
              </p>
            )}

            <p className="text-xs leading-5 text-muted-foreground">
              Esta orientación es una guía general y no reemplaza una consulta legal profesional.
            </p>
          </div>
        </form>
      </main>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen} disablePointerDismissal>
        <DialogContent className="max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                {selectedTemplate ? categoryLabels[selectedTemplate.category] : "Ejemplo de relato"}
              </span>
            </div>
            <DialogTitle className="pr-8 font-serif text-2xl text-[#102238]">
              Ejemplo de relato: {selectedTemplate?.label}
            </DialogTitle>
            <DialogDescription className="leading-6">
              Edita lo que está entre corchetes, agrega detalles que recuerdes y borra lo que no aplique.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            {selectedTemplate?.alert && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <span>{selectedTemplate.alert}</span>
              </div>
            )}

            {story.trim() && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                Ya tienes un relato escrito. Solo el botón de abajo lo reemplazará con este ejemplo.
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="template-story" className="font-semibold text-[#102238]">Relato editable</Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">{templateDraft.length}/{ORIENTATION_FORM_LIMITS.storyMax}</span>
              </div>
              <Textarea
                id="template-story"
                value={templateDraft}
                onChange={(event) => setTemplateDraft(event.target.value)}
                rows={12}
                minLength={ORIENTATION_FORM_LIMITS.storyMin}
                maxLength={ORIENTATION_FORM_LIMITS.storyMax}
                className="min-h-64 resize-y bg-white text-[15px] leading-6"
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              <span>No incluyas cédulas, direcciones exactas, teléfonos, correos personales, contraseñas ni datos bancarios.</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTemplateOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              disabled={!templateDraftIsValid}
              onClick={applyTemplate}
              className="bg-[#173f6b] text-white hover:bg-[#102f51]"
            >
              <FileText className="size-4" />
              {story.trim() ? "Reemplazar con este ejemplo" : "Usar este relato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
