import { hasAllowedMutationOrigin } from "@/lib/account-access";
import {
  authorizedCaseFileAccount,
  caseFileEncryptionKey,
  caseFileJson,
  publicStoredCaseFile,
} from "@/lib/case-file-api";
import { encryptCaseFileMetadata } from "@/lib/case-file-crypto";
import { isCaseFilePieceType, type CaseFileMetadata } from "@/lib/case-file";

const MAX_CLASSIFICATION_REQUEST_BYTES = 1_024;

function validFileId(id: string) {
  return /^[a-zA-Z0-9-]{1,160}$/u.test(id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasAllowedMutationOrigin(request)) {
    return caseFileJson({ error: "Solicitud no autorizada." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return caseFileJson({ error: "Solicitud inválida." }, 415);
  }
  const { id } = await context.params;
  if (!validFileId(id)) return caseFileJson({ error: "Documento no encontrado." }, 404);

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_CLASSIFICATION_REQUEST_BYTES) {
      return caseFileJson({ error: "Solicitud inválida." }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return caseFileJson({ error: "Solicitud inválida." }, 400);
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !isCaseFilePieceType((body as { pieceType?: unknown }).pieceType)
  ) {
    return caseFileJson({ error: "Clasificación inválida." }, 400);
  }

  const account = await authorizedCaseFileAccount(request);
  if (!account) return caseFileJson({ error: "Solicitud no autorizada." }, 403);
  const { findOwnedCaseFile, updateOwnedCaseFileMetadata } = await import("@/lib/db");
  const record = await findOwnedCaseFile(account, id);
  if (!record) return caseFileJson({ error: "Documento no encontrado." }, 404);

  try {
    const stored = await publicStoredCaseFile(record, account);
    const metadata: CaseFileMetadata = {
      version: stored.version,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      lastModified: stored.lastModified,
      pieceType: (body as { pieceType: typeof stored.pieceType }).pieceType,
      createdAt: stored.createdAt,
    };
    const encrypted = await encryptCaseFileMetadata(
      metadata,
      account.id,
      id,
      caseFileEncryptionKey(),
    );
    const updated = await updateOwnedCaseFileMetadata({
      user: account,
      id,
      ...encrypted,
    });
    if (!updated) return caseFileJson({ error: "Documento no encontrado." }, 404);
    return caseFileJson({ file: { ...stored, pieceType: metadata.pieceType } });
  } catch {
    return caseFileJson({ error: "No fue posible cambiar la clasificación." }, 503);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasAllowedMutationOrigin(request)) {
    return caseFileJson({ error: "Solicitud no autorizada." }, 403);
  }
  const { id } = await context.params;
  if (!validFileId(id)) return caseFileJson({ error: "Documento no encontrado." }, 404);
  const account = await authorizedCaseFileAccount(request);
  if (!account) return caseFileJson({ error: "Solicitud no autorizada." }, 403);

  const {
    finalizeOwnedCaseFileDeletion,
    markOwnedCaseFileDeleting,
    restoreOwnedCaseFileReady,
  } = await import("@/lib/db");
  const { deleteEncryptedCaseFile } = await import("@/lib/case-file-storage");
  const record = await markOwnedCaseFileDeleting(account, id);
  if (!record) return caseFileJson({ error: "Documento no encontrado." }, 404);

  let objectDeleted = false;
  try {
    await deleteEncryptedCaseFile(record.objectKey);
    objectDeleted = true;
    if (!(await finalizeOwnedCaseFileDeletion(account, id))) {
      throw new Error("delete_failed");
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    if (!objectDeleted) await restoreOwnedCaseFileReady(account, id).catch(() => undefined);
    return caseFileJson({ error: "No fue posible eliminar el documento." }, 503);
  }
}
