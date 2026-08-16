import {
  parseCaseSessionSnapshot,
  type CaseSessionSnapshot,
} from "./case-session.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ENCRYPTION_CONTEXT = "orientador-legal:case-session:v1";
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BITS = 128;

export type EncryptedCaseSession = {
  ciphertext: string;
  iv: string;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64Url(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }

  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Invalid base64url value.");
  }
}

export function parseCaseDataEncryptionKey(value: string | undefined): Uint8Array {
  if (!value) throw new Error("Case data encryption key is not configured.");
  const key = decodeBase64Url(value);
  if (key.byteLength !== 32) {
    throw new Error("Case data encryption key must contain exactly 32 bytes.");
  }
  return key;
}

function additionalData(userId: string): Uint8Array {
  if (!userId || userId.length > 512) throw new Error("Invalid encryption owner.");
  return encoder.encode(`${ENCRYPTION_CONTEXT}:${userId}`);
}

async function importKey(rawKey: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toArrayBuffer(rawKey), { name: "AES-GCM" }, false, usages);
}

export async function encryptCaseSessionSnapshot(
  snapshot: CaseSessionSnapshot,
  userId: string,
  rawKey: Uint8Array,
): Promise<EncryptedCaseSession> {
  const validatedSnapshot = parseCaseSessionSnapshot(snapshot);
  if (rawKey.byteLength !== 32) throw new Error("Invalid encryption key.");

  const key = await importKey(rawKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const plaintext = encoder.encode(JSON.stringify(validatedSnapshot));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(additionalData(userId)),
      tagLength: AES_GCM_TAG_BITS,
    },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
    iv: encodeBase64Url(iv),
  };
}

export async function decryptCaseSessionSnapshot(
  encrypted: EncryptedCaseSession,
  userId: string,
  rawKey: Uint8Array,
): Promise<CaseSessionSnapshot> {
  if (rawKey.byteLength !== 32) throw new Error("Invalid encryption key.");
  const iv = decodeBase64Url(encrypted.iv);
  if (iv.byteLength !== AES_GCM_IV_BYTES) throw new Error("Invalid encryption nonce.");
  const ciphertext = decodeBase64Url(encrypted.ciphertext);
  if (ciphertext.byteLength <= AES_GCM_TAG_BITS / 8) throw new Error("Invalid ciphertext.");

  const key = await importKey(rawKey, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(additionalData(userId)),
      tagLength: AES_GCM_TAG_BITS,
    },
    key,
    toArrayBuffer(ciphertext),
  );

  return parseCaseSessionSnapshot(JSON.parse(decoder.decode(plaintext)));
}
