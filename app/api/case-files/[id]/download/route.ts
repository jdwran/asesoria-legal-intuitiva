import {
  authorizedCaseFileAccount,
  caseFileEncryptionKey,
  caseFileJson,
  publicStoredCaseFile,
} from "@/lib/case-file-api";
import { decryptCaseFileContent } from "@/lib/case-file-crypto";
import { safeCaseFileDownloadName } from "@/lib/case-file";

function validFileId(id: string) {
  return /^[a-zA-Z0-9-]{1,160}$/u.test(id);
}

function responseBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!validFileId(id)) return caseFileJson({ error: "Documento no encontrado." }, 404);
  const account = await authorizedCaseFileAccount(request);
  if (!account) return caseFileJson({ error: "Solicitud no autorizada." }, 403);

  try {
    const { findOwnedCaseFile } = await import("@/lib/db");
    const { getEncryptedCaseFile } = await import("@/lib/case-file-storage");
    const record = await findOwnedCaseFile(account, id);
    if (!record) return caseFileJson({ error: "Documento no encontrado." }, 404);
    const encrypted = await getEncryptedCaseFile(record.objectKey);
    if (!encrypted) return caseFileJson({ error: "Documento no encontrado." }, 404);
    const rawKey = caseFileEncryptionKey();
    const [metadata, content] = await Promise.all([
      publicStoredCaseFile(record, account, rawKey),
      decryptCaseFileContent(encrypted, record.contentIv, account.id, id, rawKey),
    ]);
    if (content.byteLength !== metadata.sizeBytes) throw new Error("case_file_size_mismatch");

    const safeName = safeCaseFileDownloadName(metadata.fileName);
    const encodedName = encodeURIComponent(safeName).replace(
      /[!'()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(responseBytes(content), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "Content-Type": metadata.mimeType,
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `attachment; filename="${safeName.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodedName}`,
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return caseFileJson({ error: "No fue posible descargar el documento." }, 503);
  }
}
