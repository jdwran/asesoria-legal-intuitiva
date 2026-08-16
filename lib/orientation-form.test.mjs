import test from "node:test";
import assert from "node:assert/strict";

import {
  ORIENTATION_FORM_ERRORS,
  isOrientationFormReady,
} from "./orientation-form.ts";
import { orientationRequestSchema } from "./orientation-request.ts";

test("el formulario exige relato, ciudad y consentimiento", () => {
  assert.equal(
    isOrientationFormReady({
      story: "Me despidieron sin pago",
      city: "Cali",
      processingConsent: true,
    }),
    true,
  );
  assert.equal(
    isOrientationFormReady({
      story: "Me despidieron sin pago",
      city: "Cali",
      processingConsent: false,
    }),
    false,
  );
});

test("el contrato rechaza una solicitud sin ciudad", () => {
  const result = orientationRequestSchema.safeParse({
    story: "Me despidieron sin pagar la liquidación.",
    processingConsent: true,
  });

  assert.equal(result.success, false);
});

test("el contrato rechaza una solicitud sin consentimiento", () => {
  const result = orientationRequestSchema.safeParse({
    story: "Me despidieron sin pagar la liquidación.",
    city: "Cali",
  });

  assert.equal(result.success, false);
});

test("el contrato recorta espacios antes de validar", () => {
  const result = orientationRequestSchema.safeParse({
    story: "   relato corto   ",
    city: "   B   ",
    processingConsent: true,
  });

  assert.equal(result.success, false);
});

test("los mensajes compartidos conservan el copy aprobado", () => {
  assert.deepEqual(ORIENTATION_FORM_ERRORS, {
    story: "Cuéntanos un poco más: el relato debe tener al menos 12 caracteres.",
    city: "Escribe un municipio o ciudad para orientar los canales de consulta.",
    consent: "Necesitamos tu autorización para procesar el relato.",
  });
});
