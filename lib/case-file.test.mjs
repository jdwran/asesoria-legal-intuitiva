import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectCaseFile,
  parseCaseFileMetadata,
  parseStoredCaseFile,
  safeCaseFileDownloadName,
} from "./case-file.ts";

const encoder = new TextEncoder();

test("valida la firma del formato y no confía solo en nombre o MIME", () => {
  assert.deepEqual(
    inspectCaseFile("soporte.pdf", "application/pdf", encoder.encode("%PDF-1.7\ncontenido")),
    { mimeType: "application/pdf" },
  );
  assert.equal(
    inspectCaseFile("soporte.pdf", "application/pdf", encoder.encode("esto no es un PDF")),
    null,
  );
  assert.equal(
    inspectCaseFile("programa.exe", "application/pdf", encoder.encode("%PDF-1.7")),
    null,
  );
});

test("acepta imágenes firmadas, texto UTF-8 y un contenedor DOCX reconocible", () => {
  const fixtures = [
    ["foto.jpg", "image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"],
    [
      "captura.png",
      "image/png",
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
    ],
    [
      "imagen.webp",
      "image/webp",
      Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      "image/webp",
    ],
    ["relato.txt", "text/plain", encoder.encode("Relato válido"), "text/plain"],
    [
      "solicitud.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Uint8Array.from([
        0x50, 0x4b, 0x03, 0x04,
        ...encoder.encode("[Content_Types].xml word/document.xml"),
      ]),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  ];

  for (const [name, type, bytes, expectedType] of fixtures) {
    assert.deepEqual(inspectCaseFile(name, type, bytes), { mimeType: expectedType }, name);
  }
});

test("rechaza rutas, texto binario y nombres peligrosos para descarga", () => {
  assert.equal(inspectCaseFile("../secreto.txt", "text/plain", encoder.encode("texto")), null);
  assert.equal(inspectCaseFile("binario.txt", "text/plain", Uint8Array.from([0, 1, 2])), null);
  assert.equal(safeCaseFileDownloadName('reporte\"/final.pdf'), "reporte__final.pdf");
});

test("metadatos cifrables y respuesta pública tienen forma estricta", () => {
  const metadata = {
    version: 1,
    fileName: "orden-medica.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    lastModified: 1_723_680_000_000,
    pieceType: "pruebas",
    createdAt: "2026-08-16T04:00:00.000Z",
  };
  assert.deepEqual(parseCaseFileMetadata(metadata), metadata);
  assert.deepEqual(
    parseStoredCaseFile({ id: "00000000-0000-4000-8000-000000000001", ...metadata }),
    { id: "00000000-0000-4000-8000-000000000001", ...metadata },
  );
  assert.throws(() => parseCaseFileMetadata({ ...metadata, unexpected: true }));
  assert.throws(() => parseCaseFileMetadata({ ...metadata, pieceType: "fuente-verificada" }));
});
