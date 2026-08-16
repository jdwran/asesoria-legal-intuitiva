import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_CASE_BATCH_SIZE_BYTES,
  MAX_CASE_FILE_SIZE_BYTES,
  MAX_CASE_FILES_PER_BATCH,
  classifyCaseFile,
  validateCaseFileBatch,
} from "./case-file-classification.ts";

const MIB = 1024 * 1024;

function caseFile(name, overrides = {}) {
  return {
    name,
    type: "application/pdf",
    size: 128_000,
    lastModified: 1_723_680_000_000,
    ...overrides,
  };
}

test("los límites del cliente permiten un lote amplio sin retener archivos excesivos", () => {
  assert.equal(MAX_CASE_FILES_PER_BATCH, 20);
  assert.equal(MAX_CASE_FILE_SIZE_BYTES, 10 * MIB);
  assert.equal(MAX_CASE_BATCH_SIZE_BYTES, 50 * MIB);
});

test("sugiere pruebas para evidencia visual y para nombres probatorios", () => {
  const fixtures = [
    caseFile("foto-del-inmueble.jpg", { type: "image/jpeg" }),
    caseFile("captura-whatsapp.pdf"),
    caseFile("comprobante-de-pago.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    caseFile("RECIBO_NOMINA.PNG", { type: "image/png" }),
  ];

  for (const file of fixtures) {
    assert.equal(classifyCaseFile(file), "pruebas", file.name);
  }
});

test("sugiere documentos para piezas formales y para archivos sin señal probatoria", () => {
  const fixtures = [
    caseFile("contrato-arrendamiento.pdf"),
    caseFile("respuesta-de-la-eps.txt", { type: "text/plain" }),
    caseFile("sentencia-t-760.pdf"),
    caseFile("archivo-sin-descripcion.pdf", { type: "" }),
  ];

  for (const file of fixtures) {
    assert.equal(classifyCaseFile(file), "documentos", file.name);
  }
});

test("la clasificación inicial no presenta un archivo del usuario como fuente oficial verificada", () => {
  for (const name of ["ley-1755.pdf", "codigo-sustantivo-del-trabajo.pdf", "jurisprudencia.docx"]) {
    const type = name.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";

    assert.equal(classifyCaseFile(caseFile(name, { type })), "documentos", name);
    assert.notEqual(classifyCaseFile(caseFile(name, { type })), "normas", name);
  }
});

test("acepta en orden los formatos previstos incluso cuando el navegador omite el MIME", () => {
  const files = [
    caseFile("acto.pdf", { type: "application/pdf" }),
    caseFile("solicitud.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    caseFile("relato.txt", { type: "text/plain" }),
    caseFile("foto.jpg", { type: "image/jpeg" }),
    caseFile("captura.jpeg", { type: "" }),
    caseFile("soporte.png", { type: "image/png" }),
    caseFile("evidencia.webp", { type: "image/webp" }),
  ];
  const snapshot = structuredClone(files);

  const result = validateCaseFileBatch(files);

  assert.deepEqual(result.accepted, files);
  assert.deepEqual(result.rejected, []);
  assert.deepEqual(files, snapshot, "la validación debe ser pura");
});

test("rechaza archivos vacíos, demasiado grandes, ejecutables y Word legado de forma individual", () => {
  const valid = caseFile("contrato.pdf");
  const empty = caseFile("vacio.pdf", { size: 0 });
  const tooLarge = caseFile("expediente.pdf", { size: MAX_CASE_FILE_SIZE_BYTES + 1 });
  const executable = caseFile("soporte.exe", { type: "application/x-msdownload" });
  const disguised = caseFile("soporte.exe", { type: "application/pdf" });
  const legacyWord = caseFile("contrato.doc", { type: "application/msword" });

  const result = validateCaseFileBatch([valid, empty, tooLarge, executable, disguised, legacyWord]);

  assert.deepEqual(result.accepted, [valid]);
  assert.deepEqual(
    result.rejected.map(({ file, reason }) => [file.name, reason]),
    [
      ["vacio.pdf", "empty-file"],
      ["expediente.pdf", "file-too-large"],
      ["soporte.exe", "unsupported-type"],
      ["soporte.exe", "unsupported-type"],
      ["contrato.doc", "unsupported-type"],
    ],
  );
});

test("omite duplicados exactos sin invalidar los demás archivos del lote", () => {
  const original = caseFile("orden-medica.pdf");
  const duplicate = { ...original };
  const sameNameButDifferentFile = caseFile("orden-medica.pdf", {
    size: original.size + 1,
    lastModified: original.lastModified + 1,
  });

  const result = validateCaseFileBatch([original, duplicate, sameNameButDifferentFile]);

  assert.deepEqual(result.accepted, [original, sameNameButDifferentFile]);
  assert.deepEqual(
    result.rejected.map(({ file, reason }) => [file, reason]),
    [[duplicate, "duplicate-file"]],
  );
});

test("respeta tanto el máximo de archivos como el peso acumulado y conserva resultados parciales", () => {
  const countLimited = Array.from({ length: MAX_CASE_FILES_PER_BATCH + 2 }, (_, index) =>
    caseFile(`documento-${index + 1}.pdf`, { lastModified: index + 1 }),
  );
  const countResult = validateCaseFileBatch(countLimited);

  assert.equal(countResult.accepted.length, MAX_CASE_FILES_PER_BATCH);
  assert.deepEqual(
    countResult.rejected.map(({ reason }) => reason),
    ["batch-file-limit", "batch-file-limit"],
  );

  const sizeLimited = Array.from({ length: 6 }, (_, index) =>
    caseFile(`anexo-${index + 1}.pdf`, {
      size: 10 * MIB,
      lastModified: index + 1,
    }),
  );
  const sizeResult = validateCaseFileBatch(sizeLimited);

  assert.equal(sizeResult.accepted.length, 5);
  assert.deepEqual(
    sizeResult.rejected.map(({ reason }) => reason),
    ["batch-size-limit"],
  );
});
