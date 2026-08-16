import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptCaseSessionSnapshot,
  encodeBase64Url,
  encryptCaseSessionSnapshot,
  parseCaseDataEncryptionKey,
} from "./case-crypto.ts";
import { sessionFixture } from "./case-session.fixture.ts";

test("la clave configurada debe contener exactamente 32 bytes base64url", () => {
  const valid = encodeBase64Url(new Uint8Array(32).fill(7));
  assert.equal(parseCaseDataEncryptionKey(valid).byteLength, 32);
  assert.throws(() => parseCaseDataEncryptionKey(encodeBase64Url(new Uint8Array(31))));
  assert.throws(() => parseCaseDataEncryptionKey("no-es-base64url="));
});

test("AES-256-GCM recupera un snapshot válido para su dueño", async () => {
  const snapshot = sessionFixture();
  const key = new Uint8Array(32).fill(11);
  const encrypted = await encryptCaseSessionSnapshot(snapshot, "user-1", key);
  assert.notEqual(encrypted.ciphertext, JSON.stringify(snapshot));
  assert.deepEqual(
    await decryptCaseSessionSnapshot(encrypted, "user-1", key),
    snapshot,
  );
});

test("el AAD impide descifrar la sesión con otro usuario", async () => {
  const snapshot = sessionFixture();
  const key = new Uint8Array(32).fill(19);
  const encrypted = await encryptCaseSessionSnapshot(snapshot, "user-owner", key);
  await assert.rejects(() => decryptCaseSessionSnapshot(encrypted, "user-attacker", key));
});
