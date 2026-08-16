import { getChatGPTUserFromHeaders } from "@/app/chatgpt-auth";
import { parseCaseDataEncryptionKey } from "./case-crypto";
import type { AppUserRecord, StoredCaseFileRecord } from "./db";
import { decryptCaseFileMetadata } from "./case-file-crypto";
import type { StoredCaseFile } from "./case-file";

export function caseFileJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}

export async function authorizedCaseFileAccount(request: Request) {
  const identity = getChatGPTUserFromHeaders(request.headers);
  if (!identity) return null;
  const { findActiveAppUser } = await import("./db");
  return findActiveAppUser(identity.userId);
}

export function caseFileEncryptionKey() {
  return parseCaseDataEncryptionKey(process.env.CASE_DATA_ENCRYPTION_KEY);
}

export async function publicStoredCaseFile(
  record: StoredCaseFileRecord,
  user: AppUserRecord,
  rawKey = caseFileEncryptionKey(),
): Promise<StoredCaseFile> {
  if (record.keyVersion !== 1) throw new Error("Unsupported case file encryption version.");
  const metadata = await decryptCaseFileMetadata(
    record.metadataCiphertext,
    record.metadataIv,
    user.id,
    record.id,
    rawKey,
  );
  if (metadata.sizeBytes !== record.sizeBytes) throw new Error("Case file metadata mismatch.");
  return { id: record.id, ...metadata };
}
