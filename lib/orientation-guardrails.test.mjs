import assert from "node:assert/strict";
import test from "node:test";

import { buildFallbackOrientation } from "./legal-data.ts";
import { applyOrientationGuardrails } from "./orientation-guardrails.ts";

function contradictoryAiOrientation(fallback, overrides = {}) {
  return {
    ...fallback,
    caseTitle: "Título generado por IA",
    plainSummary: "Resumen organizado por IA",
    extractedFacts: ["Hecho atómico extraído por IA"],
    ...overrides,
  };
}

test("una notificación judicial no puede terminar con ruta o bloques laborales", () => {
  const story =
    "Ayer me dejaron en la portería un sobre del juzgado con una demanda en mi contra por una deuda de un banco. El papel dice que tengo diez días para contestar y que hay una audiencia.";
  const fallback = buildFallbackOrientation(story, "Bucaramanga");
  const parsed = contradictoryAiOrientation(fallback, {
    category: "laboral",
    urgency: "media",
    documentKind: "reclamacion-laboral",
    sourceIds: ["codigo-trabajo"],
  });

  const guarded = applyOrientationGuardrails(parsed, fallback);
  assert.equal(guarded.category, "otro");
  assert.equal(guarded.urgency, "alta");
  assert.equal(guarded.documentKind, "resumen-urgente");
  assert.ok(guarded.sourceIds.includes("codigo-general-proceso-judicial"));
  assert.equal(guarded.plainSummary, story);
  assert.deepEqual(guarded.extractedFacts, [story]);
});

test("niñez y violencia familiar conservan siempre sus primeros pasos canónicos", () => {
  for (const story of [
    "Mi hijo de 9 años me contó que un vecino lo tocó y todavía puede acercarse a él.",
    "Mi expareja me empujó, me amenazó y todavía tiene llaves de mi casa.",
  ]) {
    const fallback = buildFallbackOrientation(story, "Soacha");
    const parsed = contradictoryAiOrientation(fallback, {
      nextSteps: [{ title: "Conciliar", detail: "Habla directamente con la otra persona." }],
    });
    const guarded = applyOrientationGuardrails(parsed, fallback);
    assert.notEqual(guarded.nextSteps[0]?.title, "Conciliar");
    assert.equal(guarded.urgency, "alta");
  }
});

test("una subruta común de alta confianza corrige una clasificación distinta de la IA", () => {
  const fallback = buildFallbackOrientation(
    "El administrador aumentó el canon del apartamento y no entregó el cálculo.",
    "Villavicencio",
  );
  const parsed = contradictoryAiOrientation(fallback, { category: "otro" });
  const guarded = applyOrientationGuardrails(parsed, fallback);
  assert.equal(guarded.category, "arrendamiento");
  assert.equal(guarded.urgency, "media");
  assert.ok(guarded.sourceIds.includes("ley-820-canon"));
});

test("alimentos, custodia y visitas ganan frente a una mención incidental de arriendo", () => {
  const fallback = buildFallbackOrientation(
    "El papá de mi hija dejó de dar la cuota alimentaria. No definimos custodia ni visitas y yo pago el arriendo sola.",
    "Pereira",
  );
  const parsed = contradictoryAiOrientation(fallback, {
    category: "arrendamiento",
    documentKind: "arrendamiento-comunicacion",
    sourceIds: ["ley-820"],
  });
  const guarded = applyOrientationGuardrails(parsed, fallback);
  assert.equal(guarded.category, "familia");
  assert.equal(guarded.documentKind, "resumen-familia");
  assert.ok(guarded.nextSteps.some(({ detail }) => /alimentos, custodia y visitas/i.test(detail)));
});

test("un relato sin señales determinísticas todavía puede aprovechar la clasificación de la IA", () => {
  const fallback = buildFallbackOrientation(
    "Necesito orientación sobre un acuerdo que no sé cómo clasificar.",
    "Cali",
  );
  const parsed = contradictoryAiOrientation(fallback, {
    category: "laboral",
    documentKind: "reclamacion-laboral",
    sourceIds: ["codigo-trabajo"],
  });
  assert.equal(applyOrientationGuardrails(parsed, fallback).category, "laboral");
});
