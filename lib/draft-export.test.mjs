import assert from "node:assert/strict";
import test from "node:test";

import {
  composeDraftExport,
  getDraftExportFilename,
} from "./draft-export.ts";

const JURAMENTO_TUTELA =
  "Manifiesto bajo la gravedad de juramento que no he presentado otra acción de tutela por los mismos hechos y derechos ante ninguna otra autoridad.";

const draftText = `BORRADOR ORIGINAL

El 3 de agosto solicité la entrega del medicamento.
La EPS no ha dado una respuesta de fondo.`;

function exportInput(overrides = {}) {
  return {
    draftText,
    orientation: {
      caseTitle: "Demora en la entrega de un medicamento",
      extractedFacts: [
        "Existe una orden médica vigente.",
        "La solicitud fue radicada el 3 de agosto de 2026.",
      ],
      rightTitle: "Derecho fundamental a la salud",
      rightExplanation:
        "El acceso oportuno al servicio ordenado debe valorarse según las circunstancias concretas del caso.",
      nextSteps: [
        {
          title: "Solicitar una respuesta prioritaria",
          detail: "Pedir fecha, lugar y condiciones para la entrega del medicamento.",
        },
        {
          title: "Conservar el radicado",
          detail: "Guardar la constancia y las respuestas recibidas.",
        },
      ],
    },
    evidenceNames: ["Orden médica", "Constancia de radicación"],
    city: "Medellín",
    date: "20 de agosto de 2026",
    ...overrides,
  };
}

test("relato conserva el draftText byte por byte", () => {
  const input = exportInput();

  assert.equal(composeDraftExport("story", input), draftText);
});

test("derecho de petición y PQR son cartas distintas basadas en el mismo borrador", () => {
  const input = exportInput();
  const petition = composeDraftExport("petition", input);
  const pqr = composeDraftExport("pqr", input);

  assert.notEqual(petition, pqr);
  assert.match(petition, /DERECHO DE PETICI[ÓO]N/u);
  assert.match(pqr, /\bPQR\b/u);

  for (const content of [petition, pqr]) {
    assert.match(content, /Señores\s*\n\[ENTIDAD\]/u);
    assert.match(content, /Medellín, 20 de agosto de 2026/u);
    assert.match(content, /Referencia:/u);
    assert.match(content, /Demora en la entrega de un medicamento/u);
    assert.match(content, /HECHOS/u);
    assert.ok(content.includes(draftText), "la carta debe conservar el borrador completo");
    assert.match(content, /PETICI[ÓO]N CONCRETA/u);
    assert.match(content, /Solicitar una respuesta prioritaria/u);
    assert.match(content, /Pedir fecha, lugar y condiciones para la entrega del medicamento\./u);
    assert.match(content, /Ley 1755 de 2015/u);
    assert.match(content, /\[NOMBRE COMPLETO\]/u);
    assert.match(content, /\[C[ÉE]DULA\]/u);
    assert.match(content, /\[DIRECCI[ÓO]N DE NOTIFICACI[ÓO]N\]/u);
  }
});

test("acción de tutela usa hechos, derechos, pretensión, juramento exacto y anexos", () => {
  const tutela = composeDraftExport("tutela", exportInput());

  assert.match(tutela, /ACCI[ÓO]N DE TUTELA/u);
  assert.match(tutela, /Señor Juez \(Reparto\)/u);
  assert.match(tutela, /HECHOS/u);
  assert.match(tutela, /1\. Existe una orden médica vigente\./u);
  assert.match(tutela, /2\. La solicitud fue radicada el 3 de agosto de 2026\./u);
  assert.match(tutela, /DERECHOS FUNDAMENTALES INVOCADOS/u);
  assert.match(tutela, /Derecho fundamental a la salud/u);
  assert.match(
    tutela,
    /El acceso oportuno al servicio ordenado debe valorarse según las circunstancias concretas del caso\./u,
  );
  assert.match(tutela, /PRETENSI[ÓO]N/u);
  assert.match(tutela, /valorar la protección de Derecho fundamental a la salud/u);
  assert.match(tutela, /\[MEDIDA CONCRETA QUE SOLICITAS\]/u);
  assert.doesNotMatch(tutela, /Solicitar una respuesta prioritaria/u);
  assert.match(tutela, /JURAMENTO/u);
  assert.equal(tutela.split(JURAMENTO_TUTELA).length - 1, 1);
  assert.match(tutela, /ANEXOS/u);
  assert.match(tutela, /1\. Orden médica/u);
  assert.match(tutela, /2\. Constancia de radicación/u);
});

test("tutela declara explícitamente cuando no hay pruebas cargadas", () => {
  const tutela = composeDraftExport(
    "tutela",
    exportInput({ evidenceNames: [] }),
  );

  assert.match(tutela, /ANEXOS\s*\nNo se registraron pruebas\./u);
  assert.doesNotMatch(tutela, /undefined|null/u);
});

test("los placeholders seguros cubren datos que la orientación no calcula", () => {
  const input = exportInput({ city: undefined, date: undefined });

  for (const format of ["petition", "pqr", "tutela"]) {
    const content = composeDraftExport(format, input);
    assert.match(content, /\[CIUDAD\]/u);
    assert.match(content, /\[FECHA\]/u);
    assert.doesNotMatch(content, /undefined|Invalid Date/u);
  }
});

test("los cuatro formatos producen contenido diferente sin mutar la entrada", () => {
  const input = exportInput();
  const snapshot = structuredClone(input);
  const contents = ["story", "petition", "pqr", "tutela"].map((format) =>
    composeDraftExport(format, input),
  );

  assert.equal(new Set(contents).size, 4);
  assert.deepEqual(input, snapshot);
});

test("cada formato usa un nombre descriptivo con la extensión de downloadText", () => {
  assert.deepEqual(
    {
      story: getDraftExportFilename("story"),
      petition: getDraftExportFilename("petition"),
      pqr: getDraftExportFilename("pqr"),
      tutela: getDraftExportFilename("tutela"),
    },
    {
      story: "relato-caso.txt",
      petition: "derecho-de-peticion-caso.txt",
      pqr: "pqr-caso.txt",
      tutela: "accion-de-tutela-caso.txt",
    },
  );
});
