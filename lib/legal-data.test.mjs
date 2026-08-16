import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFallbackOrientation,
  getPreliminaryLegalCitations,
  officialSources,
} from "./legal-data.ts";

const cases = [
  {
    name: "arrendamiento con aviso corto",
    story: "Me quieren desalojar del apartamento en cinco días y me avisaron por WhatsApp.",
    category: "arrendamiento",
    urgency: "alta",
    documentKind: "arrendamiento-comunicacion",
  },
  {
    name: "salario sin pagar",
    story: "Mi empleador no me paga el sueldo hace dos meses.",
    category: "laboral",
    urgency: "media",
    documentKind: "reclamacion-laboral",
  },
  {
    name: "barrera urgente de salud",
    story: "La EPS no autoriza una cirugía urgente que ordenó el médico.",
    category: "salud",
    urgency: "alta",
    documentKind: "solicitud-salud",
  },
  {
    name: "alimentos sin violencia",
    story: "El padre de mi hija no paga la cuota alimentaria y quiero fijarla.",
    category: "familia",
    urgency: "media",
    documentKind: "resumen-familia",
  },
  {
    name: "violencia familiar",
    story: "Mi pareja me golpeó y me amenazó hoy.",
    category: "familia",
    urgency: "alta",
    documentKind: "medida-proteccion",
  },
  {
    name: "robo y agresión coloquiales",
    story: "Un desconocido me agredió y me robó en la calle anoche.",
    category: "penal",
    urgency: "media",
    documentKind: "relato-denuncia",
  },
  {
    name: "multa administrativa con recurso",
    story: "La alcaldía me notificó una multa y el recurso vence en cinco días.",
    category: "administrativo",
    urgency: "alta",
    documentKind: "solicitud-administrativa",
  },
  {
    name: "notificación judicial con término",
    story: "Ayer me notificaron una demanda del juzgado y dice que tengo cinco días para contestar.",
    category: "otro",
    urgency: "alta",
    documentKind: "resumen-urgente",
  },
  {
    name: "entidad pública demandante y juzgado",
    story: "La alcaldía me demandó y ayer me notificó el juzgado. Tengo cinco días para contestar.",
    category: "otro",
    urgency: "alta",
    documentKind: "resumen-urgente",
  },
  {
    name: "intención de demandar sin actuación recibida",
    story: "Quiero presentar una demanda porque una persona me debe dinero.",
    category: "otro",
    urgency: "media",
    documentKind: "resumen-general",
  },
  {
    name: "violencia familiar y audiencia próxima",
    story: "Mi pareja me golpeó y me amenazó hoy. Además me notificaron una audiencia en un juzgado para mañana.",
    category: "familia",
    urgency: "alta",
    documentKind: "medida-proteccion",
    help: "Comisaría de Familia",
  },
  {
    name: "abuso de niña fuera del hogar",
    story: "Un profesor abusó de mi hija en el colegio.",
    category: "penal",
    urgency: "alta",
    documentKind: "relato-denuncia",
    help: "Línea 141 del ICBF",
  },
  {
    name: "agresión de niño por un vecino",
    story: "Un vecino golpeó a mi hijo en la calle.",
    category: "penal",
    urgency: "alta",
    documentKind: "relato-denuncia",
    help: "Línea 141 del ICBF",
  },
  {
    name: "violencia de expareja sin atribuirla al hijo",
    story: "El padre de mi hijo me golpeó y me amenazó.",
    category: "familia",
    urgency: "alta",
    documentKind: "medida-proteccion",
    help: "Comisaría de Familia",
  },
];

for (const scenario of cases) {
  test(scenario.name, () => {
    const result = buildFallbackOrientation(scenario.story, "Bogotá");
    assert.equal(result.category, scenario.category);
    assert.equal(result.urgency, scenario.urgency);
    assert.equal(result.documentKind, scenario.documentKind);
    if (scenario.help) {
      assert.ok(result.freeHelp.some((resource) => resource.name === scenario.help));
    }
  });
}

test("todas las orientaciones de la matriz usan fuentes existentes", () => {
  const knownSourceIds = new Set(officialSources.map((source) => source.id));
  for (const scenario of cases) {
    const result = buildFallbackOrientation(scenario.story, "Bogotá");
    for (const sourceId of [...result.sourceIds, ...result.freeHelp.map((help) => help.sourceId)]) {
      assert.ok(knownSourceIds.has(sourceId), `${scenario.name}: falta la fuente ${sourceId}`);
    }
  }
});

test("cada materia tiene al menos una norma verificada y nunca usa buscadores como sustento", () => {
  for (const scenario of cases) {
    const orientation = buildFallbackOrientation(scenario.story, "Bogotá");
    const citations = getPreliminaryLegalCitations(orientation, scenario.story);

    assert.ok(
      citations.some((source) => source.legal.kind !== "sentencia"),
      `${scenario.name}: falta norma o código`,
    );

    for (const source of citations) {
      assert.match(source.url, /^https:\/\//);
      assert.ok(!source.url.includes("datos.gov.co"), `${scenario.name}: un dataset no es una cita`);
      assert.ok(!source.url.includes("WebRelatoria"), `${scenario.name}: un buscador no es una cita`);
      assert.equal(source.legal.verifiedAt, "2026-08-15");
      assert.ok(source.legal.citation);
      assert.ok(source.legal.proposition);
      assert.ok(source.legal.scopeNote);
    }
  }
});

function citationIdsFor(story) {
  const orientation = buildFallbackOrientation(story, "Bogotá");
  return getPreliminaryLegalCitations(orientation, story).map((source) => source.id);
}

test("activa jurisprudencia laboral según los hechos y no solo por la categoría", () => {
  assert.deepEqual(
    citationIdsFor("Mi empleador no me paga el sueldo hace dos meses."),
    ["codigo-trabajo"],
  );
  assert.ok(
    citationIdsFor(
      "Mi empleador no me paga el sueldo hace dos meses y no tengo para cubrir comida y otras necesidades básicas.",
    ).includes("sentencia-su-995-1999"),
  );

  const dismissalCitations = citationIdsFor(
    "Me despidieron sin justa causa y me entregaron una carta de terminación del contrato.",
  );
  assert.ok(dismissalCitations.includes("codigo-trabajo-terminacion"));
  assert.ok(dismissalCitations.includes("sentencia-c-1507-2000"));
  assert.ok(!dismissalCitations.includes("sentencia-su-995-1999"));

  const dismissalWithUnconfirmedCause = citationIdsFor(
    "Me despidieron y en la carta indicaron una causa que todavía no he podido revisar.",
  );
  assert.ok(dismissalWithUnconfirmedCause.includes("codigo-trabajo-terminacion"));
  assert.ok(!dismissalWithUnconfirmedCause.includes("sentencia-c-1507-2000"));
});

test("distingue vivienda urbana de local comercial y limita C-426 de 2023 a sus supuestos", () => {
  const genericHousing = citationIdsFor(
    "Me quieren desalojar del apartamento en cinco días y me avisaron por WhatsApp.",
  );
  assert.ok(genericHousing.includes("ley-820"));
  assert.ok(!genericHousing.includes("sentencia-c-426-2023"));

  const specialHousingGround = citationIdsFor(
    "La arrendadora quiere terminar el arriendo de mi vivienda porque dice que la necesita para ocupación propia y habla de una caución.",
  );
  assert.ok(specialHousingGround.includes("ley-820"));
  assert.ok(specialHousingGround.includes("sentencia-c-426-2023"));

  const commercialPremises = citationIdsFor(
    "Arriendo un local comercial donde funciona mi establecimiento de comercio desde hace tres años y me pidieron entregarlo.",
  );
  assert.deepEqual(commercialPremises, ["codigo-comercio-arrendamiento"]);
});

test("no aplica automáticamente el Código de Infancia a alimentos entre personas adultas", () => {
  const adultSupport = citationIdsFor(
    "Mi exesposo adulto solicita alimentos para él y quiero entender si existe esa obligación.",
  );
  assert.ok(adultSupport.includes("codigo-civil-alimentos"));
  assert.ok(!adultSupport.includes("codigo-infancia"));
  assert.ok(!adultSupport.includes("sentencia-t-510-2003"));

  const adultDaughterSupport = citationIdsFor(
    "Mi hija adulta solicita alimentos y quiero entender si existe esa obligación.",
  );
  assert.ok(adultDaughterSupport.includes("codigo-civil-alimentos"));
  assert.ok(!adultDaughterSupport.includes("codigo-infancia"));

  const childSupport = citationIdsFor(
    "El padre de mi hija no paga la cuota alimentaria y quiero fijarla.",
  );
  assert.ok(childSupport.includes("codigo-civil-alimentos"));
  assert.ok(childSupport.includes("codigo-infancia"));
  assert.ok(childSupport.includes("sentencia-t-510-2003"));
});
