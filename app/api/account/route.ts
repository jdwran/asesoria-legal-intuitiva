import { z } from "zod";

import { getChatGPTUserFromHeaders } from "@/app/chatgpt-auth";
import {
  getCookieValue,
  hasAllowedMutationOrigin,
  isValidRegistrationGate,
  REGISTRATION_GATE_COOKIE,
} from "@/lib/account-access";

const ACCOUNT_REQUEST_MAX_BYTES = 2_048;
const STORAGE_CONSENT_VERSION = "2026-08-15.v1";
const accountRequestSchema = z.object({ consent: z.literal(true) }).strict();

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
      ...extraHeaders,
    },
  });
}

function clearGateCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${REGISTRATION_GATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function POST(request: Request) {
  if (!hasAllowedMutationOrigin(request)) {
    return json({ error: "Solicitud no autorizada." }, 403);
  }

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return json({ error: "Solicitud inválida." }, 415);
  }

  const gate = getCookieValue(request.headers.get("cookie"), REGISTRATION_GATE_COOKIE);
  if (
    !(await isValidRegistrationGate(
      gate,
      process.env.ACCOUNT_REGISTRATION_TOKEN,
    ))
  ) {
    return json({ error: "No encontrado." }, 404);
  }

  const identity = getChatGPTUserFromHeaders(request.headers);
  if (!identity) return json({ error: "Solicitud no autorizada." }, 401);

  let body: unknown;
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > ACCOUNT_REQUEST_MAX_BYTES) {
      return json({ error: "Solicitud inválida." }, 413);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > ACCOUNT_REQUEST_MAX_BYTES) {
      return json({ error: "Solicitud inválida." }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const parsed = accountRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Solicitud inválida." }, 400);

  try {
    const { upsertActiveAppUser } = await import("@/lib/db");
    const account = await upsertActiveAppUser({
      oaiUserId: identity.userId,
      email: identity.email.toLowerCase(),
      displayName: identity.displayName,
      consentVersion: STORAGE_CONSENT_VERSION,
    });
    return json(
      { account: { displayName: account.displayName } },
      200,
      { "Set-Cookie": clearGateCookie(request) },
    );
  } catch {
    return json({ error: "El servicio no está disponible temporalmente." }, 503);
  }
}
