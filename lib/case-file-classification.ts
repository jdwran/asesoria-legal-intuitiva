import type { CaseElementType } from "./legal-data";

export const MAX_CASE_FILES_PER_BATCH = 20;
export const MAX_CASE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_CASE_BATCH_SIZE_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_CASE_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export type CaseFileDescriptor = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
};

export type CaseFileRejectionReason =
  | "empty-file"
  | "file-too-large"
  | "unsupported-type"
  | "duplicate-file"
  | "batch-file-limit"
  | "batch-size-limit";

export function caseFileKey(file: CaseFileDescriptor) {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

function extensionOf(name: string) {
  const normalized = name.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  return index >= 0 ? normalized.slice(index) : "";
}

export function isAcceptedCaseFile(file: Pick<CaseFileDescriptor, "name" | "type">) {
  const extension = extensionOf(file.name);
  if (!(ACCEPTED_CASE_FILE_EXTENSIONS as readonly string[]).includes(extension)) return false;

  const mimeType = file.type.trim().toLowerCase();
  if (!mimeType || mimeType === "application/octet-stream") return true;

  const mimeTypesByExtension: Record<string, readonly string[]> = {
    ".pdf": ["application/pdf"],
    ".docx": [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
    ".txt": ["text/plain"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".webp": ["image/webp"],
  };

  return mimeTypesByExtension[extension]?.includes(mimeType) ?? false;
}

export function classifyCaseFile(
  file: Pick<CaseFileDescriptor, "name" | "type">,
): CaseElementType {
  const normalizedName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const evidenceName =
    /(?:^|[\s._-])(captura|chat|conversacion|comprobante|recibo|foto|imagen|evidencia|prueba)(?:[\s._-]|$)/u.test(
      normalizedName,
    );
  const visualEvidence = file.type.trim().toLowerCase().startsWith("image/");

  return evidenceName || visualEvidence ? "pruebas" : "documentos";
}

export function validateCaseFileBatch<T extends CaseFileDescriptor>(files: readonly T[]) {
  const accepted: T[] = [];
  const rejected: Array<{ file: T; reason: CaseFileRejectionReason }> = [];
  const seen = new Set<string>();
  let acceptedBytes = 0;

  for (const file of files) {
    if (file.size <= 0) {
      rejected.push({ file, reason: "empty-file" });
      continue;
    }
    if (file.size > MAX_CASE_FILE_SIZE_BYTES) {
      rejected.push({ file, reason: "file-too-large" });
      continue;
    }
    if (!isAcceptedCaseFile(file)) {
      rejected.push({ file, reason: "unsupported-type" });
      continue;
    }

    const key = caseFileKey(file);
    if (seen.has(key)) {
      rejected.push({ file, reason: "duplicate-file" });
      continue;
    }
    seen.add(key);

    if (accepted.length >= MAX_CASE_FILES_PER_BATCH) {
      rejected.push({ file, reason: "batch-file-limit" });
      continue;
    }
    if (acceptedBytes + file.size > MAX_CASE_BATCH_SIZE_BYTES) {
      rejected.push({ file, reason: "batch-size-limit" });
      continue;
    }

    accepted.push(file);
    acceptedBytes += file.size;
  }

  return { accepted, rejected };
}
