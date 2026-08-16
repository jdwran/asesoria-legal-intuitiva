import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function normalizeJsxWhitespace(source) {
  return source.replace(/\s+/g, " ");
}

test("los textos legales protegidos permanecen literales", async () => {
  const [registration, emptyState] = await Promise.all([
    readFile(new URL("../app/acceso/account-registration-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/legal-empty-state.tsx", import.meta.url), "utf8"),
  ]);
  const normalizedRegistration = normalizeJsxWhitespace(registration);
  const normalizedEmptyState = normalizeJsxWhitespace(emptyState);

  assert.match(
    normalizedRegistration,
    /Se guardarán de forma cifrada el borrador, la orientación, los bloques del expediente, las respuestas de triage y el progreso, exclusivamente para restaurar tu sesión\./,
  );
  assert.match(
    normalizedRegistration,
    /Autorizo guardar mi sesión legal cifrada y asociarla con esta cuenta para poder recuperarla después\./,
  );
  assert.match(
    normalizedEmptyState,
    /Esta orientación es una guía general y no reemplaza una consulta legal profesional\./,
  );
  assert.doesNotMatch(
    normalizedEmptyState,
    /Editar checklist|Avance del checklist|Preguntas obligatorias|Responde todas las preguntas/,
  );
  assert.match(
    normalizedEmptyState,
    /Las indicaciones entre corchetes son opcionales: puedes cambiarlas, borrarlas o dejar solo la información que conozcas\./,
  );
});

test("acceso conserva badge y título, pero explica la autorización sin una tercera repetición", async () => {
  const accessPage = normalizeJsxWhitespace(
    await readFile(new URL("../app/acceso/page.tsx", import.meta.url), "utf8"),
  );

  assert.match(accessPage, /Acceso privado/);
  assert.match(accessPage, /Activa el guardado privado de tus sesiones/);
  assert.match(
    accessPage,
    /Esta autorización se solicita por separado para guardar y restaurar tu sesión\./,
  );
  assert.doesNotMatch(accessPage, /Este portal no aparece en la navegación pública/);
});
