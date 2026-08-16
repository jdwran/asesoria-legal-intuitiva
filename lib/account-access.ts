const encoder = new TextEncoder();

export const REGISTRATION_GATE_COOKIE = "ol_registration_gate";
export const REGISTRATION_GATE_TTL_SECONDS = 30 * 60;
export const MIN_REGISTRATION_TOKEN_LENGTH = 32;
const MAX_REGISTRATION_TOKEN_LENGTH = 512;
const GATE_VERSION = "v1";
const GATE_PURPOSE = "orientador-legal:registration-gate";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return toBase64Url(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function signGatePayload(payload: string, registrationToken: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(registrationToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${GATE_PURPOSE}:${payload}`)),
  );
}

function hasValidTokenShape(value: string | undefined): value is string {
  return Boolean(
    value &&
      value.length >= MIN_REGISTRATION_TOKEN_LENGTH &&
      value.length <= MAX_REGISTRATION_TOKEN_LENGTH,
  );
}

export async function isValidRegistrationToken(
  candidate: string,
  configuredToken: string | undefined,
): Promise<boolean> {
  if (!hasValidTokenShape(candidate) || !hasValidTokenShape(configuredToken)) return false;

  const [candidateHash, configuredHash] = await Promise.all([
    sha256(candidate),
    sha256(configuredToken),
  ]);
  return constantTimeEqual(candidateHash, configuredHash);
}

export async function createRegistrationGate(
  registrationToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  if (!hasValidTokenShape(registrationToken)) {
    throw new Error("Registration token is not configured safely.");
  }

  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const payload = `${GATE_VERSION}.${nowSeconds + REGISTRATION_GATE_TTL_SECONDS}.${toBase64Url(nonce)}`;
  const signature = await signGatePayload(payload, registrationToken);
  return `${payload}.${toBase64Url(signature)}`;
}

export async function isValidRegistrationGate(
  gate: string | undefined,
  registrationToken: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!gate || !hasValidTokenShape(registrationToken)) return false;

  const parts = gate.split(".");
  if (parts.length !== 4 || parts[0] !== GATE_VERSION) return false;
  const [, rawExpiresAt, nonce, rawSignature] = parts;
  if (!/^\d{10}$/.test(rawExpiresAt) || !fromBase64Url(nonce)) return false;

  const expiresAt = Number(rawExpiresAt);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= nowSeconds ||
    expiresAt > nowSeconds + REGISTRATION_GATE_TTL_SECONDS
  ) {
    return false;
  }

  const signature = fromBase64Url(rawSignature);
  if (!signature) return false;
  const expected = await signGatePayload(`${GATE_VERSION}.${rawExpiresAt}.${nonce}`, registrationToken);
  return constantTimeEqual(signature, expected);
}

export function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() !== name) continue;
    const value = entry.slice(separator + 1).trim();
    return value || undefined;
  }
  return undefined;
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function hasAllowedMutationOrigin(request: Request): boolean {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return false;

  let requestUrl: URL;
  let origin: URL;
  try {
    requestUrl = new URL(request.url);
    origin = new URL(rawOrigin);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) return false;

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? request.headers.get("host")?.trim() ?? requestUrl.host;
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProtocol ? `${forwardedProtocol.replace(/:$/, "")}:` : requestUrl.protocol;
  if (!['http:', 'https:'].includes(protocol)) return false;

  try {
    const expected = new URL(`${protocol}//${host}`);
    if (expected.username || expected.password) return false;
    return origin.origin === expected.origin;
  } catch {
    return false;
  }
}
