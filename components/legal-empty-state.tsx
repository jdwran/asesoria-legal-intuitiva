"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

const mainPopularSearches = [
  "Me despidieron sin pago",
  "Problemas con mi arrendador",
  "Me negaron un servicio de salud",
];

const morePopularSearches = [
  "No me pagan la cuota alimentaria",
  "Custodia o visitas de mis hijos",
  "Fui víctima de un delito",
  "Recibí una multa o resolución",
  "Me llegó una notificación judicial",
];

type LegalEmptyStateProps = {
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

  const storyIsValid = story.trim().length >= ORIENTATION_FORM_LIMITS.storyMin;
  const cityIsValid = city.trim().length >= ORIENTATION_FORM_LIMITS.cityMin;
  const canSubmit = isOrientationFormReady({ story, city, processingConsent });
  const showStoryError = storyTouched && !storyIsValid;
  const showCityError = cityTouched && !cityIsValid;
  const showConsentError = consentTouched && !processingConsent;
  const showCityGuidance = storyIsValid && !cityIsValid && !cityTouched;
  const showConsentGuidance = storyIsValid && cityIsValid && !processingConsent && !consentTouched;

  function choosePopularSearch(popularSearch: string) {
    onStoryChange(popularSearch);
    setStoryTouched(true);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(popularSearch.length, popularSearch.length);
    });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f4f3ee] text-[#102238]">
      <header className="shrink-0 border-b border-slate-200/80 bg-[#fbfaf7] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
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
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <section
          aria-label="Búsquedas populares"
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

            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {mainPopularSearches.map((popularSearch) => (
                <Button
                  key={popularSearch}
                  type="button"
                  variant="outline"
                  disabled={isAnalyzing}
                  onClick={() => choosePopularSearch(popularSearch)}
                  className="h-auto min-h-11 whitespace-normal rounded-full border-[#173f6b]/20 bg-[#fbfaf7] px-4 py-2.5 text-left text-[#102238] shadow-sm hover:border-[#173f6b]/40 hover:bg-white"
                >
                  {popularSearch}
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
                  Ver más búsquedas populares
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[calc(100vw-2rem)] max-w-sm border border-slate-200 bg-[#fbfaf7] p-1.5"
                >
                  {morePopularSearches.map((popularSearch) => (
                    <DropdownMenuItem
                      key={popularSearch}
                      onClick={() => choosePopularSearch(popularSearch)}
                      className="min-h-10 whitespace-normal px-3 py-2 text-[#102238]"
                    >
                      {popularSearch}
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
              <Label htmlFor="empty-story" className="sr-only">
                Cuéntanos tu problema
              </Label>
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
                placeholder="Escribe aquí tu problema con tus propias palabras…"
                className="h-24 max-h-36 resize-none overflow-y-auto bg-white px-3 py-3 text-base leading-6 shadow-sm [field-sizing:fixed] sm:h-28"
              />
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
    </div>
  );
}
