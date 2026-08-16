import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const hostname = "127.0.0.1";
const port = process.env.SITES_SMOKE_PORT ?? "4179";
const origin = `http://${hostname}:${port}`;
const registrationToken = "smoke-registration-token-with-more-than-thirty-two-characters";
const output = [];

const server = spawn(
  process.execPath,
  [path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js"), "start", "--hostname", hostname, "--port", port],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      AI_OFFLINE: "1",
      OPENAI_API_KEY: "",
      PRIMARY_AI_API_KEY: "",
      PRIMARY_AI_BASE_URL: "",
      PRIMARY_AI_MODEL: "",
      ACCOUNT_REGISTRATION_TOKEN: registrationToken,
      CASE_DATA_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    output.push(chunk.toString());
    if (output.join("").length > 8_000) output.shift();
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return response;
    } catch {
      // El servidor todavía está iniciando.
    }
    await delay(150);
  }
  throw new Error(`Sites did not start successfully.\n${output.join("")}`);
}

try {
  const rootResponse = await waitForServer();
  assert.equal(rootResponse.status, 200);
  assert.match(rootResponse.headers.get("content-security-policy") ?? "", /default-src/);
  const rootHtml = await rootResponse.text();
  assert.doesNotMatch(rootHtml, /href=["'][^"']*\/acceso/i);

  const directAccessResponse = await fetch(`${origin}/acceso`, { redirect: "manual" });
  assert.equal(directAccessResponse.status, 404);

  const invalidInviteResponse = await fetch(`${origin}/acceso/token-invalido`, {
    redirect: "manual",
  });
  assert.equal(invalidInviteResponse.status, 404);
  assert.equal(invalidInviteResponse.headers.get("referrer-policy"), "no-referrer");
  assert.match(invalidInviteResponse.headers.get("cache-control") ?? "", /no-store/);

  const inviteResponse = await fetch(`${origin}/acceso/${registrationToken}`, {
    redirect: "manual",
  });
  assert.equal(inviteResponse.status, 303);
  assert.equal(inviteResponse.headers.get("location"), `${origin}/acceso`);
  assert.equal(inviteResponse.headers.get("referrer-policy"), "no-referrer");
  const gateCookie = inviteResponse.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(gateCookie?.startsWith("ol_registration_gate="));

  const portalResponse = await fetch(`${origin}/acceso`, {
    headers: {
      Cookie: gateCookie,
      "oai-authenticated-user-id": "smoke-user",
      "oai-authenticated-user-email": "smoke@example.com",
    },
    redirect: "manual",
  });
  assert.equal(portalResponse.status, 200);
  assert.match(await portalResponse.text(), /Activa el guardado privado de tus sesiones/);

  const anonymousSessionResponse = await fetch(`${origin}/api/session`);
  assert.equal(anonymousSessionResponse.status, 401);

  const anonymousCaseFilesResponse = await fetch(`${origin}/api/case-files`);
  assert.equal(anonymousCaseFilesResponse.status, 403);
  assert.match(anonymousCaseFilesResponse.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(anonymousCaseFilesResponse.headers.get("x-content-type-options"), "nosniff");

  const ungatedAccountResponse = await fetch(`${origin}/api/account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "oai-authenticated-user-id": "smoke-user",
      "oai-authenticated-user-email": "smoke@example.com",
    },
    body: JSON.stringify({ consent: true }),
  });
  assert.equal(ungatedAccountResponse.status, 404);

  const apiResponse = await fetch(`${origin}/api/orientar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Forwarded-For": "127.0.0.91",
    },
    body: JSON.stringify({
      story: "Mi empleador no me paga el salario desde hace dos meses.",
      city: "Bogotá",
      processingConsent: true,
    }),
    signal: AbortSignal.timeout(3_000),
  });
  const payload = await apiResponse.json();

  assert.equal(apiResponse.status, 200);
  assert.equal(payload.mode, "demo");
  assert.equal(payload.provider, "demo");
  assert.equal(payload.category, "laboral");
  console.log("Sites smoke passed: anonymous flow, private invite and offline orientation are healthy.");
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
}
