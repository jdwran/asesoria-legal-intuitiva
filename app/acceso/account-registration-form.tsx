"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";

type RegistrationState = "idle" | "submitting" | "success";

export function AccountRegistrationForm({ displayName }: { displayName: string }) {
  const consentRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<RegistrationState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!consent) {
      setError("Debes autorizar el almacenamiento para activar esta cuenta.");
      consentRef.current?.focus();
      return;
    }

    setState("submitting");
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { account?: { displayName?: string }; error?: string }
        | null;
      if (!response.ok || !payload?.account) {
        throw new Error(payload?.error || "No fue posible activar el guardado.");
      }
      setState("success");
    } catch (submissionError) {
      setState("idle");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No fue posible activar el guardado.",
      );
    }
  }

  if (state === "success") {
    return (
      <section
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
        aria-labelledby="account-ready-title"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Check className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="account-ready-title" className="text-lg font-bold text-emerald-950">
              Guardado privado activado
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              Tu cuenta quedó lista. Desde ahora el orientador restaurará y guardará
              automáticamente tu sesión cifrada.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#173f6b] px-4 py-2 text-sm font-bold text-white hover:bg-[#102f51] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f6b]"
            >
              Continuar al orientador <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={state === "submitting"} noValidate>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#173f6b]">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">Cuenta identificada</p>
            <p className="mt-1 break-words text-sm text-slate-600">{displayName}</p>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-base font-bold text-[#102238]">
            Autorización independiente de almacenamiento
          </legend>
          <p id="storage-consent-detail" className="mt-2 text-sm leading-6 text-slate-600">
            Esta autorización es distinta de la que permite procesar un relato con IA. Se
            guardarán de forma cifrada el borrador, la orientación, los bloques del expediente,
            las respuestas de triage y el progreso, exclusivamente para restaurar tu sesión.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 focus-within:border-[#173f6b] focus-within:ring-2 focus-within:ring-[#173f6b]/20">
            <input
              ref={consentRef}
              id="storage-consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                setError("");
              }}
              aria-describedby="storage-consent-detail"
              aria-invalid={Boolean(error)}
              className="mt-1 size-4 shrink-0 accent-[#173f6b]"
            />
            <span>
              Autorizo guardar mi sesión legal cifrada y asociarla con esta cuenta para poder
              recuperarla después.
            </span>
          </label>
        </fieldset>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "submitting"}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#173f6b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102f51] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f6b] disabled:cursor-wait disabled:opacity-70"
        >
          {state === "submitting" ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Activando…
            </>
          ) : (
            <>Activar guardado privado</>
          )}
        </button>
      </div>
    </form>
  );
}
