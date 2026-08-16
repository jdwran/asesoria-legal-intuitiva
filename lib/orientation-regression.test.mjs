import assert from "node:assert/strict";
import test from "node:test";

import {
  getColombianProcedureSteps,
  getSuggestedCaseBlocks,
} from "./case-guidance.ts";
import {
  buildFallbackOrientation,
  getPreliminaryLegalCitations,
} from "./legal-data.ts";

const regressionCases = [
  {
    id: 1,
    city: "Bogotá, D. C.",
    story: "La señora que me arrienda el apartamento me escribió por WhatsApp el 3 de agosto diciendo que le entregue en cinco días porque lo va a vender. Tengo contrato escrito desde marzo de 2025 y estoy al día con el canon. Ayer mandó a un cerrajero a mirar la chapa de la puerta.",
    category: "arrendamiento",
    urgency: "alta",
    documentKind: "arrendamiento-comunicacion",
  },
  {
    id: 2,
    city: "Villavicencio, Meta",
    story: "El administrador del edificio me subió el canon de arriendo de 900.000 a 1.400.000 pesos de un mes a otro y dice que si no firmo un contrato nuevo me cobra intereses. Llevo tres años en el mismo apartamento y siempre he pagado puntual. No me han entregado nada por escrito.",
    category: "arrendamiento",
    urgency: "media",
    documentKind: "arrendamiento-comunicacion",
  },
  {
    id: 3,
    city: "Itagüí, Antioquia",
    story: "Trabajé nueve meses como auxiliar de bodega en una empresa de mensajería. Me despidieron el 30 de julio sin carta y no me han pagado los dos últimos sueldos, ni la prima ni las cesantías. Nunca me firmaron contrato, pero tengo los turnos y las órdenes por WhatsApp y los recibos de pago de los primeros meses.",
    category: "laboral",
    urgency: "media",
    documentKind: "reclamacion-laboral",
  },
  {
    id: 4,
    city: "Barranquilla, Atlántico",
    story: "Mi EPS lleva cuatro meses sin autorizar la cirugía de vesícula que me ordenó el cirujano el 12 de abril. Ya fui dos veces a urgencias por el dolor y solo me mandan analgésicos. Radiqué la solicitud el 2 de mayo y tengo el número de radicado, pero nadie me responde y no puedo trabajar.",
    category: "salud",
    urgency: "alta",
    documentKind: "solicitud-salud",
  },
  {
    id: 5,
    city: "Pereira, Risaralda",
    story: "El papá de mi hija de 6 años dejó de dar la cuota alimentaria hace ocho meses. Nunca hemos definido por escrito la custodia ni las visitas, y ahora quiere llevársela los fines de semana cuando él decide. Él trabaja como conductor independiente y no tiene contrato. Yo pago el colegio, el arriendo y la comida sola.",
    category: "familia",
    urgency: "media",
    documentKind: "resumen-familia",
  },
  {
    id: 6,
    city: "Soacha, Cundinamarca",
    story: "Mi expareja llegó el sábado en la noche a la casa, me empujó contra la pared y me amenazó con volver cuando yo esté sola. Vivo con mis dos hijos y él todavía tiene copia de las llaves. Tengo fotos de los moretones y mensajes donde me insulta. Tengo miedo de que vuelva esta semana.",
    category: "familia",
    urgency: "alta",
    documentKind: "medida-proteccion",
  },
  {
    id: 7,
    city: "Cartagena, Bolívar",
    story: "Anoche mi hijo de 9 años me contó llorando que un vecino del conjunto lo tocó mientras jugaba en el parqueadero. Está asustado y no quiere salir del cuarto. El vecino vive en la torre de al lado y sigue viéndolo en el parque. No sé si debo denunciar primero o llevarlo al médico.",
    category: "penal",
    urgency: "alta",
    documentKind: "relato-denuncia",
  },
  {
    id: 8,
    city: "Bucaramanga, Santander",
    story: "Ayer me dejaron en la portería un sobre del juzgado con una demanda en mi contra por una deuda de un banco. El papel dice que tengo diez días para contestar y que hay una audiencia. Nunca me habían notificado antes y no entiendo qué debo hacer ni a quién acudir.",
    category: "otro",
    urgency: "alta",
    documentKind: "resumen-urgente",
  },
  {
    id: 9,
    city: "Cali, Valle del Cauca",
    story: "Me llegó un comparendo de tránsito por 700.000 pesos a nombre mío por un carro que vendí hace dos años y que ya traspasé. La resolución de la secretaría de movilidad tiene mi cédula, pero nunca me notificaron el proceso y me enteré porque no pude renovar la licencia. Tengo el contrato de venta y el formulario de traspaso.",
    category: "administrativo",
    urgency: "media",
    documentKind: "solicitud-administrativa",
  },
  {
    id: 10,
    city: "Medellín, Antioquia",
    story: "Compré un celular por una página de ventas en internet y transferí 1.200.000 pesos a una cuenta de billetera digital. La persona nunca envió el equipo y bloqueó mi número. Tengo el comprobante de la transferencia, los chats y el perfil del vendedor. Quiero denunciar la estafa y saber si puedo recuperar el dinero.",
    category: "penal",
    urgency: "media",
    documentKind: "relato-denuncia",
  },
];

for (const scenario of regressionCases) {
  test(`caso de regresión ${scenario.id}: conserva ruta, prioridad y documento`, () => {
    const orientation = buildFallbackOrientation(scenario.story, scenario.city);
    assert.equal(orientation.category, scenario.category);
    assert.equal(orientation.urgency, scenario.urgency);
    assert.equal(orientation.documentKind, scenario.documentKind);
    assert.ok(getPreliminaryLegalCitations(orientation, scenario.story).length > 0);
    assert.ok(getSuggestedCaseBlocks(orientation, []).length >= 3);
    assert.ok(getColombianProcedureSteps(orientation, scenario.city).length >= 3);
  });
}

test("caso 1: no trata la visita del cerrajero como una perturbación ya consumada", () => {
  const scenario = regressionCases[0];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const citations = getPreliminaryLegalCitations(orientation, scenario.story).map(({ id }) => id);
  assert.ok(citations.includes("ley-820"));
  assert.ok(!citations.includes("codigo-policia-tenencia"));
  assert.ok(!citations.includes("codigo-general-proceso"));
});

test("una negación efectiva de acceso activa la ruta policiva de tenencia", () => {
  const story = "La arrendadora cambió la cerradura y no me deja entrar al apartamento donde vivo.";
  const orientation = buildFallbackOrientation(story, "Bogotá");
  const citations = getPreliminaryLegalCitations(orientation, story).map(({ id }) => id);
  assert.ok(orientation.sourceIds.includes("codigo-policia-tenencia"));
  assert.ok(citations.includes("codigo-policia-tenencia"));
  assert.match(getColombianProcedureSteps(orientation, "Bogotá")[2].entity, /Inspector de Polic[ií]a/i);
});

test("caso 2: el reajuste no hereda fuentes ni lenguaje de desalojo", () => {
  const scenario = regressionCases[1];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const citations = getPreliminaryLegalCitations(orientation, scenario.story).map(({ id }) => id);
  const suggestions = getSuggestedCaseBlocks(orientation, []).slice(0, 3).map(({ id }) => id);
  const content = [orientation.rightTitle, orientation.rightExplanation, ...orientation.nextSteps.map(({ title, detail }) => `${title} ${detail}`)].join(" ");
  assert.deepEqual(citations, ["ley-820-canon"]);
  assert.deepEqual(suggestions, ["lease-increase-notice", "lease-price-history", "lease-payment-history"]);
  assert.doesNotMatch(content, /desaloj|cerradura|restituci[oó]n/i);
});

test("caso 3: separa vínculo verbal, terminación y pagos sin presumir despido injusto", () => {
  const scenario = regressionCases[2];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const citations = getPreliminaryLegalCitations(orientation, scenario.story).map(({ id }) => id);
  assert.ok(citations.includes("codigo-trabajo-vinculo"));
  assert.ok(citations.includes("sentencia-c-665-1998"));
  assert.ok(citations.includes("codigo-trabajo-terminacion"));
  assert.ok(!citations.includes("sentencia-c-1507-2000"));
  assert.ok(!citations.includes("sentencia-su-995-1999"));
  assert.equal(getSuggestedCaseBlocks(orientation, [])[0]?.id, "labor-termination-notice");
});

test("caso 4: no pide radicar de nuevo una solicitud que ya tiene número", () => {
  const scenario = regressionCases[3];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  assert.ok(orientation.nextSteps.some(({ title }) => /radicado existente/i.test(title)));
  assert.ok(!orientation.triageQuestions.some((question) => /tienes orden m[eé]dica/i.test(question)));
});

test("caso 5: conserva alimentos, custodia y visitas aunque el arriendo aparezca como gasto", () => {
  const scenario = regressionCases[4];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const suggestions = getSuggestedCaseBlocks(orientation, []);
  assert.match(orientation.caseTitle, /aportes.*custodia.*visitas/i);
  assert.ok(orientation.triageQuestions.some((question) => /acta|resoluci[oó]n|sentencia/i.test(question)));
  assert.ok(!suggestions.some(({ id }) => id.startsWith("lease-")));
});

test("casos 6 y 7: priorizan seguridad sin conciliación ni repetición del relato", () => {
  const violence = buildFallbackOrientation(regressionCases[5].story, regressionCases[5].city);
  const child = buildFallbackOrientation(regressionCases[6].story, regressionCases[6].city);
  assert.deepEqual(
    getSuggestedCaseBlocks(violence, []).slice(0, 3).map(({ id }) => id),
    ["protection-current-safety", "protection-access-home", "protection-existing-evidence"],
  );
  assert.ok(!violence.nextSteps.some(({ title }) => /concili/i.test(title)));
  assert.ok(child.sourceIds.includes("ley-1146"));
  assert.match(getColombianProcedureSteps(child, regressionCases[6].city)[0].title, /salud/i);
  assert.ok(!child.triageQuestions.some((question) => /qu[eé] pas[oó]|cu[eé]nt|detalle/i.test(question)));
});

test("caso 8: solo produce bloques y fuentes judiciales aunque la categoría AI fuera contradictoria", () => {
  const scenario = regressionCases[7];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const suggestions = getSuggestedCaseBlocks({ ...orientation, category: "laboral" }, []);
  const citations = getPreliminaryLegalCitations(orientation, scenario.story).map(({ id }) => id);
  const routeText = getColombianProcedureSteps(orientation, scenario.city).map(({ title, detail }) => `${title} ${detail}`).join(" ");
  assert.deepEqual(
    suggestions.slice(0, 3).map(({ id }) => id),
    ["judicial-notice-complete", "judicial-received-at", "judicial-court-case"],
  );
  assert.ok(!suggestions.some(({ id }) => id.startsWith("labor-")));
  assert.ok(citations.includes("codigo-general-proceso-judicial"));
  assert.doesNotMatch(routeText, /derecho de petici[oó]n/i);
});

test("caso 9: usa la subruta de tránsito y no un buscador judicial", () => {
  const scenario = regressionCases[8];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const citations = getPreliminaryLegalCitations(orientation, scenario.story).map(({ id }) => id);
  const steps = getColombianProcedureSteps(orientation, scenario.city);
  assert.ok(citations.includes("codigo-transito"));
  assert.ok(citations.includes("sentencia-c-530-2003"));
  assert.ok(!citations.includes("sentencia-c-038-2020"));
  assert.match(steps[0].title, /traspaso/i);
  assert.ok(!steps.flatMap(({ sourceIds }) => sourceIds).includes("rama-procesos"));
});

test("caso 10: separa reporte financiero de Fiscalía y no promete recuperar el dinero", () => {
  const scenario = regressionCases[9];
  const orientation = buildFallbackOrientation(scenario.story, scenario.city);
  const citations = getPreliminaryLegalCitations(orientation, scenario.story).map(({ id }) => id);
  const steps = getColombianProcedureSteps(orientation, scenario.city);
  const content = [orientation.rightExplanation, ...orientation.nextSteps.map(({ title, detail }) => `${title} ${detail}`), ...steps.map(({ title, detail, nextAction }) => `${title} ${detail} ${nextAction}`)].join(" ");
  assert.ok(citations.includes("codigo-penal-estafa"));
  assert.ok(citations.includes("codigo-procedimiento-penal-querella"));
  assert.match(steps[0].title, /reporta/i);
  assert.match(content, /no garantiza.*reversi[oó]n/i);
  assert.doesNotMatch(content, /recuperar[aá]s|recuperaci[oó]n garantizada/i);
});

test("las palabras incidentales no ganan frente a señales jurídicas fuertes", () => {
  const mixedCases = [
    ["Pago arriendo y la EPS no autoriza mi cirugía ordenada.", "salud"],
    ["Mi hijo compró un celular y lo estafaron en internet.", "penal"],
    ["Quiero denunciar que la alcaldía me impuso un comparendo.", "administrativo"],
    ["Vivo en un apartamento y la secretaría de movilidad me impuso una multa.", "administrativo"],
  ];
  for (const [story, category] of mixedCases) {
    assert.equal(buildFallbackOrientation(story, "Cali").category, category, story);
  }
});

test("las palabras comunes no se convierten en señales jurídicas por substring", () => {
  const neutralCases = [
    "Mi prima me prestó dinero y no sé cómo documentar el acuerdo.",
    "Compré alimentos vencidos en una tienda y quiero saber dónde reclamar.",
    "Compré una cámara Canon defectuosa y el vendedor no responde.",
  ];
  for (const story of neutralCases) {
    assert.equal(buildFallbackOrientation(story, "Cali").category, "otro", story);
  }
});

test("mencionar la edad de un hijo no le atribuye la violencia narrada contra la madre", () => {
  const orientation = buildFallbackOrientation(
    "Vivo con mi hijo de 9 años. Mi expareja me empujó y me amenazó a mí.",
    "Soacha",
  );
  assert.equal(orientation.category, "familia");
  assert.equal(orientation.documentKind, "medida-proteccion");
});

test("una cirugía sin demora, deterioro ni urgencia no se marca automáticamente como alta", () => {
  const orientation = buildFallbackOrientation(
    "La EPS me informó cómo programar una cirugía electiva para el próximo semestre.",
    "Cali",
  );
  assert.equal(orientation.category, "salud");
  assert.equal(orientation.urgency, "media");
});
