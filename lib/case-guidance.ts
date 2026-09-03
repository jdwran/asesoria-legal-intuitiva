import type {
  CaseElement,
  CaseElementType,
  DocumentKind,
  LegalCategory,
  LegalOrientation,
} from "./legal-data.ts";

export interface CaseBlockSuggestion {
  id: string;
  type: CaseElementType;
  title: string;
  prompt: string;
  reason: string;
  priority: number;
}

export interface ColombianProcedureStep {
  id: string;
  stage: "Preparar" | "Radicar" | "Dar seguimiento" | "Atención inmediata";
  title: string;
  detail: string;
  entity: string;
  channel: string;
  requirements: string[];
  expectedOutput: string;
  nextAction: string;
  timing: string;
  cost: string;
  sourceIds: string[];
}

export interface CaseOutput {
  id: "ruta" | "borrador" | "carpeta" | "comprobantes";
  title: string;
  detail: string;
  status: "listo" | "en-proceso" | "pendiente";
  actionLabel: string;
}

const sharedSuggestions: CaseBlockSuggestion[] = [
  {
    id: "common-timeline",
    type: "fechas",
    title: "Cronología de lo ocurrido",
    prompt: "Agrega las fechas en orden y explica brevemente qué pasó en cada una.",
    reason: "Permite detectar actuaciones urgentes y contar el caso sin vacíos.",
    priority: 55,
  },
  {
    id: "common-contact",
    type: "personas",
    title: "Persona o entidad involucrada",
    prompt: "Indica su nombre o razón social y qué relación tiene con el caso. Evita números de identificación.",
    reason: "Ayuda a identificar quién debe recibir una solicitud o revisar el caso.",
    priority: 50,
  },
];

const suggestionsByCategory: Record<LegalCategory, CaseBlockSuggestion[]> = {
  arrendamiento: [
    {
      id: "lease-contract",
      type: "pruebas",
      title: "Contrato o acuerdo de arriendo",
      prompt: "Describe si es escrito o verbal, la fecha de inicio y quiénes lo celebraron.",
      reason: "La ruta depende del tipo de inmueble, las partes y las condiciones acordadas.",
      priority: 100,
    },
    {
      id: "lease-notice",
      type: "pruebas",
      title: "Aviso de terminación o entrega",
      prompt: "Registra el medio, la fecha, la causal indicada y conserva el mensaje completo.",
      reason: "Permite diferenciar una comunicación privada de una actuación judicial.",
      priority: 95,
    },
    {
      id: "lease-payments",
      type: "pruebas",
      title: "Pagos de canon y servicios",
      prompt: "Agrega comprobantes y señala qué periodos están pagados o discutidos.",
      reason: "El estado de los pagos puede cambiar la causal y el siguiente paso.",
      priority: 90,
    },
  ],
  laboral: [
    {
      id: "labor-employer",
      type: "personas",
      title: "Empleador o contratante",
      prompt: "Indica nombre o razón social, cargo y lugar donde prestaste el servicio.",
      reason: "La autoridad y el destinatario dependen del tipo de vínculo.",
      priority: 100,
    },
    {
      id: "labor-periods",
      type: "fechas",
      title: "Periodos y pagos pendientes",
      prompt: "Enumera salarios, prestaciones o liquidación pendientes y sus periodos.",
      reason: "Una reclamación útil debe identificar con precisión qué se pide.",
      priority: 98,
    },
    {
      id: "labor-link",
      type: "pruebas",
      title: "Pruebas del vínculo laboral",
      prompt: "Agrega contrato, turnos, chats, desprendibles, PILA o movimientos bancarios disponibles.",
      reason: "Sirven para demostrar la relación, el trabajo realizado y los pagos recibidos.",
      priority: 92,
    },
  ],
  salud: [
    {
      id: "health-order",
      type: "pruebas",
      title: "Orden o indicación médica",
      prompt: "Registra el servicio ordenado, la fecha y la entidad que debe prestarlo.",
      reason: "Permite formular una solicitud concreta y explicar la urgencia.",
      priority: 100,
    },
    {
      id: "health-denial",
      type: "pruebas",
      title: "Negativa, demora o autorización",
      prompt: "Agrega la respuesta, captura o radicado donde conste la barrera de acceso.",
      reason: "Deja trazabilidad de lo solicitado y de la respuesta recibida.",
      priority: 98,
    },
    {
      id: "health-risk",
      type: "hechos",
      title: "Riesgo o afectación actual",
      prompt: "Explica, sin autodiagnosticarte, qué indicó el personal de salud sobre la urgencia o el riesgo.",
      reason: "Ayuda a priorizar atención inmediata frente a una reclamación ordinaria.",
      priority: 96,
    },
  ],
  familia: [
    {
      id: "family-prior-decision",
      type: "pruebas",
      title: "Acuerdo o decisión previa",
      prompt: "Agrega actas de conciliación, sentencias, medidas o acuerdos existentes.",
      reason: "Define si se busca fijar, modificar, hacer cumplir o pedir protección.",
      priority: 100,
    },
    {
      id: "family-children",
      type: "personas",
      title: "Niñas, niños o adolescentes involucrados",
      prompt: "Indica parentesco, edad aproximada y necesidad principal; no agregues números de identificación.",
      reason: "La protección y la autoridad competente dependen de quién está involucrado.",
      priority: 98,
    },
    {
      id: "family-expenses-risk",
      type: "hechos",
      title: "Necesidades, gastos o situación de riesgo",
      prompt: "Describe gastos mensuales relevantes o hechos de riesgo, según corresponda.",
      reason: "Permite separar alimentos, custodia, visitas y protección.",
      priority: 94,
    },
  ],
  penal: [
    {
      id: "crime-chronology",
      type: "hechos",
      title: "Relato de tiempo, modo y lugar",
      prompt: "Cuenta qué ocurrió, dónde y en qué orden, sin completar lo que no recuerdes.",
      reason: "Facilita presentar un relato claro sin alterar la evidencia.",
      priority: 100,
    },
    {
      id: "crime-originals",
      type: "pruebas",
      title: "Índice de evidencias originales",
      prompt: "Lista mensajes, archivos, recibos, fotos o videos y dónde conservas el original.",
      reason: "Ayuda a entregar copias sin modificar ni perder los originales.",
      priority: 97,
    },
    {
      id: "crime-witnesses",
      type: "personas",
      title: "Testigos o personas que conocen los hechos",
      prompt: "Registra nombre y forma segura de contacto, si la tienes.",
      reason: "Permite a la autoridad ubicar otras fuentes de información.",
      priority: 88,
    },
  ],
  administrativo: [
    {
      id: "admin-act",
      type: "pruebas",
      title: "Acto, resolución o comparendo completo",
      prompt: "Agrega el documento con anexos, autoridad, número de expediente y parte de recursos.",
      reason: "La actuación correcta depende del contenido completo, no solo del título.",
      priority: 100,
    },
    {
      id: "admin-notice",
      type: "fechas",
      title: "Fecha y medio de notificación",
      prompt: "Registra cuándo y cómo recibiste la decisión y conserva la constancia.",
      reason: "Puede existir un término que debe revisar una persona experta.",
      priority: 99,
    },
    {
      id: "admin-filing",
      type: "pruebas",
      title: "Radicados y respuestas previas",
      prompt: "Agrega solicitudes, recursos, correos y números de radicado anteriores.",
      reason: "Evita repetir actuaciones y muestra qué respondió la entidad.",
      priority: 90,
    },
  ],
  otro: [
    {
      id: "other-notice",
      type: "pruebas",
      title: "Documento o comunicación recibida",
      prompt: "Agrega el documento completo, sus anexos y el medio por el que llegó.",
      reason: "Ayuda a detectar si existe una actuación o plazo que requiere revisión.",
      priority: 100,
    },
    {
      id: "other-goal",
      type: "hechos",
      title: "Resultado que necesitas",
      prompt: "Explica qué quieres lograr y qué respuesta has recibido hasta ahora.",
      reason: "Permite orientar la consulta hacia una salida concreta.",
      priority: 92,
    },
  ],
};

const categoryByDocumentKind: Record<DocumentKind, LegalCategory> = {
  "arrendamiento-comunicacion": "arrendamiento",
  "reclamacion-laboral": "laboral",
  "solicitud-salud": "salud",
  "medida-proteccion": "familia",
  "solicitud-alimentos": "familia",
  "resumen-familia": "familia",
  "relato-denuncia": "penal",
  "solicitud-administrativa": "administrativo",
  "resumen-urgente": "otro",
  "resumen-general": "otro",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CO")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function contextualSuggestions(orientation: LegalOrientation): CaseBlockSuggestion[] {
  const context = normalize(
    [orientation.caseTitle, orientation.plainSummary, ...orientation.extractedFacts].join(" "),
  );

  if (orientation.documentKind === "resumen-urgente") {
    return [
      {
        id: "judicial-notice-complete",
        type: "pruebas",
        title: "Notificación, demanda y anexos completos",
        prompt: "Agrega el documento principal, todos los anexos, el sobre, mensaje o constancia de entrega.",
        reason: "La revisión depende del contenido íntegro y del modo en que recibiste la actuación.",
        priority: 130,
      },
      {
        id: "judicial-received-at",
        type: "fechas",
        title: "Fecha, hora y medio de recepción",
        prompt: "Registra exactamente cuándo y cómo llegó el documento, sin calcular por tu cuenta el vencimiento.",
        reason: "Permite que una persona experta verifique el término aplicable.",
        priority: 128,
      },
      {
        id: "judicial-court-case",
        type: "hechos",
        title: "Juzgado, radicado y actuación indicada",
        prompt: "Copia el despacho, radicado, tipo de actuación y el término tal como aparecen escritos.",
        reason: "Evita confundir la consulta del proceso con una respuesta o contestación.",
        priority: 126,
      },
    ];
  }

  if (orientation.documentKind === "medida-proteccion") {
    return [
      {
        id: "protection-current-safety",
        type: "hechos",
        title: "Seguridad y riesgo en este momento",
        prompt: "Indica si estás en un lugar seguro, si la persona está cerca y qué apoyo humano puedes activar ahora.",
        reason: "La protección inmediata va antes que completar documentos o contactar a la otra persona.",
        priority: 130,
      },
      {
        id: "protection-access-home",
        type: "hechos",
        title: "Acceso a la vivienda, llaves y personas en riesgo",
        prompt: "Registra si conserva llaves o acceso y si hay niñas, niños u otras personas expuestas.",
        reason: "Ayuda a pedir medidas concretas sin exponerte a recolectar más pruebas.",
        priority: 126,
      },
      {
        id: "protection-existing-evidence",
        type: "pruebas",
        title: "Soportes que ya tienes disponibles",
        prompt: "Lista mensajes, fotos, reportes médicos o testigos que ya existan; no te pongas en riesgo para obtener otros.",
        reason: "Organiza lo disponible sin convertir la evidencia en requisito para pedir protección.",
        priority: 122,
      },
    ];
  }

  if (orientation.sourceIds.includes("icbf-linea-141")) {
    return [
      {
        id: "child-current-access",
        type: "hechos",
        title: "Seguridad y acceso actual a la niña o niño",
        prompt: "Indica si la persona señalada todavía puede acercarse y qué adulto seguro acompaña al menor.",
        reason: "Permite priorizar protección sin pedir que repita el relato.",
        priority: 132,
      },
      {
        id: "child-spontaneous-account",
        type: "hechos",
        title: "Relato espontáneo conservado sin interrogar",
        prompt: "Anota solo las palabras espontáneas, cuándo las dijo y quién las escuchó; no pidas que vuelva a contarlo.",
        reason: "Reduce la revictimización y conserva la información inicial sin completarla.",
        priority: 130,
      },
      {
        id: "child-health-attention",
        type: "pruebas",
        title: "Constancia de atención integral en salud",
        prompt: "Agrega la constancia u orientación recibida en salud cuando exista; no esperes una denuncia para buscar atención.",
        reason: "La ruta de salud es inmediata y distinta de la protección y la investigación.",
        priority: 128,
      },
    ];
  }

  if (
    orientation.documentKind === "arrendamiento-comunicacion" &&
    /(?:subio|subieron|aumento|incremento|reajuste|alza).{0,30}canon|canon.{0,30}(?:subio|aumento|incremento)/.test(context)
  ) {
    return [
      {
        id: "lease-increase-notice",
        type: "pruebas",
        title: "Comunicación del nuevo canon",
        prompt: "Agrega el mensaje o documento con el nuevo valor, porcentaje, fecha de vigencia y cálculo informado.",
        reason: "Permite revisar el reajuste sin mezclarlo con una terminación del contrato.",
        priority: 125,
      },
      {
        id: "lease-price-history",
        type: "fechas",
        title: "Inicio del contrato y último reajuste",
        prompt: "Registra la fecha de inicio, el canon anterior y cuándo cambió por última vez.",
        reason: "La periodicidad del reajuste depende de cuánto tiempo se mantuvo el mismo precio.",
        priority: 123,
      },
      {
        id: "lease-payment-history",
        type: "pruebas",
        title: "Historial de cánones pagados",
        prompt: "Agrega comprobantes recientes y separa canon, administración, servicios e intereses discutidos.",
        reason: "Ayuda a comparar correctamente el valor anterior y los cobros nuevos.",
        priority: 121,
      },
    ];
  }

  const tailored: CaseBlockSuggestion[] = [];
  if (orientation.documentKind === "reclamacion-laboral" && /despid|terminacion/.test(context)) {
    tailored.push({
      id: "labor-termination-notice",
      type: "pruebas",
      title: "Carta, mensaje o forma del despido",
      prompt: "Agrega lo recibido y registra qué causa te comunicaron, sin concluir todavía si fue justa o injusta.",
      reason: "La forma y la causa deben revisarse por separado de los pagos pendientes.",
      priority: 112,
    });
  }
  if (orientation.documentKind === "solicitud-administrativa" && /comparendo|transito|vehiculo|carro/.test(context)) {
    tailored.push({
      id: "traffic-transfer-record",
      type: "pruebas",
      title: "Venta y fecha efectiva del traspaso",
      prompt: "Agrega contrato, formulario y soporte registral que muestre cuándo quedó inscrito el traspaso.",
      reason: "La fecha de la venta y la fecha registrada pueden producir análisis distintos.",
      priority: 116,
    });
  }
  if (orientation.documentKind === "relato-denuncia" && /estaf|transferencia|billetera digital/.test(context)) {
    tailored.push({
      id: "digital-fraud-transaction",
      type: "pruebas",
      title: "Transferencia, chats y perfil de venta",
      prompt: "Agrega comprobante e ID de transacción, chats, URL, perfil y datos visibles de la cuenta sin editar originales.",
      reason: "Conecta el pago con la oferta y permite reportar la operación sin prometer recuperación.",
      priority: 116,
    });
  }
  return tailored;
}

export function getSuggestedCaseBlocks(
  context: LegalCategory | LegalOrientation,
  elements: CaseElement[],
): CaseBlockSuggestion[] {
  const category =
    typeof context === "string" ? context : categoryByDocumentKind[context.documentKind];
  const contextual = typeof context === "string" ? [] : contextualSuggestions(context);
  const existing = new Set(elements.map((element) => `${element.type}:${normalize(element.title)}`));
  return [...new Map([...contextual, ...suggestionsByCategory[category], ...sharedSuggestions].map((item) => [item.id, item])).values()]
    .filter((suggestion) => !existing.has(`${suggestion.type}:${normalize(suggestion.title)}`))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

const sharedCost = "La orientación pública indicada puede ser gratuita; confirma condiciones y costos adicionales en el canal oficial.";
const officialTiming = "Verifica términos y disponibilidad en la fuente oficial; esta guía no calcula vencimientos.";

function routeForDocument(
  documentKind: DocumentKind,
  city: string,
): ColombianProcedureStep[] {
  if (documentKind === "arrendamiento-comunicacion") {
    return [
      {
        id: "lease-prepare",
        stage: "Preparar",
        title: "Aclara contrato, causal y pagos",
        detail: "Distingue si eres arrendador o arrendatario, vivienda o local, y si existe solo un aviso o ya una actuación judicial.",
        entity: "Tu expediente",
        channel: "Completa los bloques del caso antes de responder",
        requirements: ["Contrato o prueba del acuerdo", "Aviso completo", "Comprobantes de canon, servicios y administración"],
        expectedOutput: "Cronología y lista de soportes verificables",
        nextAction: "No entregues el inmueble ni tomes medidas de hecho basándote solo en esta guía.",
        timing: officialTiming,
        cost: "Sin costo dentro de la aplicación.",
        sourceIds: ["ley-820"],
      },
      {
        id: "lease-write",
        stage: "Radicar",
        title: "Deja una comunicación escrita y comprobable",
        detail: "Pide o comunica la causal, el fundamento, la fecha y el procedimiento propuesto sin afirmar que una comunicación privada equivale a una orden judicial.",
        entity: "Arrendador, arrendatario o inmobiliaria",
        channel: "Canal escrito que permita conservar envío y recepción",
        requirements: ["Datos de las partes", "Identificación del inmueble", "Solicitud concreta", "Anexos relevantes"],
        expectedOutput: "Copia de la comunicación y prueba de entrega",
        nextAction: "Guarda la respuesta como un nuevo bloque del expediente.",
        timing: officialTiming,
        cost: "El envío puede tener costo según el canal elegido.",
        sourceIds: ["ley-820"],
      },
      {
        id: "lease-review",
        stage: "Dar seguimiento",
        title: "Valida conciliación o revisión judicial",
        detail: "Una Casa de Justicia o un consultorio jurídico puede orientar la ruta. Si ya hay demanda, orden o fecha próxima, solicita revisión humana urgente.",
        entity: "Casa de Justicia o consultorio jurídico",
        channel: `Directorio oficial y disponibilidad para ${city}`,
        requirements: ["Carpeta del caso", "Comunicaciones", "Documento judicial completo, si existe"],
        expectedOutput: "Orientación, constancia de atención o definición del trámite siguiente",
        nextAction: "Si se propone conciliación, confirma que sea segura y adecuada para el conflicto.",
        timing: officialTiming,
        cost: sharedCost,
        sourceIds: ["casas-justicia", "consultorios", "codigo-general-proceso"],
      },
    ];
  }

  if (documentKind === "reclamacion-laboral") {
    return [
      {
        id: "labor-prepare",
        stage: "Preparar",
        title: "Identifica vínculo, periodos y valores",
        detail: "Separa salario, prestaciones, liquidación u otros conceptos y confirma si eras trabajador privado, servidor público o contratista.",
        entity: "Tu expediente",
        channel: "Completa los bloques laborales sugeridos",
        requirements: ["Contrato o pruebas del vínculo", "Periodos pendientes", "Pagos recibidos", "Datos del empleador"],
        expectedOutput: "Relación clara de conceptos y evidencias",
        nextAction: "Pide revisión humana si el tipo de vínculo no es claro.",
        timing: "No postergues la revisión: cada obligación puede tener su propio término.",
        cost: "Sin costo dentro de la aplicación.",
        sourceIds: ["codigo-trabajo"],
      },
      {
        id: "labor-claim",
        stage: "Radicar",
        title: "Envía la reclamación al empleador",
        detail: "Solicita por escrito el pago o la explicación de los conceptos identificados y conserva prueba de que fue recibida.",
        entity: "Empleador o contratante",
        channel: "Canal escrito con constancia de recepción",
        requirements: ["Hechos y periodos", "Solicitudes separadas", "Soportes", "Canal de respuesta"],
        expectedOutput: "Reclamación fechada, recibido y respuesta del empleador",
        nextAction: "Agrega la respuesta o el silencio al expediente.",
        timing: officialTiming,
        cost: "La reclamación directa no tiene una tasa pública.",
        sourceIds: ["codigo-trabajo"],
      },
      {
        id: "labor-escalate",
        stage: "Dar seguimiento",
        title: "Escala por el canal que puede darte el resultado",
        detail: "La Inspección del Trabajo puede orientar, recibir una queja o facilitar conciliación, pero no reemplaza al juez para declarar y ordenar el pago individual.",
        entity: "Ministerio del Trabajo, consultorio jurídico o juez laboral",
        channel: `Verifica Dirección Territorial y atención disponible para ${city}`,
        requirements: ["Reclamación y recibido", "Respuesta, si existe", "Soportes del vínculo y de la deuda"],
        expectedOutput: "Radicado de queja, constancia de conciliación o evaluación de una demanda",
        nextAction: "Confirma con orientación humana cuál de esas salidas corresponde a tu vínculo y cuantía.",
        timing: officialTiming,
        cost: sharedCost,
        sourceIds: ["legalapp", "consultorios", "codigo-trabajo"],
      },
    ];
  }

  if (documentKind === "solicitud-salud") {
    return [
      {
        id: "health-safety",
        stage: "Atención inmediata",
        title: "Atiende primero cualquier riesgo actual",
        detail: "Si hay una emergencia o deterioro grave, busca atención de urgencias. No esperes a terminar formularios ni a recibir orientación digital.",
        entity: "Servicio de urgencias",
        channel: "Atención presencial o línea de emergencias local",
        requirements: ["Información clínica disponible", "Orden médica, si la tienes"],
        expectedOutput: "Valoración y registro de atención",
        nextAction: "Cuando estés a salvo, conserva historia, órdenes y soportes.",
        timing: "Inmediato cuando existe riesgo actual.",
        cost: "La cobertura y cobros dependen del servicio; no retrases una emergencia por esta estimación.",
        sourceIds: ["ley-1751"],
      },
      {
        id: "health-pqrs",
        stage: "Radicar",
        title: "Presenta una solicitud concreta a EPS o IPS",
        detail: "Pide el servicio ordenado, la fecha de prestación y una explicación escrita si existe negativa.",
        entity: "EPS o IPS responsable",
        channel: "PQR, oficina o canal que entregue número de radicado",
        requirements: ["Orden médica", "Resumen del riesgo", "Negativa o autorización", "Datos de contacto"],
        expectedOutput: "Número de radicado y respuesta verificable",
        nextAction: "Guarda el radicado y registra cualquier cambio en tu estado de salud.",
        timing: "La urgencia clínica y el plazo administrativo no son lo mismo; verifica ambos.",
        cost: "La radicación no debería requerir intermediarios pagos.",
        sourceIds: ["ley-1751"],
      },
      {
        id: "health-escalate",
        stage: "Dar seguimiento",
        title: "Escala la barrera con apoyo institucional",
        detail: "Solicita orientación a la Defensoría o Personería. La tutela puede ser una opción según la urgencia, la evidencia y las circunstancias; no es automática.",
        entity: "Defensoría, Personería o Rama Judicial",
        channel: `Canal oficial disponible para ${city}; Tutela en Línea si corresponde`,
        requirements: ["Radicado y respuesta", "Orden médica", "Explicación del riesgo", "Carpeta del caso"],
        expectedOutput: "Orientación o radicado judicial, si la tutela resulta procedente",
        nextAction: "Si existe una orden judicial y no se cumple, vuelve al mismo despacho para orientación sobre cumplimiento.",
        timing: officialTiming,
        cost: "La tutela no requiere abogado; verifica cualquier gasto accesorio.",
        sourceIds: ["defensoria", "tutela-linea", "decreto-2591"],
      },
    ];
  }

  if (documentKind === "medida-proteccion") {
    return [
      {
        id: "protection-safety",
        stage: "Atención inmediata",
        title: "Busca un lugar seguro y activa ayuda",
        detail: "Si hay peligro actual llama al 123. Si hay niñas, niños o adolescentes, usa también la Línea 141 del ICBF.",
        entity: "Emergencias e ICBF, según el riesgo",
        channel: "123 para emergencia; Línea 141 para niñez",
        requirements: ["No esperes a reunir pruebas para pedir protección"],
        expectedOutput: "Registro de atención y activación de la ruta de protección",
        nextAction: "Evita contactar a la persona señalada si hacerlo aumenta el riesgo.",
        timing: "Inmediato ante peligro actual.",
        cost: "Canales públicos de emergencia y orientación.",
        sourceIds: ["icbf-linea-141", "ley-2126"],
      },
      {
        id: "protection-request",
        stage: "Radicar",
        title: "Solicita medidas de protección",
        detail: "La solicitud puede ser verbal o escrita. Cuenta los hechos, el riesgo y las medidas concretas que necesitas; los soportes disponibles ayudan, pero no deben ser una barrera para recibirte.",
        entity: "Comisaría de Familia",
        channel: `Verifica la Comisaría y canal disponible para ${city}`,
        requirements: ["Relato de hechos", "Ubicación segura para notificaciones", "Datos disponibles de personas en riesgo"],
        expectedOutput: "Constancia de solicitud y decisión sobre medidas iniciales",
        nextAction: "Conserva copia y pregunta cómo consultar el seguimiento.",
        timing: "Solicita atención cuanto antes; confirma las actuaciones posteriores con la Comisaría.",
        cost: "La solicitud pública no requiere abogado.",
        sourceIds: ["comisarias", "ley-2126"],
      },
      {
        id: "protection-followup",
        stage: "Dar seguimiento",
        title: "Activa Fiscalía y revisión jurídica cuando corresponda",
        detail: "Los posibles delitos pueden denunciarse en paralelo. No uses conciliación como salida automática cuando exista violencia o coerción.",
        entity: "Fiscalía, Comisaría o consultorio jurídico",
        channel: "Canales oficiales y seguimiento con el número de radicado",
        requirements: ["Medidas emitidas", "Radicados", "Soportes disponibles", "Datos de incumplimientos"],
        expectedOutput: "NUNC o radicado y plan de seguimiento",
        nextAction: "Reporta de inmediato cualquier incumplimiento o nuevo riesgo.",
        timing: officialTiming,
        cost: sharedCost,
        sourceIds: ["fiscalia-denuncia", "consultorios", "ley-2126"],
      },
    ];
  }

  if (documentKind === "resumen-familia") {
    return [
      {
        id: "family-prepare",
        stage: "Preparar",
        title: "Separa alimentos, custodia y visitas",
        detail: "Define el resultado principal y registra si ya existe acuerdo, acta, sentencia o medida.",
        entity: "Tu expediente",
        channel: "Completa los bloques familiares sugeridos",
        requirements: ["Registro civil disponible", "Acuerdos o decisiones", "Gastos y necesidades", "Datos de contacto"],
        expectedOutput: "Resumen familiar y lista de documentos",
        nextAction: "Si aparece violencia o riesgo, cambia inmediatamente a la ruta de protección.",
        timing: officialTiming,
        cost: "Sin costo dentro de la aplicación.",
        sourceIds: ["icbf-conciliacion"],
      },
      {
        id: "family-request",
        stage: "Radicar",
        title: "Solicita orientación o conciliación en el ICBF",
        detail: "El Centro Zonal puede orientar la ruta para alimentos, custodia o visitas. La conciliación solo aplica cuando es segura y jurídicamente adecuada.",
        entity: "Defensoría de Familia del ICBF",
        channel: `Consulta el Centro Zonal y atención disponible para ${city}`,
        requirements: ["Identificación básica", "Información de la niña, niño o adolescente", "Solicitud concreta", "Soportes disponibles"],
        expectedOutput: "Radicado, cita, acta de acuerdo o constancia de no acuerdo",
        nextAction: "Pide copia de toda acta o constancia y agrégala al expediente.",
        timing: officialTiming,
        cost: "Confirma gratuidad y requisitos en el canal oficial del ICBF.",
        sourceIds: ["icbf-conciliacion", "ley-2220"],
      },
      {
        id: "family-followup",
        stage: "Dar seguimiento",
        title: "Define cumplimiento o paso judicial",
        detail: "Una cuota ya fijada e incumplida, una fijación nueva y una modificación tienen objetivos distintos. Obtén revisión antes de escoger demanda o denuncia.",
        entity: "ICBF, consultorio jurídico o juez de familia",
        channel: "Directorio oficial y remisión del ICBF",
        requirements: ["Acta o decisión previa", "Constancia de incumplimiento", "Carpeta del caso"],
        expectedOutput: "Definición de la actuación siguiente y sus requisitos",
        nextAction: "No asumas que una denuncia penal reemplaza el cobro o la fijación de la cuota.",
        timing: officialTiming,
        cost: sharedCost,
        sourceIds: ["icbf-conciliacion", "consultorios"],
      },
    ];
  }

  if (documentKind === "relato-denuncia") {
    return [
      {
        id: "crime-safety",
        stage: "Atención inmediata",
        title: "Prioriza la seguridad y la atención médica",
        detail: "Si el hecho ocurre ahora o hay peligro, llama al 123. No esperes a completar el expediente para pedir ayuda.",
        entity: "Emergencias",
        channel: "Línea 123 y servicios de urgencias",
        requirements: ["Ubicación segura", "Descripción breve del riesgo actual"],
        expectedOutput: "Registro de atención o respuesta de emergencia",
        nextAction: "Cuando estés a salvo, conserva sin modificar los soportes originales.",
        timing: "Inmediato ante peligro actual.",
        cost: "Canal público de emergencia.",
        sourceIds: ["fiscalia-denuncia"],
      },
      {
        id: "crime-prepare",
        stage: "Preparar",
        title: "Ordena el relato y conserva originales",
        detail: "Registra tiempo, modo, lugar, personas y testigos. Lista los archivos sin editarlos ni publicarlos.",
        entity: "Tu expediente",
        channel: "Usa los bloques sugeridos del caso",
        requirements: ["Cronología", "Índice de evidencias", "Datos de testigos", "Necesidades de protección"],
        expectedOutput: "Relato organizado e índice de anexos",
        nextAction: "No interrogues repetidamente a una persona menor de edad ni la expongas.",
        timing: "Denuncia tan pronto sea seguro; algunos hechos pueden tener términos especiales.",
        cost: "Sin costo dentro de la aplicación.",
        sourceIds: ["fiscalia-denuncia", "icbf-linea-141"],
      },
      {
        id: "crime-file",
        stage: "Radicar",
        title: "Presenta la denuncia y conserva el NUNC",
        detail: "Usa un canal oficial de la Fiscalía. La aplicación no determina el delito ni garantiza una decisión de la autoridad.",
        entity: "Fiscalía General de la Nación",
        channel: "Línea 122, canal virtual o punto oficial de recepción",
        requirements: ["Relato", "Datos de contacto seguros", "Anexos disponibles", "Solicitud de protección, si aplica"],
        expectedOutput: "Número Único de Noticia Criminal (NUNC) o constancia de recepción",
        nextAction: "Guarda el número completo y pregunta por el canal de consulta y actualización.",
        timing: officialTiming,
        cost: "La denuncia es gratuita y no requiere abogado.",
        sourceIds: ["fiscalia-denuncia"],
      },
    ];
  }

  if (documentKind === "solicitud-administrativa") {
    return [
      {
        id: "admin-review",
        stage: "Preparar",
        title: "Revisa acto, notificación y recursos",
        detail: "Lee el documento completo y la parte que indica recursos. Una petición genérica no reemplaza un recurso ni suspende automáticamente un término.",
        entity: "Tu expediente y revisión humana",
        channel: "Completa los bloques administrativos sugeridos",
        requirements: ["Acto completo", "Constancia de notificación", "Parte de recursos", "Expediente o radicado"],
        expectedOutput: "Lista de datos críticos y preguntas para revisión",
        nextAction: "Si hay plazo cercano, solicita revisión jurídica hoy.",
        timing: "Puede existir un término para actuar; no lo calcules solo con esta guía.",
        cost: "Sin costo dentro de la aplicación.",
        sourceIds: ["cpaca"],
      },
      {
        id: "admin-file",
        stage: "Radicar",
        title: "Presenta la actuación correcta, no solo una petición",
        detail: "Según el documento puede corresponder pedir información, corregir datos o interponer un recurso. Confirma cuál aplica antes de enviarlo.",
        entity: "Entidad que expidió el acto o autoridad indicada",
        channel: "Sede electrónica, correo o ventanilla que entregue radicado",
        requirements: ["Solicitud o recurso identificado", "Razones", "Anexos", "Canal de notificación"],
        expectedOutput: "Número de radicado y copia íntegra de lo presentado",
        nextAction: "Guarda el comprobante y la fecha exacta de presentación.",
        timing: officialTiming,
        cost: "Las peticiones son gratuitas; otros trámites pueden tener condiciones distintas.",
        sourceIds: ["cpaca", "ley-1755"],
      },
      {
        id: "admin-followup",
        stage: "Dar seguimiento",
        title: "Controla respuesta y escalamiento",
        detail: "Verifica el estado por el canal oficial. Una eventual tutela, conciliación o demanda requiere analizar el acto, los recursos y el término aplicable.",
        entity: "Entidad, consultorio jurídico o autoridad competente",
        channel: `Canal oficial y orientación disponible para ${city}`,
        requirements: ["Radicado", "Respuesta o evidencia de silencio", "Acto y notificación", "Carpeta del caso"],
        expectedOutput: "Respuesta de fondo o definición de la vía siguiente",
        nextAction: "No dejes vencer un recurso o caducidad esperando una petición distinta.",
        timing: officialTiming,
        cost: sharedCost,
        sourceIds: ["consultorios", "defensoria", "tutela-linea"],
      },
    ];
  }

  const urgent = documentKind === "resumen-urgente";
  return [
    {
      id: "general-collect",
      stage: "Preparar",
      title: urgent ? "Conserva la notificación completa" : "Ordena el problema y el resultado esperado",
      detail: urgent
        ? "Guarda mensaje, sobre o constancia, fecha de recepción, anexos, juzgado y radicado."
        : "Separa hechos, personas, fechas, soportes y la respuesta que necesitas.",
      entity: "Tu expediente",
      channel: "Completa los bloques sugeridos",
      requirements: urgent ? ["Notificación", "Anexos", "Fecha y medio de recepción", "Radicado"] : ["Cronología", "Soportes", "Solicitud concreta"],
      expectedOutput: urgent ? "Paquete completo para revisión urgente" : "Resumen reutilizable del caso",
      nextAction: urgent ? "No respondas con un borrador genérico ni dejes pasar el día." : "Usa el resumen para pedir una orientación inicial.",
      timing: urgent ? "Busca revisión humana hoy." : officialTiming,
      cost: "Sin costo dentro de la aplicación.",
      sourceIds: urgent ? ["rama-procesos", "codigo-general-proceso-judicial"] : ["legalapp"],
    },
    {
      id: "general-verify",
      stage: urgent ? "Atención inmediata" : "Radicar",
      title: urgent ? "Verifica el proceso por el canal oficial" : "Valida la autoridad y el trámite",
      detail: urgent
        ? "Consulta el radicado sin asumir que la consulta reemplaza la notificación recibida."
        : "Una Casa de Justicia o consultorio jurídico puede orientar la autoridad y el mecanismo aplicable.",
      entity: urgent ? "Rama Judicial" : "Casa de Justicia o consultorio jurídico",
      channel: urgent ? "Consulta de Procesos Nacional Unificada" : `Directorio y disponibilidad para ${city}`,
      requirements: ["Carpeta del caso", "Documento o comunicación recibida"],
      expectedOutput: urgent ? "Verificación básica del expediente judicial" : "Constancia u orientación sobre la ruta",
      nextAction: "Conserva enlaces, fecha de consulta y cualquier número de atención.",
      timing: urgent ? "Inmediato, sin sustituir la revisión profesional." : officialTiming,
      cost: sharedCost,
      sourceIds: urgent ? ["rama-procesos"] : ["casas-justicia", "consultorios"],
    },
    {
      id: "general-human",
      stage: "Dar seguimiento",
      title: urgent ? "Solicita revisión jurídica urgente" : "Confirma el paso antes de actuar",
      detail: urgent
        ? "Lleva la notificación y todos sus anexos a revisión. Esta aplicación no calcula ni contesta términos judiciales."
        : "Define con la entidad o profesional qué documento, autoridad y requisitos corresponden.",
      entity: "Consultorio jurídico o Defensoría del Pueblo",
      channel: `Canal oficial disponible para ${city}`,
      requirements: ["Carpeta completa", "Preguntas pendientes", "Datos seguros de contacto"],
      expectedOutput: "Recomendación humana y lista confirmada de acciones",
      nextAction: "Actualiza el expediente con lo que te indiquen.",
      timing: urgent ? "Hoy, si existe notificación, audiencia o plazo próximo." : officialTiming,
      cost: sharedCost,
      sourceIds: ["consultorios", "defensoria"],
    },
  ];
}

export function getColombianProcedureSteps(
  orientation: LegalOrientation,
  city: string,
): ColombianProcedureStep[] {
  const steps = routeForDocument(orientation.documentKind, city.trim() || "tu municipio");

  if (orientation.sourceIds.includes("icbf-linea-141") && steps[0]) {
    steps[0] = {
      ...steps[0],
      detail: `${steps[0].detail} Si hay una niña, niño o adolescente en riesgo, comunícate también con la Línea 141 del ICBF.`,
      entity: `${steps[0].entity} e ICBF`,
      channel: `${steps[0].channel}; Línea 141 para niñez`,
      sourceIds: [...new Set([...steps[0].sourceIds, "icbf-linea-141"])],
    };
  }

  if (orientation.sourceIds.includes("ley-1146") && steps[0]) {
    steps[0] = {
      ...steps[0],
      stage: "Atención inmediata",
      title: "Protege y busca atención integral en salud",
      detail: "Evita el contacto con la persona señalada y solicita atención médica y psicológica inmediata. No es necesario denunciar primero y no pidas a la niña o niño que repita el relato.",
      entity: "Servicio de salud e ICBF",
      channel: "Urgencias o servicio de salud; Línea 141 para protección",
      requirements: [
        "No esperes una denuncia, evidencia ni documento para solicitar atención",
        "Información espontánea ya conocida, sin pedir que repita el relato",
        "Acompañante seguro y soportes, solo si están disponibles",
      ],
      expectedOutput: "Registro de atención integral y activación de la ruta de protección",
      nextAction: "Conserva las constancias y sigue la orientación institucional sin confrontar a la persona señalada.",
      timing: "Inmediato, aunque no exista lesión visible ni denuncia previa.",
      sourceIds: ["ley-1146", "icbf-linea-141"],
    };
  }

  if (orientation.sourceIds.includes("ley-820-canon")) {
    if (steps[0]) {
      steps[0] = {
        ...steps[0],
        title: "Verifica contrato, canon y fecha del último reajuste",
        detail: "Separa el canon de administración, servicios e intereses y registra cuánto tiempo se mantuvo el mismo precio.",
        requirements: ["Contrato", "Canon anterior", "Fecha de inicio o último reajuste", "Comprobantes recientes"],
        expectedOutput: "Línea de tiempo y comparación verificable del canon",
        nextAction: "No dejes de pagar ni firmes un cambio basándote solo en esta guía.",
        sourceIds: ["ley-820-canon"],
      };
    }
    if (steps[1]) {
      steps[1] = {
        ...steps[1],
        title: "Pide por escrito el cálculo del reajuste",
        detail: "Solicita valor anterior y nuevo, porcentaje, IPC usado, fecha de aplicación y soporte de cualquier interés.",
        requirements: ["Identificación del contrato", "Valores comparados", "Solicitud concreta", "Canal de respuesta"],
        expectedOutput: "Copia de la solicitud, recibido y respuesta con el cálculo",
        sourceIds: ["ley-820-canon"],
      };
    }
    if (steps[2]) {
      steps[2] = {
        ...steps[2],
        title: "Busca orientación específica sobre el reajuste",
        detail: "Lleva el contrato, los pagos y la comunicación a una Casa de Justicia, autoridad municipal competente o consultorio jurídico. Una discusión sobre el reajuste no implica por sí sola una restitución judicial.",
        entity: "Casa de Justicia, autoridad municipal o consultorio jurídico",
        requirements: ["Contrato", "Historial del canon", "Comunicación del reajuste", "Cálculo recibido o solicitado"],
        expectedOutput: "Orientación o constancia sobre la revisión del reajuste",
        nextAction: "Conserva la orientación y cualquier respuesta escrita en el expediente.",
        sourceIds: ["ley-820-canon", "casas-justicia", "consultorios"],
      };
    }
  }

  if (orientation.sourceIds.includes("codigo-policia-tenencia") && steps[2]) {
    steps[2] = {
      ...steps[2],
      title: "Verifica si hubo una perturbación de la tenencia",
      detail: "Que un cerrajero observe la chapa no prueba por sí solo una perturbación. Si hubo intento o cambio efectivo de cerradura, negativa de acceso, ingreso o daños, solicita orientación inmediata sobre protección policiva.",
      entity: "Inspector de Policía, Casa de Justicia o consultorio jurídico",
      requirements: ["Relato exacto de lo ocurrido", "Pruebas disponibles", "Contrato o prueba de tenencia", "Información sobre acceso o daños"],
      expectedOutput: "Definición de si corresponde querella policiva u otra ruta",
      nextAction: "Prioriza tu seguridad y no confrontes ni adoptes medidas de hecho.",
      sourceIds: ["codigo-policia-tenencia", "casas-justicia", "consultorios"],
    };
  }

  if (orientation.sourceIds.includes("codigo-transito")) {
    if (steps[0]) {
      steps[0] = {
        ...steps[0],
        title: "Compara infracción, traspaso registrado y notificación",
        detail: "Revisa la fecha de la infracción frente a la fecha efectiva del traspaso y pide el expediente y la prueba de notificación.",
        requirements: ["Resolución o comparendo completo", "Expediente", "Prueba de notificación", "Contrato y soporte registral del traspaso"],
        expectedOutput: "Cronología registral y administrativa lista para revisión",
        sourceIds: ["codigo-transito", "cpaca"],
      };
    }
    if (steps[1]) {
      steps[1] = {
        ...steps[1],
        title: "Define la actuación ante la autoridad de tránsito",
        detail: "Con el acto completo, confirma si corresponde ejercer defensa, interponer un recurso o solicitar corrección de datos; una petición genérica no sustituye esas actuaciones.",
        entity: "Autoridad de tránsito que expidió el acto",
        sourceIds: ["codigo-transito", "cpaca"],
      };
    }
  }

  if (orientation.sourceIds.includes("codigo-penal-estafa") && steps[0]) {
    steps[0] = {
      ...steps[0],
      stage: "Preparar",
      title: "Conserva y reporta la operación digital",
      detail: "Guarda comprobante, ID de transacción, chats, URL y perfil. Reporta de inmediato a la billetera, banco y plataforma sin compartir claves ni enviar más dinero.",
      entity: "Entidad financiera, billetera o plataforma",
      channel: "Canal oficial de fraude o reclamaciones que entregue número de caso",
      requirements: ["ID de transacción", "Comprobante", "Chats y perfil", "Datos visibles de la cuenta receptora"],
      expectedOutput: "Número de reporte y conservación de la evidencia",
      nextAction: "El reporte no garantiza reversión y no reemplaza la actuación ante la Fiscalía.",
      timing: "Actúa pronto; la autoridad define si se requiere denuncia o querella.",
      sourceIds: ["superfinanciera-quejas"],
    };
    if (steps[2]) {
      steps[2] = {
        ...steps[2],
        title: "Pon los hechos en conocimiento de la Fiscalía",
        detail: "Presenta el relato y confirma con la Fiscalía si jurídicamente corresponde denuncia o querella. La herramienta no define el delito ni calcula el vencimiento.",
        requirements: ["Relato", "Comprobante", "Chats y perfil", "Número del reporte financiero, si existe"],
        expectedOutput: "NUNC, constancia de recepción o instrucción oficial sobre la actuación aplicable",
        nextAction: "Guarda el número completo y pregunta por el canal de consulta y actualización.",
        timing: "Actúa pronto: algunas conductas pueden requerir querella y estar sujetas a un término legal.",
        sourceIds: ["codigo-penal-estafa", "codigo-procedimiento-penal-querella", "fiscalia-denuncia"],
      };
    }
  }

  if (
    orientation.documentKind === "medida-proteccion" &&
    (orientation.sourceIds.includes("codigo-general-proceso") ||
      orientation.sourceIds.includes("codigo-general-proceso-judicial")) &&
    steps[2]
  ) {
    steps[2] = {
      ...steps[2],
      detail: `${steps[2].detail} Además, lleva la notificación o citación judicial completa a revisión humana urgente.`,
      requirements: [...steps[2].requirements, "Notificación judicial completa y anexos"],
      expectedOutput: `${steps[2].expectedOutput} y definición urgente del plazo judicial`,
      sourceIds: [...new Set([...steps[2].sourceIds, "codigo-general-proceso-judicial"])],
    };
  }

  return steps;
}

export function getCaseOutputs(
  orientation: LegalOrientation,
  elements: CaseElement[],
  completedSteps: number[],
): CaseOutput[] {
  const types = new Set(elements.map((element) => element.type));
  const hasFacts = types.has("hechos");
  const hasEvidence = types.has("pruebas");
  const confirmed = elements.filter((element) => element.status === "listo").length;

  return [
    {
      id: "ruta",
      title: "Ruta de trámites",
      detail: `${completedSteps.length} de 3 pasos marcados. Incluye requisitos, canal, comprobante y seguimiento.`,
      status: completedSteps.length >= 3 ? "listo" : completedSteps.length ? "en-proceso" : "pendiente",
      actionLabel: "Ver pasos",
    },
    {
      id: "borrador",
      title: orientation.recommendedDocument,
      detail: hasFacts
        ? "Borrador generado con los hechos del expediente; completa y revisa los campos antes de usarlo."
        : "Agrega y confirma los hechos principales para preparar un borrador útil.",
      status: hasFacts ? "en-proceso" : "pendiente",
      actionLabel: "Revisar borrador",
    },
    {
      id: "carpeta",
      title: "Carpeta para revisión humana",
      detail: `${confirmed} piezas confirmadas con resumen, ruta y fuentes oficiales sugeridas.`,
      status: types.size >= 3 && confirmed >= 2 ? "listo" : elements.length ? "en-proceso" : "pendiente",
      actionLabel: "Descargar carpeta",
    },
    {
      id: "comprobantes",
      title: "Checklist de comprobantes",
      detail: hasEvidence
        ? "Ya hay pruebas registradas; añade después cada radicado, recibido, acta o NUNC que obtengas."
        : "Aún falta registrar evidencia y los comprobantes que produzca cada trámite.",
      status: hasEvidence ? "en-proceso" : "pendiente",
      actionLabel: "Completar expediente",
    },
  ];
}
