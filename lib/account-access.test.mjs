import assert from "node:assert/strict";
import test from "node:test";

import {
  createRegistrationGate,
  hasAllowedMutationOrigin,
  isValidRegistrationGate,
  isValidRegistrationToken,
  REGISTRATION_GATE_TTL_SECONDS,
} from "./account-access.ts";

const registrationToken = "token-super-secreto-de-al-menos-treinta-y-dos-caracteres";

test("la URL de alta exige el token completo y una configuración segura", async () => {
  assert.equal(await isValidRegistrationToken(registrationToken, registrationToken), true);
  assert.equal(await isValidRegistrationToken(`${registrationToken}x`, registrationToken), false);
  assert.equal(await isValidRegistrationToken("demasiado-corto", registrationToken), false);
  assert.equal(await isValidRegistrationToken(registrationToken, "configuracion-corta"), false);
});

test("el gate está firmado, expira y no acepta alteraciones", async () => {
  const now = 1_700_000_000;
  const gate = await createRegistrationGate(registrationToken, now);
  assert.equal(await isValidRegistrationGate(gate, registrationToken, now), true);
  assert.equal(
    await isValidRegistrationGate(gate, registrationToken, now + REGISTRATION_GATE_TTL_SECONDS),
    false,
  );

  const replacement = gate.endsWith("A") ? "B" : "A";
  const tampered = `${gate.slice(0, -1)}${replacement}`;
  assert.equal(await isValidRegistrationGate(tampered, registrationToken, now), false);
});

test("las mutaciones solo aceptan el Origin efectivo del sitio", () => {
  assert.equal(
    hasAllowedMutationOrigin(
      new Request("https://orientador.example/api/account", {
        method: "POST",
        headers: { Origin: "https://orientador.example" },
      }),
    ),
    true,
  );
  assert.equal(
    hasAllowedMutationOrigin(
      new Request("http://worker.internal/api/session", {
        method: "PUT",
        headers: {
          Origin: "https://legal.example",
          "X-Forwarded-Host": "legal.example",
          "X-Forwarded-Proto": "https",
        },
      }),
    ),
    true,
  );
  assert.equal(
    hasAllowedMutationOrigin(
      new Request("https://orientador.example/api/account", {
        method: "POST",
        headers: { Origin: "https://attacker.example" },
      }),
    ),
    false,
  );
  assert.equal(
    hasAllowedMutationOrigin(
      new Request("https://orientador.example/api/account", { method: "POST" }),
    ),
    false,
  );
});
