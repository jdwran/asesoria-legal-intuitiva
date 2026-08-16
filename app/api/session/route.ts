import { z } from "zod";

import { getChatGPTUserFromHeaders } from "@/app/chatgpt-auth";
import {
  decryptCaseSessionSnapshot,
  encryptCaseSessionSnapshot,
  parseCaseDataEncryptionKey,
} from "@/lib/case-crypto";
import {
  caseSessionSnapshotSchema,
  MAX_CASE_SESSION_BYTES,
  parseCaseSessionSnapshot,
} from "@/lib/case-session";
import {
  hasAllowedMutationOrigin,
} from "@/lib/account-access";

const MAX_SESSION_REQUEST_BYTES = MAX_CASE_SESSION_BYTES + 8_192;
const putSessionSchema = z
  .object({
    snapshot: caseSessionSnapshotSchema,
    expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}

async function authorizedAccount(request: Request) {
  const identity = getChatGPTUserFromHeaders(request.headers);
  if (!identity) return null;
  const { findActiveAppUser } = await import("@/lib/db");
  return findActiveAppUser(identity.userId);
}

function encryptionKey() {
  return parseCaseDataEncryptionKey(process.env.CASE_DATA_ENCRYPTION_KEY);
}

export async function GET(request: Request) {
  const identity = getChatGPTUserFromHeaders(request.headers);
  if (!identity) return json({ error: "Solicitud no autorizada." }, 401);

  try {
    const { findActiveAppUser, findOwnedCaseSession } = await import("@/lib/db");
    const account = await findActiveAppUser(identity.userId);
    if (!account) return json({ error: "Solicitud no autorizada." }, 403);

    const storedSession = await findOwnedCaseSession(account);
    if (!storedSession) {
      return json({ account: { displayName: account.displayName }, session: null });
    }
    if (storedSession.keyVersion !== 1) {
      return json({ error: "No fue posible recuperar la sesión." }, 500);
    }

    const snapshot = await decryptCaseSessionSnapshot(
      { ciphertext: storedSession.ciphertext, iv: storedSession.iv },
      account.id,
      encryptionKey(),
    );
    return json({
      account: { displayName: account.displayName },
      session: { snapshot, revision: storedSession.revision },
    });
  } catch {
    return json({ error: "El servicio no está disponible temporalmente." }, 503);
  }
}

export async function PUT(request: Request) {
  if (!hasAllowedMutationOrigin(request)) {
    return json({ error: "Solicitud no autorizada." }, 403);
  }

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return json({ error: "Solicitud inválida." }, 415);
  }

  const identity = getChatGPTUserFromHeaders(request.headers);
  if (!identity) return json({ error: "Solicitud no autorizada." }, 401);

  let body: unknown;
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SESSION_REQUEST_BYTES) {
      return json({ error: "La sesión supera el tamaño permitido." }, 413);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_SESSION_REQUEST_BYTES) {
      return json({ error: "La sesión supera el tamaño permitido." }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const parsed = putSessionSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Solicitud inválida." }, 400);

  try {
    const account = await authorizedAccount(request);
    if (!account) return json({ error: "Solicitud no autorizada." }, 403);
    const { createOwnedCaseSession, updateOwnedCaseSession } = await import("@/lib/db");
    const snapshot = parseCaseSessionSnapshot(parsed.data.snapshot);
    const encrypted = await encryptCaseSessionSnapshot(
      snapshot,
      account.id,
      encryptionKey(),
    );

    const saved =
      parsed.data.expectedRevision === 0
        ? await createOwnedCaseSession({ user: account, ...encrypted })
        : await updateOwnedCaseSession({
            user: account,
            ...encrypted,
            expectedRevision: parsed.data.expectedRevision,
          });
    if (!saved) {
      return json(
        { error: "La sesión cambió en otra pestaña. Recárgala antes de volver a guardar." },
        409,
      );
    }

    return json({ revision: parsed.data.expectedRevision + 1 });
  } catch (error) {
    if (error instanceof RangeError) {
      return json({ error: "La sesión supera el tamaño permitido." }, 413);
    }
    return json({ error: "El servicio no está disponible temporalmente." }, 503);
  }
}
