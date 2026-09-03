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
    documentKind: "solicitud-alimentos",
    help: "Defensoría de Familia del ICBF",
  },
  {
    name: "pensión alimenticia con lenguaje coloquial",
    story: "Necesito ayuda porque no me pasan la pensión alimenticia de mi hija hace tres meses.",
    category: "familia",
    urgency: "media",
    documentKind: "solicitud-alimentos",
  },
  {
    name: "custodia sin mención de alimentos",
    story: "Quiero la custodia de mi hijo, estamos separados y no nos ponemos de acuerdo.",
    category: "familia",
    urgency: "media",
    documentKind: "resumen-familia",
  },
  {
    name: "alimentos y custodia en el mismo relato",
    story: "Quiero la cuota alimentaria y la custodia de mi hijo, el padre no colabora con nada.",
    category: "familia",
    urgency: "media",
    documentKind: "solicitud-alimentos",
    titleIncludes: "custodia",
  },
  {
    name: "empresa alimentaria no confunde con caso de alimentos",
    story: "Trabajo en una empresa alimentaria y no me pagan el sueldo hace dos meses.",
    category: "laboral",
    urgency: "media",
    documentKind: "reclamacion-laboral",
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

  // Relatos largos, como los escribe una persona real: varias frases, gastos y
  // detalles de contexto que no son el asunto jurídico. Los casos marcados con
  // `todo` describen el comportamiento correcto, no el actual.
  {
    name: "relato largo · aviso de entrega en cinco días y cerrajero en la puerta",
    story:
      "La señora que me arrienda el apartamento me escribió por WhatsApp el 3 de agosto diciendo que le entregue en cinco días porque lo va a vender. Tengo contrato escrito desde marzo de 2025 y estoy al día con el canon. Ayer mandó a un cerrajero a mirar la chapa de la puerta.",
    category: "arrendamiento",
    urgency: "alta",
    documentKind: "arrendamiento-comunicacion",
    todo: "el desalojo de hecho no se detecta: 'le entregue en cinco días' y 'cerrajero' no están en evictionContext",
  },
  {
    name: "relato largo · alza de canon sin aviso escrito",
    story:
      "El administrador del edificio me subió el canon de arriendo de 900.000 a 1.400.000 pesos de un mes a otro y dice que si no firmo un contrato nuevo me cobra intereses. Llevo tres años en el mismo apartamento y siempre he pagado puntual. No me han entregado nada por escrito.",
    category: "arrendamiento",
    urgency: "media",
    documentKind: "arrendamiento-comunicacion",
  },
  {
    name: "relato largo · despido sin carta y sin pago de prestaciones",
    story:
      "Trabajé nueve meses como auxiliar de bodega en una empresa de mensajería. Me despidieron el 30 de julio sin carta y no me han pagado los dos últimos sueldos, ni la prima ni las cesantías. Nunca me firmaron contrato, pero tengo los turnos y las órdenes por WhatsApp y los recibos de pago de los primeros meses.",
    category: "laboral",
    urgency: "media",
    documentKind: "reclamacion-laboral",
  },
  {
    name: "relato largo · EPS sin autorizar cirugía con radicado",
    story:
      "Mi EPS lleva cuatro meses sin autorizar la cirugía de vesícula que me ordenó el cirujano el 12 de abril. Ya fui dos veces a urgencias por el dolor y solo me mandan analgésicos. Radiqué la solicitud el 2 de mayo y tengo el número de radicado, pero nadie me responde y no puedo trabajar.",
    category: "salud",
    urgency: "alta",
    documentKind: "solicitud-salud",
  },
  {
    name: "relato largo · alimentos y custodia donde el arriendo es un gasto",
    story:
      "El papá de mi hija de 6 años dejó de dar la cuota alimentaria hace ocho meses. Nunca hemos definido por escrito la custodia ni las visitas, y ahora quiere llevársela los fines de semana cuando él decide. Él trabaja como conductor independiente y no tiene contrato. Yo pago el colegio, el arriendo y la comida sola.",
    category: "familia",
    urgency: "media",
    documentKind: "solicitud-alimentos",
    help: "Defensoría de Familia del ICBF",
    todo: "'arriendo' como gasto del hogar desvía el caso a la rama de arrendamiento, que se evalúa antes que alimentos",
  },
  {
    name: "relato largo · agresión y amenaza de la expareja con llaves de la casa",
    story:
      "Mi expareja llegó el sábado en la noche a la casa, me empujó contra la pared y me amenazó con volver cuando yo esté sola. Vivo con mis dos hijos y él todavía tiene copia de las llaves. Tengo fotos de los moretones y mensajes donde me insulta. Tengo miedo de que vuelva esta semana.",
    category: "familia",
    urgency: "alta",
    documentKind: "medida-proteccion",
    help: "Comisaría de Familia",
  },
  {
    name: "relato largo · tocamiento a un niño relatado en pasado simple",
    story:
      "Anoche mi hijo de 9 años me contó llorando que un vecino del conjunto lo tocó mientras jugaba en el parqueadero. Está asustado y no quiere salir del cuarto. El vecino vive en la torre de al lado y sigue viéndolo en el parque. No sé si debo denunciar primero o llevarlo al médico.",
    category: "penal",
    urgency: "alta",
    documentKind: "relato-denuncia",
    help: "Línea 141 del ICBF",
    todo: "harmContext solo cubre 'tocam'; 'lo tocó' no activa la ruta de niñez y el caso cae en asunto de familia con urgencia media",
  },
  {
    name: "relato largo · sobre del juzgado dejado en portería",
    story:
      "Ayer me dejaron en la portería un sobre del juzgado con una demanda en mi contra por una deuda de un banco. El papel dice que tengo diez días para contestar y que hay una audiencia. Nunca me habían notificado antes y no entiendo qué debo hacer ni a quién acudir.",
    category: "otro",
    urgency: "alta",
    documentKind: "resumen-urgente",
  },
  {
    name: "relato largo · comparendo de un vehículo ya traspasado",
    story:
      "Me llegó un comparendo de tránsito por 700.000 pesos a nombre mío por un carro que vendí hace dos años y que ya traspasé. La resolución de la secretaría de movilidad tiene mi cédula, pero nunca me notificaron el proceso y me enteré porque no pude renovar la licencia. Tengo el contrato de venta y el formulario de traspaso.",
    category: "administrativo",
    urgency: "media",
    documentKind: "solicitud-administrativa",
  },
  {
    name: "relato largo · estafa en compra por internet",
    story:
      "Compré un celular por una página de ventas en internet y transferí 1.200.000 pesos a una cuenta de billetera digital. La persona nunca envió el equipo y bloqueó mi número. Tengo el comprobante de la transferencia, los chats y el perfil del vendedor. Quiero denunciar la estafa y saber si puedo recuperar el dinero.",
    category: "penal",
    urgency: "media",
    documentKind: "relato-denuncia",
  },
];

for (const scenario of cases) {
  test(scenario.name, { todo: scenario.todo }, () => {
    const result = buildFallbackOrientation(scenario.story, "Bogotá");
    assert.equal(result.category, scenario.category);
    assert.equal(result.urgency, scenario.urgency);
    assert.equal(result.documentKind, scenario.documentKind);
    if (scenario.help) {
      assert.ok(result.freeHelp.some((resource) => resource.name === scenario.help));
    }
    if (scenario.titleIncludes) {
      assert.ok(result.caseTitle.includes(scenario.titleIncludes));
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
