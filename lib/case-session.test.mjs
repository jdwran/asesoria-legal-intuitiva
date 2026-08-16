import assert from "node:assert/strict";
import test from "node:test";

import { parseCaseSessionSnapshot } from "./case-session.ts";
import { sessionFixture } from "./case-session.fixture.ts";

test("el snapshot v1 conserva el contrato esperado por el frontend", () => {
  const snapshot = sessionFixture();
  assert.deepEqual(parseCaseSessionSnapshot(snapshot), snapshot);
});

test("el snapshot conserva la aceptación versionada del análisis detallado", () => {
  const snapshot = sessionFixture();
  snapshot.case.detailedGuidanceAcknowledgement = {
    acceptedAt: "2026-08-15T18:30:00.000Z",
    version: "detailed-guidance-v1",
  };

  assert.deepEqual(parseCaseSessionSnapshot(snapshot), snapshot);
});

test("el snapshot rechaza una versión desconocida de la aceptación", () => {
  const snapshot = sessionFixture();
  snapshot.case.detailedGuidanceAcknowledgement = {
    acceptedAt: "2026-08-15T18:30:00.000Z",
    version: "detailed-guidance-v2",
  };

  assert.throws(() => parseCaseSessionSnapshot(snapshot));
});

test("el snapshot rechaza versiones o propiedades desconocidas", () => {
  assert.throws(() => parseCaseSessionSnapshot({ ...sessionFixture(), schemaVersion: 2 }));
  assert.throws(() => parseCaseSessionSnapshot({ ...sessionFixture(), unexpected: true }));
});

test("el snapshot aplica el límite total de 256 KB", () => {
  const snapshot = sessionFixture();
  snapshot.case.elements = Array.from({ length: 30 }, (_, index) => ({
    id: `evidence-${index}`,
    type: "pruebas",
    title: `Prueba ${index}`,
    detail: "x".repeat(12_000),
    status: "pendiente",
  }));
  assert.throws(() => parseCaseSessionSnapshot(snapshot), RangeError);
});
