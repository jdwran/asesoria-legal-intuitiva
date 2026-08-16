import { decodeBase64Url, encodeBase64Url } from "./case-crypto.ts";
import { parseCaseFileMetadata, type CaseFileMetadata } from "./case-file.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const FILE_KEY_CONTEXT = "orientador-legal:case-file:v1";
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BITS = 128;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function validateIdentity(userId: string, fileId: string) {
  if (!userId || userId.length > 512 || !fileId || fileId.length > 160) {
    throw new Error("Invalid case file encryption identity.");
  }
}

async function deriveFileKey(rawKey: Uint8Array, usages: KeyUsage[]) {
  if (rawKey.byteLength !== 32) throw new Error("Invalid encryption key.");
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(rawKey),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toArrayBuffer(encoder.encode(FILE_KEY_CONTEXT)),
      info: toArrayBuffer(encoder.encode("aes-256-gcm")),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function additionalData(userId: string, fileId: string, kind: "content" | "metadata") {
  validateIdentity(userId, fileId);
  return encoder.encode(`${FILE_KEY_CONTEXT}:${kind}:${userId}:${fileId}`);
}

async function encryptBytes(
  plaintext: Uint8Array,
  userId: string,
  fileId: string,
  kind: "content" | "metadata",
  rawKey: Uint8Array,
) {
  const key = await deriveFileKey(rawKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(additionalData(userId, fileId, kind)),
      tagLength: AES_GCM_TAG_BITS,
    },
    key,
    toArrayBuffer(plaintext),
  );
  return { ciphertext: new Uint8Array(ciphertext), iv: encodeBase64Url(iv) };
}

async function decryptBytes(
  ciphertext: Uint8Array,
  ivValue: string,
  userId: string,
  fileId: string,
  kind: "content" | "metadata",
  rawKey: Uint8Array,
) {
  const iv = decodeBase64Url(ivValue);
  if (iv.byteLength !== AES_GCM_IV_BYTES) throw new Error("Invalid encryption nonce.");
  if (ciphertext.byteLength <= AES_GCM_TAG_BITS / 8) throw new Error("Invalid ciphertext.");
  const key = await deriveFileKey(rawKey, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(additionalData(userId, fileId, kind)),
      tagLength: AES_GCM_TAG_BITS,
    },
    key,
    toArrayBuffer(ciphertext),
  );
  return new Uint8Array(plaintext);
}

export async function encryptCaseFile(
  content: Uint8Array,
  metadata: CaseFileMetadata,
  userId: string,
  fileId: string,
  rawKey: Uint8Array,
) {
  const validatedMetadata = parseCaseFileMetadata(metadata);
  const [encryptedContent, encryptedMetadata] = await Promise.all([
    encryptBytes(content, userId, fileId, "content", rawKey),
    encryptBytes(
      encoder.encode(JSON.stringify(validatedMetadata)),
      userId,
      fileId,
      "metadata",
      rawKey,
    ),
  ]);
  return {
    content: encryptedContent.ciphertext,
    contentIv: encryptedContent.iv,
    metadataCiphertext: encodeBase64Url(encryptedMetadata.ciphertext),
    metadataIv: encryptedMetadata.iv,
  };
}

export async function encryptCaseFileMetadata(
  metadata: CaseFileMetadata,
  userId: string,
  fileId: string,
  rawKey: Uint8Array,
) {
  const validatedMetadata = parseCaseFileMetadata(metadata);
  const encrypted = await encryptBytes(
    encoder.encode(JSON.stringify(validatedMetadata)),
    userId,
    fileId,
    "metadata",
    rawKey,
  );
  return {
    metadataCiphertext: encodeBase64Url(encrypted.ciphertext),
    metadataIv: encrypted.iv,
  };
}

export async function decryptCaseFileMetadata(
  ciphertext: string,
  iv: string,
  userId: string,
  fileId: string,
  rawKey: Uint8Array,
) {
  const plaintext = await decryptBytes(
    decodeBase64Url(ciphertext),
    iv,
    userId,
    fileId,
    "metadata",
    rawKey,
  );
  return parseCaseFileMetadata(JSON.parse(decoder.decode(plaintext)));
}

export async function decryptCaseFileContent(
  ciphertext: Uint8Array,
  iv: string,
  userId: string,
  fileId: string,
  rawKey: Uint8Array,
) {
  return decryptBytes(ciphertext, iv, userId, fileId, "content", rawKey);
}
