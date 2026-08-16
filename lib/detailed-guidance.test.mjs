import assert from "node:assert/strict";
import test from "node:test";

import {
  DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY,
  DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION,
} from "./detailed-guidance.ts";

test("la aceptación de detalle es explícita, versionada y distinta del consentimiento de datos", () => {
  assert.equal(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION, "detailed-guidance-v1");
  assert.match(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /verificar los hechos/i);
  assert.match(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /vigencia de las fuentes/i);
  assert.match(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /autoridad competente/i);
  assert.match(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /cualquier plazo/i);
  assert.match(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /puedo detenerme/i);
  assert.match(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /quiero continuar/i);
  assert.doesNotMatch(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY, /autorizo procesar/i);
  assert.doesNotMatch(
    DETAILED_GUIDANCE_ACKNOWLEDGEMENT_COPY,
    /bajo mi responsabilidad|renuncio|exonero|libero de responsabilidad|asumo toda responsabilidad/i,
  );
});
