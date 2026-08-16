import type { CaseElementType } from "./legal-data";
import { isAcceptedCaseFile, MAX_CASE_FILE_SIZE_BYTES } from "./case-file-classification.ts";

export const CASE_FILE_PIECE_TYPES = [
  "hechos",
  "personas",
  "pruebas",
  "fechas",
  "normas",
  "documentos",
] as const satisfies readonly CaseElementType[];

export const MAX_CASE_FILES_PER_ACCOUNT = 100;
export const MAX_CASE_FILE_STORAGE_BYTES = 250 * 1024 * 1024;

export type CaseFileMetadata = {
  version: 1;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  lastModified: number;
  pieceType: CaseElementType;
  createdAt: string;
};

export type StoredCaseFile = CaseFileMetadata & {
  id: string;
};

export function parseStoredCaseFile(value: unknown): StoredCaseFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid stored case file.");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !/^[a-f0-9-]{36}$/iu.test(record.id)) {
    throw new Error("Invalid stored case file id.");
  }
  const metadata = parseCaseFileMetadata({
    version: record.version,
    fileName: record.fileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    lastModified: record.lastModified,
    pieceType: record.pieceType,
    createdAt: record.createdAt,
  });
  return { id: record.id, ...metadata };
}

export function isCaseFilePieceType(value: unknown): value is CaseElementType {
  return typeof value === "string" && (CASE_FILE_PIECE_TYPES as readonly string[]).includes(value);
}

export function parseCaseFileMetadata(value: unknown): CaseFileMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid case file metadata.");
  }

  const metadata = value as Record<string, unknown>;
  const keys = Object.keys(metadata).sort();
  const expectedKeys = [
    "createdAt",
    "fileName",
    "lastModified",
    "mimeType",
    "pieceType",
    "sizeBytes",
    "version",
  ].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error("Invalid case file metadata.");
  }

  if (metadata.version !== 1) throw new Error("Invalid case file metadata version.");
  if (typeof metadata.fileName !== "string" || !isSafeCaseFileName(metadata.fileName)) {
    throw new Error("Invalid case file name.");
  }
  if (typeof metadata.mimeType !== "string" || metadata.mimeType.length > 160) {
    throw new Error("Invalid case file MIME type.");
  }
  if (
    typeof metadata.sizeBytes !== "number" ||
    !Number.isInteger(metadata.sizeBytes) ||
    metadata.sizeBytes < 1 ||
    metadata.sizeBytes > MAX_CASE_FILE_SIZE_BYTES
  ) {
    throw new Error("Invalid case file size.");
  }
  if (
    typeof metadata.lastModified !== "number" ||
    !Number.isFinite(metadata.lastModified) ||
    metadata.lastModified < 0
  ) {
    throw new Error("Invalid case file timestamp.");
  }
  if (!isCaseFilePieceType(metadata.pieceType)) throw new Error("Invalid case file piece type.");
  if (
    typeof metadata.createdAt !== "string" ||
    !Number.isFinite(Date.parse(metadata.createdAt)) ||
    metadata.createdAt.length > 40
  ) {
    throw new Error("Invalid case file creation date.");
  }

  return metadata as CaseFileMetadata;
}

export function isSafeCaseFileName(value: string) {
  const name = value.trim();
  return (
    name.length > 0 &&
    name.length <= 255 &&
    !/[\u0000-\u001f\u007f]/u.test(name) &&
    !/[\\/]/u.test(name)
  );
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function inspectCaseFile(
  fileName: string,
  declaredMimeType: string,
  bytes: Uint8Array,
): { mimeType: string } | null {
  if (!isSafeCaseFileName(fileName) || bytes.byteLength < 1 || bytes.byteLength > MAX_CASE_FILE_SIZE_BYTES) {
    return null;
  }
  if (!isAcceptedCaseFile({ name: fileName, type: declaredMimeType })) return null;

  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (extension === ".pdf" && startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mimeType: "application/pdf" };
  }
  if (
    (extension === ".jpg" || extension === ".jpeg") &&
    startsWith(bytes, [0xff, 0xd8, 0xff])
  ) {
    return { mimeType: "image/jpeg" };
  }
  if (
    extension === ".png" &&
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { mimeType: "image/png" };
  }
  if (
    extension === ".webp" &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mimeType: "image/webp" };
  }
  if (extension === ".docx" && startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const archiveIndex = new TextDecoder("utf-8").decode(bytes);
    if (archiveIndex.includes("[Content_Types].xml") && archiveIndex.includes("word/")) {
      return { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    }
    return null;
  }
  if (extension === ".txt") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\u0000")) return null;
      return { mimeType: "text/plain" };
    } catch {
      return null;
    }
  }

  return null;
}

export function safeCaseFileDownloadName(fileName: string) {
  const sanitized = fileName.replace(/[\u0000-\u001f\u007f"\\/]/gu, "_").trim();
  return sanitized.slice(0, 255) || "documento";
}

export function formatCaseFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
