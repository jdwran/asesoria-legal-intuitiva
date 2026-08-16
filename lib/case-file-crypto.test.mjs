import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptCaseFileContent,
  decryptCaseFileMetadata,
  encryptCaseFile,
  encryptCaseFileMetadata,
} from "./case-file-crypto.ts";

const metadata = {
  version: 1,
  fileName: "contrato.pdf",
  mimeType: "application/pdf",
  sizeBytes: 18,
  lastModified: 1_723_680_000_000,
  pieceType: "documentos",
  createdAt: "2026-08-16T04:00:00.000Z",
};

test("cifra bytes y nombre con contexto separado y los recupera para su dueño", async () => {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const content = new TextEncoder().encode("contenido sensible");
  const encrypted = await encryptCaseFile(content, metadata, "user-1", "file-1", key);

  assert.notDeepEqual(encrypted.content, content);
  assert.doesNotMatch(encrypted.metadataCiphertext, /contrato/u);
  assert.deepEqual(
    await decryptCaseFileContent(encrypted.content, encrypted.contentIv, "user-1", "file-1", key),
    content,
  );
  assert.deepEqual(
    await decryptCaseFileMetadata(
      encrypted.metadataCiphertext,
      encrypted.metadataIv,
      "user-1",
      "file-1",
      key,
    ),
    metadata,
  );
});

test("AAD impide abrir contenido o metadatos con otro dueño o id", async () => {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const content = new TextEncoder().encode("contenido sensible");
  const encrypted = await encryptCaseFile(content, metadata, "user-owner", "file-1", key);

  await assert.rejects(() =>
    decryptCaseFileContent(encrypted.content, encrypted.contentIv, "user-attacker", "file-1", key),
  );
  await assert.rejects(() =>
    decryptCaseFileMetadata(
      encrypted.metadataCiphertext,
      encrypted.metadataIv,
      "user-owner",
      "file-2",
      key,
    ),
  );
});

test("reclasificar vuelve a cifrar solo los metadatos", async () => {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const reclassified = { ...metadata, pieceType: "pruebas" };
  const encrypted = await encryptCaseFileMetadata(reclassified, "user-1", "file-1", key);

  assert.deepEqual(
    await decryptCaseFileMetadata(
      encrypted.metadataCiphertext,
      encrypted.metadataIv,
      "user-1",
      "file-1",
      key,
    ),
    reclassified,
  );
});
