import { hasAllowedMutationOrigin } from "@/lib/account-access";
import {
  authorizedCaseFileAccount,
  caseFileEncryptionKey,
  caseFileJson,
  publicStoredCaseFile,
} from "@/lib/case-file-api";
import { encryptCaseFile } from "@/lib/case-file-crypto";
import {
  inspectCaseFile,
  isCaseFilePieceType,
  MAX_CASE_FILES_PER_ACCOUNT,
  MAX_CASE_FILE_STORAGE_BYTES,
  type CaseFileMetadata,
} from "@/lib/case-file";
import { MAX_CASE_FILE_SIZE_BYTES } from "@/lib/case-file-classification";
const MAX_UPLOAD_REQUEST_BYTES = MAX_CASE_FILE_SIZE_BYTES + 512 * 1024;

export async function GET(request: Request) {
  try {
    const account = await authorizedCaseFileAccount(request);
    if (!account) return caseFileJson({ error: "Solicitud no autorizada." }, 403);
    const { listOwnedCaseFiles } = await import("@/lib/db");
    const records = await listOwnedCaseFiles(account);
    const files = await Promise.all(records.map((record) => publicStoredCaseFile(record, account)));
    return caseFileJson({ files });
  } catch {
    return caseFileJson({ error: "No fue posible recuperar los documentos." }, 503);
  }
}

export async function POST(request: Request) {
  if (!hasAllowedMutationOrigin(request)) {
    return caseFileJson({ error: "Solicitud no autorizada." }, 403);
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data;")) {
    return caseFileJson({ error: "Solicitud inválida." }, 415);
  }
  const contentLength = request.headers.get("content-length")?.trim() ?? "";
  if (!/^\d+$/u.test(contentLength)) {
    return caseFileJson({ error: "La solicitud debe indicar un tamaño válido." }, 411);
  }
  const declaredLength = Number(contentLength);
  if (!Number.isSafeInteger(declaredLength) || declaredLength <= 0) {
    return caseFileJson({ error: "La solicitud debe indicar un tamaño válido." }, 411);
  }
  if (declaredLength > MAX_UPLOAD_REQUEST_BYTES) {
    return caseFileJson({ error: "El archivo supera el tamaño permitido." }, 413);
  }

  const account = await authorizedCaseFileAccount(request);
  if (!account) return caseFileJson({ error: "Activa el guardado cifrado para cargar documentos." }, 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return caseFileJson({ error: "No fue posible leer el archivo." }, 400);
  }

  const fileValue = formData.get("file");
  const pieceType = formData.get("pieceType");
  const consent = formData.get("storageConsent");
  const lastModifiedValue = formData.get("lastModified");
  if (
    !(fileValue instanceof File) ||
    typeof pieceType !== "string" ||
    !isCaseFilePieceType(pieceType) ||
    consent !== "true" ||
    typeof lastModifiedValue !== "string"
  ) {
    return caseFileJson({ error: "Revisa el archivo, su clasificación y la autorización." }, 400);
  }

  const lastModified = Number(lastModifiedValue);
  if (!Number.isFinite(lastModified) || lastModified < 0) {
    return caseFileJson({ error: "La fecha del archivo no es válida." }, 400);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await fileValue.arrayBuffer());
  } catch {
    return caseFileJson({ error: "No fue posible leer el archivo." }, 400);
  }
  const inspection = inspectCaseFile(fileValue.name, fileValue.type, bytes);
  if (!inspection) {
    return caseFileJson({ error: "El formato o el contenido del archivo no está permitido." }, 415);
  }

  const fileId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const metadata: CaseFileMetadata = {
    version: 1,
    fileName: fileValue.name.trim(),
    mimeType: inspection.mimeType,
    sizeBytes: bytes.byteLength,
    lastModified,
    pieceType,
    createdAt,
  };

  const {
    createPendingOwnedCaseFile,
    deletePendingOwnedCaseFileRecord,
    markOwnedCaseFileReady,
  } = await import("@/lib/db");
  const {
    caseFileObjectKey,
    deleteEncryptedCaseFile,
    putEncryptedCaseFile,
  } = await import("@/lib/case-file-storage");
  const objectKey = caseFileObjectKey(account.id, fileId);

  let recordCreated = false;
  try {
    const encrypted = await encryptCaseFile(
      bytes,
      metadata,
      account.id,
      fileId,
      caseFileEncryptionKey(),
    );
    recordCreated = await createPendingOwnedCaseFile({
      user: account,
      id: fileId,
      objectKey,
      metadataCiphertext: encrypted.metadataCiphertext,
      metadataIv: encrypted.metadataIv,
      contentIv: encrypted.contentIv,
      sizeBytes: bytes.byteLength,
    });
    if (!recordCreated) {
      return caseFileJson(
        {
          error: `Alcanzaste el límite de ${MAX_CASE_FILES_PER_ACCOUNT} archivos o ${Math.round(MAX_CASE_FILE_STORAGE_BYTES / (1024 * 1024))} MB. Elimina documentos antes de continuar.`,
        },
        409,
      );
    }
    await putEncryptedCaseFile(objectKey, encrypted.content);
    if (!(await markOwnedCaseFileReady(account, fileId))) throw new Error("case_file_ready_failed");
    return caseFileJson({ file: { id: fileId, ...metadata } }, 201);
  } catch {
    if (recordCreated) {
      try {
        await deleteEncryptedCaseFile(objectKey);
        await deletePendingOwnedCaseFileRecord(account, fileId);
      } catch {
        // Preserve the pending row so a later case purge can retry removing the object.
      }
    }
    return caseFileJson({ error: "No fue posible guardar el archivo de forma segura." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!hasAllowedMutationOrigin(request)) {
    return caseFileJson({ error: "Solicitud no autorizada." }, 403);
  }
  const account = await authorizedCaseFileAccount(request);
  if (!account) return caseFileJson({ error: "Solicitud no autorizada." }, 403);

  const {
    deleteDiscardingOwnedCaseFileRecord,
    finalizeOwnedCaseFileDeletion,
    listOwnedCaseFilesForDeletion,
    listOwnedPendingCaseFiles,
    markOwnedPendingCaseFileDiscarding,
    markOwnedCaseFileDeleting,
    restoreOwnedCaseFileReady,
  } = await import("@/lib/db");
  const { deleteEncryptedCaseFile } = await import("@/lib/case-file-storage");
  const records = await listOwnedCaseFilesForDeletion(account);
  const pendingRecords = await listOwnedPendingCaseFiles(account);
  let deleted = 0;
  let failed = 0;

  for (const record of records) {
    const deleting = await markOwnedCaseFileDeleting(account, record.id);
    if (!deleting) continue;
    let objectDeleted = false;
    try {
      await deleteEncryptedCaseFile(deleting.objectKey);
      objectDeleted = true;
      if (!(await finalizeOwnedCaseFileDeletion(account, deleting.id))) {
        throw new Error("delete_failed");
      }
      deleted += 1;
    } catch {
      if (!objectDeleted) await restoreOwnedCaseFileReady(account, deleting.id).catch(() => undefined);
      failed += 1;
    }
  }

  for (const record of pendingRecords) {
    try {
      const discarding = await markOwnedPendingCaseFileDiscarding(account, record.id);
      if (!discarding) continue;
      await deleteEncryptedCaseFile(discarding.objectKey);
      if (!(await deleteDiscardingOwnedCaseFileRecord(account, discarding.id))) {
        throw new Error("discard_failed");
      }
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return caseFileJson(
    failed > 0
      ? { error: "No fue posible eliminar todos los documentos.", deleted, failed }
      : { deleted },
    failed > 0 ? 503 : 200,
  );
}
