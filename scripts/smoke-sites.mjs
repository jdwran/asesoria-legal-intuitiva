import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const hostname = "127.0.0.1";
const port = process.env.SITES_SMOKE_PORT ?? "4179";
const origin = `http://${hostname}:${port}`;
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
  console.log("Sites smoke passed: root and offline orientation API returned 200.");
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
}

