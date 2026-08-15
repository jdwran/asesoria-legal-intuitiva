import assert from "node:assert/strict";
import test from "node:test";

import { buildFallbackOrientation, officialSources } from "./legal-data.ts";

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
