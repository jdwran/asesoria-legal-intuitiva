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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  EXTERNAL_PROCESSING_COPY,
  ORIENTATION_FORM_ERRORS,
  ORIENTATION_FORM_LIMITS,
  PROCESSING_CONSENT_COPY,
  isOrientationFormReady,
} from "@/lib/orientation-form";
import {
  buildStoryFromTemplate,
  featuredStoryTemplates,
  getStoryTemplate,
  getStoryTemplateProgress,
  renderStoryTemplatePreview,
  storyTemplates,
  type StoryTemplate,
  type StoryTemplateValues,
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
  onSubmit: (finalStory: string) => void | Promise<void>;
};

function TemplatePreviewText({
  template,
  values,
}: {
  template: StoryTemplate;
  values: StoryTemplateValues;
}) {
  const preview = renderStoryTemplatePreview(template, values);
  const fieldLabels = new Map(template.fields.map((field) => [field.key, field.label]));

  return preview.split(/(\{\{[a-z][A-Za-z0-9]*\}\})/g).map((part, index) => {
    const token = part.match(/^\{\{([a-z][A-Za-z0-9]*)\}\}$/);
    if (!token) return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;

    const key = token[1];
    return (
      <span
        key={`${index}-${key}`}
        title={fieldLabels.get(key)}
        className="mx-0.5 inline rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-400"
      >
        {part}
      </span>
    );
  });
}

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
  const [templateValues, setTemplateValues] = useState<StoryTemplateValues>({});
  const [templateDraftValues, setTemplateDraftValues] = useState<StoryTemplateValues>({});
  const [optionalDetail, setOptionalDetail] = useState("");

  const appliedTemplate = appliedTemplateId ? getStoryTemplate(appliedTemplateId) : undefined;
  const baseStory = appliedTemplate
    ? buildStoryFromTemplate(appliedTemplate, templateValues) ?? ""
    : story.trim();
  const optionalDetailLimit = Math.max(
    0,
    ORIENTATION_FORM_LIMITS.storyMax - baseStory.length - (baseStory ? 1 : 0),
  );
  const effectiveOptionalDetail = optionalDetail.slice(0, optionalDetailLimit);
  const finalStory = appliedTemplate
    ? buildStoryFromTemplate(appliedTemplate, templateValues, effectiveOptionalDetail) ?? ""
    : [story.trim(), effectiveOptionalDetail.trim()].filter(Boolean).join("\n");
  const storyIsValid = baseStory.length >= ORIENTATION_FORM_LIMITS.storyMin;
  const cityIsValid = city.trim().length >= ORIENTATION_FORM_LIMITS.cityMin;
  const canSubmit =
    storyIsValid && isOrientationFormReady({ story: finalStory, city, processingConsent });
  const showStoryError = storyTouched && !storyIsValid;
  const showCityError = cityTouched && !cityIsValid;
  const showConsentError = consentTouched && !processingConsent;
  const showCityGuidance = storyIsValid && !cityIsValid && !cityTouched;
  const showConsentGuidance = storyIsValid && cityIsValid && !processingConsent && !consentTouched;
  const templateProgress = selectedTemplate
    ? getStoryTemplateProgress(selectedTemplate, templateDraftValues)
    : { completed: 0, total: 0 };
  const templateDraftStory = selectedTemplate
    ? buildStoryFromTemplate(selectedTemplate, templateDraftValues)
    : null;
  const templateDraftIsValid = Boolean(
    templateDraftStory && templateDraftStory.length <= ORIENTATION_FORM_LIMITS.storyMax,
  );

  function openTemplateEditor(template: StoryTemplate) {
    setSelectedTemplate(template);
    setTemplateDraftValues(
      appliedTemplateId === template.id ? { ...templateValues } : {},
    );
    setTemplateOpen(true);
  }

  function applyTemplate() {
    if (!selectedTemplate || !templateDraftIsValid) return;
    const nextStory = buildStoryFromTemplate(selectedTemplate, templateDraftValues);
    if (!nextStory) return;
    setTemplateValues({ ...templateDraftValues });
    onStoryChange(nextStory);
    setAppliedTemplateId(selectedTemplate.id);
    setStoryTouched(true);
    setTemplateOpen(false);
  }

  function clearStory() {
    setSelectedTemplate(null);
    setAppliedTemplateId(null);
    setTemplateValues({});
    setTemplateDraftValues({});
    setOptionalDetail("");
    setStoryTouched(false);
    onStoryChange("");
    setTemplateOpen(false);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(0, 0);
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
                Orientación legal gratuita, rápida y en palabras sencillas.
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
                Elige un caso parecido y responde unas preguntas breves para construir tu relato.
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
            if (canSubmit && !isAnalyzing) {
              void onSubmit(finalStory);
            }
          }}
          className="sticky bottom-0 max-h-[min(60dvh,calc(100dvh-12rem))] shrink-0 overflow-y-auto overscroll-contain border-t border-slate-200/90 bg-[#fbfaf7] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(16,34,56,0.06)] sm:px-6 sm:pt-4"
        >
          <div className="mx-auto max-w-3xl space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="empty-story" className="text-sm font-semibold text-[#102238]">
                  Tu relato
                </Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">{finalStory.length}/{ORIENTATION_FORM_LIMITS.storyMax}</span>
              </div>
              {appliedTemplate ? (
                <div
                  id="empty-story"
                  aria-readonly="true"
                  aria-invalid={showStoryError || undefined}
                  aria-describedby={showStoryError ? "empty-story-error" : undefined}
                  className="min-h-28 rounded-lg border border-slate-200 bg-white px-3 py-3 text-[15px] leading-6 shadow-sm"
                >
                  <TemplatePreviewText template={appliedTemplate} values={templateValues} />
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  id="empty-story"
                  name="story"
                  value={story}
                  onChange={(event) => onStoryChange(event.target.value)}
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
                  className="h-24 max-h-36 resize-none overflow-y-auto bg-white px-3 py-3 text-base leading-6 shadow-sm [field-sizing:fixed] sm:h-28"
                />
              )}
              {appliedTemplate && (
                <div className="mt-2 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
                  <span><strong>Ejemplo elegido:</strong> {appliedTemplate.label}. El relato se construyó con todas tus respuestas.</span>
                  <span className="flex shrink-0 flex-wrap gap-3">
                    <button type="button" onClick={() => openTemplateEditor(appliedTemplate)} className="font-semibold text-[#173f6b] hover:underline">
                      Editar checklist
                    </button>
                    <button type="button" onClick={clearStory} className="font-semibold text-[#173f6b] hover:underline">
                      Empezar de cero
                    </button>
                  </span>
                </div>
              )}
              {showStoryError && (
                <p id="empty-story-error" role="alert" className="mt-1.5 text-xs leading-5 text-rose-700">
                  {ORIENTATION_FORM_ERRORS.story}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="empty-extra-detail" className="text-sm font-semibold text-[#102238]">
                  ¿Quieres agregar algo más? (opcional)
                </Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {effectiveOptionalDetail.length}/{optionalDetailLimit}
                </span>
              </div>
              <Textarea
                id="empty-extra-detail"
                name="optionalDetail"
                value={effectiveOptionalDetail}
                onChange={(event) => setOptionalDetail(event.target.value)}
                disabled={isAnalyzing || optionalDetailLimit === 0}
                maxLength={optionalDetailLimit}
                rows={2}
                placeholder={
                  optionalDetailLimit === 0
                    ? "El relato principal alcanzó el límite disponible."
                    : "Agrega aquí un contexto que no haya quedado en el relato principal."
                }
                className="min-h-20 resize-y bg-white px-3 py-3 text-base leading-6 shadow-sm"
              />
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Este campo nunca es obligatorio y no impide ver la respuesta preliminar.
              </p>
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
                Ver respuesta preliminar
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
              Responde todas las preguntas. La vista previa se actualizará mientras completas el checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            {selectedTemplate?.alert && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <span>{selectedTemplate.alert}</span>
              </div>
            )}

            {story.trim() && appliedTemplateId !== selectedTemplate?.id && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                Ya tienes un relato escrito. Solo el botón de abajo lo reemplazará con este ejemplo.
              </div>
            )}

            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label className="font-semibold text-[#102238]">Vista previa de solo lectura</Label>
                    <span className="text-[11px] text-muted-foreground">Se completa automáticamente</span>
                  </div>
                  <div
                    aria-live="polite"
                    aria-label="Vista previa del relato"
                    className="rounded-xl border border-slate-200 bg-white p-4 text-[15px] leading-7 text-[#102238] shadow-sm"
                  >
                    <TemplatePreviewText template={selectedTemplate} values={templateDraftValues} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-[#102238]">Avance del checklist</span>
                    <span className="tabular-nums text-muted-foreground">
                      {templateProgress.completed} de {templateProgress.total} completados
                    </span>
                  </div>
                  <Progress
                    value={templateProgress.total ? (templateProgress.completed / templateProgress.total) * 100 : 0}
                    aria-label={`${templateProgress.completed} de ${templateProgress.total} campos completados`}
                    className="h-2"
                  />
                </div>

                <div className="space-y-4" aria-label="Preguntas obligatorias del ejemplo">
                  {selectedTemplate.fields.map((field, index) => {
                    const value = templateDraftValues[field.key] ?? "";
                    const complete = Boolean(value.trim());
                    return (
                      <div key={field.key}>
                        <div className="mb-1.5 flex items-start justify-between gap-3">
                          <Label htmlFor={`template-field-${field.key}`} className="leading-5 text-[#102238]">
                            {index + 1}. {field.label} <span aria-hidden="true" className="text-rose-600">*</span>
                          </Label>
                          <span className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${complete ? "text-emerald-700" : "text-slate-400"}`}>
                            {complete ? "Completo" : "Pendiente"}
                          </span>
                        </div>
                        <Input
                          id={`template-field-${field.key}`}
                          value={value}
                          onChange={(event) => {
                            const nextValues = {
                              ...templateDraftValues,
                              [field.key]: event.target.value,
                            };
                            setTemplateDraftValues(nextValues);
                          }}
                          disabled={isAnalyzing}
                          required
                          aria-required="true"
                          placeholder={field.placeholder}
                          maxLength={800}
                          autoComplete="off"
                          className="h-11 bg-white text-base shadow-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              <span>No incluyas cédulas, direcciones exactas, teléfonos, correos personales, contraseñas ni datos bancarios.</span>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={clearStory}>Empezar de cero</Button>
            <span className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setTemplateOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              disabled={!templateDraftIsValid}
              onClick={applyTemplate}
              className="bg-[#173f6b] text-white hover:bg-[#102f51]"
            >
              <FileText className="size-4" />
              {story.trim() && appliedTemplateId !== selectedTemplate?.id
                ? "Reemplazar con este ejemplo"
                : "Usar este relato"}
            </Button>
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
