import assert from "node:assert/strict";
import test from "node:test";

import {
  getCaseOutputs,
  getColombianProcedureSteps,
  getSuggestedCaseBlocks,
} from "./case-guidance.ts";
import { buildFallbackOrientation, officialSources } from "./legal-data.ts";

const stories = [
  "Me quieren desalojar del apartamento en cinco días.",
  "Mi empleador no me paga el sueldo hace dos meses.",
  "La EPS no autoriza una cirugía urgente.",
  "El padre de mi hija no paga la cuota alimentaria.",
  "Mi pareja me golpeó y me amenazó hoy.",
  "Me robaron y quiero denunciar.",
  "La alcaldía me notificó una multa.",
  "Me llegó una notificación de un juzgado para mañana.",
];

for (const story of stories) {
  test(`la guía es accionable para: ${story}`, () => {
    const orientation = buildFallbackOrientation(story, "Cali");
    const steps = getColombianProcedureSteps(orientation, "Cali");
    assert.equal(steps.length, 3);
    for (const step of steps) {
      assert.ok(step.entity);
      assert.ok(step.channel);
      assert.ok(step.requirements.length);
      assert.ok(step.expectedOutput);
      assert.ok(step.nextAction);
    }
  });
}

test("cada fuente de los trámites existe en el catálogo oficial", () => {
  const sourceIds = new Set(officialSources.map((source) => source.id));
  for (const story of stories) {
    const orientation = buildFallbackOrientation(story, "Bogotá");
    for (const step of getColombianProcedureSteps(orientation, "Bogotá")) {
      for (const sourceId of step.sourceIds) assert.ok(sourceIds.has(sourceId), sourceId);
    }
  }
});

test("los bloques aceptados dejan de sugerirse", () => {
  const first = getSuggestedCaseBlocks("laboral", [])[0];
  const remaining = getSuggestedCaseBlocks("laboral", [
    { id: "accepted", type: first.type, title: first.title, detail: "Confirmado" },
  ]);
  assert.ok(!remaining.some((suggestion) => suggestion.id === first.id));
});

test("los outputs reflejan el progreso sin prometer radicación", () => {
  const orientation = buildFallbackOrientation("Mi empleador no me paga el sueldo.", "Cali");
  const outputs = getCaseOutputs(orientation, [], []);
  assert.deepEqual(outputs.map((output) => output.id), ["ruta", "borrador", "carpeta", "comprobantes"]);
  assert.equal(outputs.find((output) => output.id === "ruta")?.status, "pendiente");
});

test("la ruta de niñez activa la Línea 141", () => {
  const orientation = buildFallbackOrientation("Un profesor abusó de mi hija en el colegio.", "Cali");
  const firstStep = getColombianProcedureSteps(orientation, "Cali")[0];
  assert.match(firstStep.channel, /141/);
  assert.ok(firstStep.sourceIds.includes("icbf-linea-141"));
});

test("violencia con audiencia conserva la revisión judicial urgente", () => {
  const orientation = buildFallbackOrientation(
    "Mi pareja me golpeó y me notificaron una audiencia en un juzgado para mañana.",
    "Cali",
  );
  const lastStep = getColombianProcedureSteps(orientation, "Cali")[2];
  assert.match(lastStep.expectedOutput, /plazo judicial/);
});
