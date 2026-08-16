import assert from "node:assert/strict";
import test from "node:test";

import { runAiProviderChain } from "./ai-provider-router.ts";

const fixture = { caseTitle: "Caso de prueba" };

test("usa primero el proveedor abierto y no consume OpenAI si responde", async () => {
  let openAiCalls = 0;

  const result = await runAiProviderChain([
    { id: "open", model: "open-model", execute: async () => fixture },
    {
      id: "openai",
      model: "paid-model",
      execute: async () => {
        openAiCalls += 1;
        return fixture;
      },
    },
  ]);

  assert.deepEqual(result, {
    data: fixture,
    provider: "open",
    model: "open-model",
    fallbackUsed: false,
  });
  assert.equal(openAiCalls, 0);
});

test("pasa a OpenAI cuando el proveedor abierto falla", async () => {
  const failures = [];

  const result = await runAiProviderChain(
    [
      {
        id: "open",
        model: "open-model",
        execute: async () => {
          throw new Error("primary unavailable");
        },
      },
      { id: "openai", model: "paid-model", execute: async () => fixture },
    ],
    (failure) => failures.push(failure.id),
  );

  assert.equal(result?.provider, "openai");
  assert.equal(result?.fallbackUsed, true);
  assert.deepEqual(failures, ["open"]);
});

test("una respuesta nula cuenta como fallo y la cadena puede agotarse", async () => {
  const failures = [];
  const result = await runAiProviderChain(
    [
      { id: "open", model: "open-model", execute: async () => null },
      { id: "openai", model: "paid-model", execute: async () => undefined },
    ],
    (failure) => failures.push(failure.id),
  );

  assert.equal(result, null);
  assert.deepEqual(failures, ["open", "openai"]);
});

test("un aborto del cliente corta la cadena antes del respaldo de pago", async () => {
  const controller = new AbortController();
  let openAiCalls = 0;

  await assert.rejects(
    runAiProviderChain(
      [
        {
          id: "open",
          model: "open-model",
          execute: async () => {
            controller.abort();
            throw new Error("request closed");
          },
        },
        {
          id: "openai",
          model: "paid-model",
          execute: async () => {
            openAiCalls += 1;
            return fixture;
          },
        },
      ],
      undefined,
      controller.signal,
    ),
    { name: "AbortError" },
  );

  assert.equal(openAiCalls, 0);
});

