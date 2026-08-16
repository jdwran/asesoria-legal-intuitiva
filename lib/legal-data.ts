export type LegalCategory =
  | "arrendamiento"
  | "laboral"
  | "salud"
  | "familia"
  | "penal"
  | "administrativo"
  | "otro";

export type CaseElementType =
  | "hechos"
  | "personas"
  | "pruebas"
  | "fechas"
  | "normas"
  | "documentos";

export type DocumentKind =
  | "arrendamiento-comunicacion"
  | "reclamacion-laboral"
  | "solicitud-salud"
  | "medida-proteccion"
  | "resumen-familia"
  | "relato-denuncia"
  | "solicitud-administrativa"
  | "resumen-urgente"
  | "resumen-general";

export interface CaseElement {
  id: string;
  type: CaseElementType;
  title: string;
  detail: string;
  date?: string;
  status?: "listo" | "pendiente";
  sourceId?: string;
  sourceUrl?: string;
}

export interface OfficialSource {
  id: string;
  shortTitle: string;
  title: string;
  organization: string;
  url: string;
}

export interface LegalOrientation {
  caseTitle: string;
  category: LegalCategory;
  urgency: "baja" | "media" | "alta";
  plainSummary: string;
  rightTitle: string;
  rightExplanation: string;
  sourceIds: string[];
  nextSteps: Array<{
    title: string;
    detail: string;
  }>;
  freeHelp: Array<{
    name: string;
    detail: string;
    channel: string;
    sourceId: string;
  }>;
  documentKind: DocumentKind;
  recommendedDocument: string;
  documentReason: string;
  triageQuestions: string[];
  extractedFacts: string[];
}

export const documentTemplates: Record<DocumentKind, { label: string; reason: string }> = {
  "arrendamiento-comunicacion": {
    label: "Comunicación escrita a la arrendadora",
    reason: "Para pedir por escrito la causal, los soportes y las condiciones de la terminación, sin asumir que aplica el derecho de petición frente a un particular.",
  },
  "reclamacion-laboral": {
    label: "Reclamación laboral escrita",
    reason: "Para dejar constancia del pago pendiente y de tu solicitud.",
  },
  "solicitud-salud": {
    label: "Solicitud prioritaria de servicio de salud",
    reason: "Para pedir la atención y dejar un radicado verificable.",
  },
  "medida-proteccion": {
    label: "Solicitud de medida de protección",
    reason: "Para organizar los hechos y pedir acciones concretas de protección.",
  },
  "resumen-familia": {
    label: "Resumen de situación familiar",
    reason: "Para organizar hechos, personas, decisiones previas y necesidades antes de solicitar orientación.",
  },
  "relato-denuncia": {
    label: "Relato organizado para denuncia",
    reason: "Para llevar una cronología clara, datos de contacto y un índice de evidencias.",
  },
  "solicitud-administrativa": {
    label: "Solicitud de información o revisión",
    reason: "Para dejar una petición concreta y un radicado verificable mientras se revisa la ruta aplicable.",
  },
  "resumen-urgente": {
    label: "Resumen para revisión jurídica urgente",
    reason: "Para entregar los hechos y anexos a quien revise el plazo; no sirve por sí solo para contestar la actuación.",
  },
  "resumen-general": {
    label: "Resumen para orientación jurídica",
    reason: "Para llevar los hechos, soportes y preguntas a una entidad o profesional que pueda definir la ruta.",
  },
};

export function getSafeDocumentKind(
  category: LegalCategory,
  urgency: LegalOrientation["urgency"],
): DocumentKind {
  if (category === "arrendamiento") return "arrendamiento-comunicacion";
  if (category === "laboral") return "reclamacion-laboral";
  if (category === "salud") return "solicitud-salud";
  if (category === "familia") return urgency === "alta" ? "medida-proteccion" : "resumen-familia";
  if (category === "penal") return "relato-denuncia";
  if (category === "administrativo") return "solicitud-administrativa";
  return urgency === "alta" ? "resumen-urgente" : "resumen-general";
}

export const officialSources: OfficialSource[] = [
  {
    id: "constitucion",
    shortTitle: "Constitución Política",
    title: "Constitución Política de Colombia",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=1687988",
  },
  {
    id: "ley-820",
    shortTitle: "Ley 820 de 2003",
    title: "Régimen de arrendamiento de vivienda urbana",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1669010",
  },
  {
    id: "ley-1755",
    shortTitle: "Ley 1755 de 2015",
    title: "Regulación del derecho fundamental de petición",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=30043679",
  },
  {
    id: "codigo-trabajo",
    shortTitle: "Código Sustantivo del Trabajo",
    title: "Código Sustantivo del Trabajo",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Codigo/30019323",
  },
  {
    id: "ley-2126",
    shortTitle: "Ley 2126 de 2021",
    title: "Creación y funcionamiento de las comisarías de familia",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F30042087",
  },
  {
    id: "legalapp",
    shortTitle: "LegalApp",
    title: "Guía oficial de trámites y servicios de justicia",
    organization: "Ministerio de Justicia y del Derecho",
    url: "https://www.minjusticia.gov.co/programas/legalapp",
  },
  {
    id: "rama-procesos",
    shortTitle: "Consulta de procesos",
    title: "Consulta de Procesos Nacional Unificada",
    organization: "Consejo Superior de la Judicatura",
    url: "https://consultaprocesos.ramajudicial.gov.co/Procesos/Index",
  },
  {
    id: "cpaca",
    shortTitle: "Ley 1437 de 2011",
    title: "Código de Procedimiento Administrativo y de lo Contencioso Administrativo",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1680117",
  },
  {
    id: "ley-2220",
    shortTitle: "Ley 2220 de 2022",
    title: "Estatuto de Conciliación",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F30044356",
  },
  {
    id: "codigo-general-proceso",
    shortTitle: "Ley 1564 de 2012",
    title: "Código General del Proceso",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1683572",
  },
  {
    id: "decreto-2591",
    shortTitle: "Decreto 2591 de 1991",
    title: "Reglamentación de la acción de tutela",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=1470723",
  },
  {
    id: "ley-1751",
    shortTitle: "Ley 1751 de 2015",
    title: "Ley Estatutaria de Salud",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F30019746",
  },
  {
    id: "sentencias-corte",
    shortTitle: "Sentencias Corte Constitucional",
    title: "Dataset oficial de sentencias proferidas por la Corte Constitucional",
    organization: "Datos Abiertos Colombia · Corte Constitucional",
    url: "https://www.datos.gov.co/Justicia-y-Derecho/Sentencias-proferidas-por-la-Corte-Constitucional/v2k4-2t8s",
  },
  {
    id: "jurisprudencia-rama",
    shortTitle: "Consulta de jurisprudencia",
    title: "Consulta oficial de providencias y relatorías",
    organization: "Consejo Superior de la Judicatura",
    url: "https://jurisprudencia.ramajudicial.gov.co/WebRelatoria/cnsj/index.xhtml",
  },
  {
    id: "casas-justicia",
    shortTitle: "Casas de Justicia",
    title: "Programa Nacional de Casas de Justicia y Convivencia Ciudadana",
    organization: "Ministerio de Justicia y del Derecho",
    url: "https://www.minjusticia.gov.co/programas-co/casas-de-justicia/Paginas/casas.aspx",
  },
  {
    id: "consultorios",
    shortTitle: "Consultorios jurídicos",
    title: "Directorio oficial de consultorios jurídicos y centros de conciliación",
    organization: "Ministerio de Justicia y del Derecho",
    url: "https://minjusticia.gov.co/programas-co/tejiendo-justicia/Paginas/directorio.aspx",
  },
  {
    id: "defensoria",
    shortTitle: "Defensoría del Pueblo",
    title: "Canales oficiales de orientación al ciudadano",
    organization: "Defensoría del Pueblo",
    url: "https://www.defensoria.gov.co/web/guest/orientacion-al-ciudadano",
  },
  {
    id: "fiscalia-denuncia",
    shortTitle: "Canales para denunciar",
    title: "Dónde y cómo denunciar",
    organization: "Fiscalía General de la Nación",
    url: "https://www.fiscalia.gov.co/colombia/servicios-de-informacion-al-ciudadano/donde-y-como-denunciar/",
  },
  {
    id: "tutela-linea",
    shortTitle: "Tutela en Línea",
    title: "Recepción de Tutela y Hábeas Corpus en Línea",
    organization: "Consejo Superior de la Judicatura",
    url: "https://procesojudicial.ramajudicial.gov.co/TutelaEnLinea",
  },
  {
    id: "comisarias",
    shortTitle: "Comisarías de Familia",
    title: "Información oficial sobre Comisarías de Familia",
    organization: "Ministerio de Justicia y del Derecho",
    url: "https://www.minjusticia.gov.co/Sede-Electronica/Paginas/SGR-Comisarias-Familia.aspx",
  },
  {
    id: "icbf-conciliacion",
    shortTitle: "Alimentos, visitas y custodia",
    title: "Garantía del derecho de alimentos, visitas y custodia",
    organization: "GOV.CO · Instituto Colombiano de Bienestar Familiar",
    url: "https://www.gov.co/ficha-tramites-y-servicios/T700",
  },
  {
    id: "icbf-linea-141",
    shortTitle: "Línea 141 del ICBF",
    title: "Protección, emergencia y orientación para niñas, niños y adolescentes",
    organization: "Instituto Colombiano de Bienestar Familiar",
    url: "https://www.icbf.gov.co/noticias/linea-141",
  },
];

export const initialElements: CaseElement[] = [
  {
    id: "fact-1",
    type: "hechos",
    title: "Aviso de desalojo por WhatsApp",
    detail: "La arrendadora pidió entregar el apartamento en cinco días.",
    date: "12 ago 2026",
    status: "listo",
  },
  {
    id: "person-1",
    type: "personas",
    title: "Marta Gómez",
    detail: "Arrendadora · contacto por WhatsApp",
    status: "listo",
  },
  {
    id: "evidence-1",
    type: "pruebas",
    title: "Contrato de arrendamiento.pdf",
    detail: "Contrato firmado el 3 de febrero de 2025 · 1.2 MB",
    status: "listo",
  },
  {
    id: "evidence-2",
    type: "pruebas",
    title: "Captura del aviso.png",
    detail: "Conversación del 12 de agosto · 420 KB",
    status: "listo",
  },
  {
    id: "date-1",
    type: "fechas",
    title: "Fecha exigida para entregar",
    detail: "La arrendadora indicó que se debe entregar el inmueble.",
    date: "17 ago 2026",
    status: "pendiente",
  },
  {
    id: "norm-1",
    type: "normas",
    title: "Ley 820 de 2003",
    detail: "Régimen de arrendamiento de vivienda urbana.",
    status: "listo",
    sourceId: "ley-820",
    sourceUrl: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1669010",
  },
];

export const initialOrientation: LegalOrientation = {
  caseTitle: "Solicitud de desalojo sin preaviso",
  category: "arrendamiento",
  urgency: "alta",
  plainSummary:
    "Tu arrendadora te pidió entregar la vivienda en cinco días por WhatsApp. Hay un contrato escrito y, con la información disponible, no aparece una orden judicial de restitución.",
  rightTitle: "No pueden sacarte por la fuerza ni cambiar las cerraduras",
  rightExplanation:
    "La terminación de un contrato de vivienda debe seguir las causales, avisos y procedimientos aplicables. Un mensaje no autoriza a la arrendadora a desalojarte materialmente por su cuenta. La aplicación exacta depende del contrato y de la causa que invoque.",
  sourceIds: ["ley-820", "constitucion"],
  nextSteps: [
    {
      title: "Conserva el aviso y tu contrato",
      detail: "Guarda la conversación completa, comprobantes de pago y una copia del contrato.",
    },
    {
      title: "Pide la causal y el plazo por escrito",
      detail: "Solicita que la arrendadora indique la causa, la fecha y el fundamento de su solicitud.",
    },
    {
      title: "Busca orientación gratuita hoy",
      detail: "Lleva este expediente a una Casa de Justicia, Personería o consultorio jurídico.",
    },
  ],
  freeHelp: [
    {
      name: "Casa de Justicia",
      detail: "Orientación y acceso a mecanismos de resolución de conflictos.",
      channel: "Verifica disponibilidad y sede por municipio en el portal oficial",
      sourceId: "casas-justicia",
    },
    {
      name: "Consultorio jurídico universitario",
      detail: "Asesoría gratuita para personas que cumplan sus criterios de atención.",
      channel: "Verifica sede, criterios de atención y cita en el directorio oficial",
      sourceId: "consultorios",
    },
  ],
  documentKind: "arrendamiento-comunicacion",
  recommendedDocument: "Comunicación escrita a la arrendadora",
  documentReason: "Para pedir por escrito la causal, los soportes y las condiciones de la terminación, sin asumir que aplica el derecho de petición frente a un particular.",
  triageQuestions: [
    "¿La arrendadora indicó por qué quiere terminar el contrato?",
    "¿Estás al día con el canon y los servicios?",
  ],
  extractedFacts: [
    "Existe un contrato escrito",
    "El aviso fue enviado por WhatsApp",
    "El plazo comunicado fue de cinco días",
    "No se ha informado una orden judicial",
  ],
};

function hasAny(text: string, terms: string[]) {
  const normalizedText = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CO");
  return terms.some((term) =>
    normalizedText.includes(
      term
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es-CO"),
    ),
  );
}

function buildChildRiskOrientation(rawStory: string): LegalOrientation {
  return {
    caseTitle: "Posible riesgo o violencia contra una persona menor de edad",
    category: "penal",
    urgency: "alta",
    plainSummary: rawStory,
    rightTitle: "Las niñas, niños y adolescentes tienen derecho a protección inmediata",
    rightExplanation:
      "No necesitas definir por tu cuenta qué delito pudo ocurrir para pedir ayuda. Prioriza la seguridad, activa una ruta institucional y evita exponer o interrogar repetidamente a la persona menor de edad. Si hay lesiones o posible violencia sexual, busca atención de urgencias.",
    sourceIds: ["constitucion", "icbf-linea-141", "fiscalia-denuncia"],
    nextSteps: [
      {
        title: "Protege a la niña, niño o adolescente",
        detail: "Aléjale de la persona señalada si puedes hacerlo sin aumentar el riesgo. Si hay peligro inmediato, llama al 123.",
      },
      {
        title: "Activa orientación especializada",
        detail: "Comunícate con la Línea 141 del ICBF. Ante un posible delito, usa también un canal oficial de la Fiscalía.",
      },
      {
        title: "Conserva la información sin presionar",
        detail: "Anota las palabras espontáneas, fechas y datos disponibles; guarda soportes y evita pedir que repita el relato innecesariamente.",
      },
    ],
    freeHelp: [
      {
        name: "Línea 141 del ICBF",
        detail: "Protección, emergencia y orientación para niñas, niños y adolescentes.",
        channel: "Línea gratuita nacional disponible 24 horas",
        sourceId: "icbf-linea-141",
      },
      {
        name: "Fiscalía General de la Nación",
        detail: "Recepción de denuncias y orientación sobre sus canales oficiales.",
        channel: "Línea 122, 01 8000 919748 o punto de recepción; verifica el canal virtual",
        sourceId: "fiscalia-denuncia",
      },
    ],
    documentKind: "relato-denuncia",
    recommendedDocument: "Relato organizado para denuncia",
    documentReason: "Para ordenar lo conocido sin sustituir la entrevista especializada ni la actuación de una autoridad.",
    triageQuestions: [
      "¿La niña, niño o adolescente está en peligro o necesita atención médica ahora?",
      "¿La persona señalada todavía tiene contacto o acceso a ella o él?",
    ],
    extractedFacts: [rawStory],
  };
}

function buildFamilyViolenceOrientation(
  rawStory: string,
  city: string,
  hasJudicialDeadline: boolean,
): LegalOrientation {
  const freeHelp: LegalOrientation["freeHelp"] = [
    {
      name: "Comisaría de Familia",
      detail: "Atención y medidas de protección en casos de violencia en el contexto familiar.",
      channel: `Verifica el canal y la autoridad disponible para ${city}`,
      sourceId: "comisarias",
    },
    {
      name: "Línea de emergencia 123",
      detail: "Atención inmediata cuando existe riesgo actual.",
      channel: "Solo ante peligro o emergencia actual",
      sourceId: "comisarias",
    },
  ];

  if (hasJudicialDeadline) {
    freeHelp.push({
      name: "Consultorio jurídico universitario",
      detail: "Revisión urgente de la notificación o audiencia, según competencia y capacidad de atención.",
      channel: "Verifica sede, criterios y cita en el directorio oficial",
      sourceId: "consultorios",
    });
  }

  return {
    caseTitle: hasJudicialDeadline
      ? "Posible violencia familiar y actuación judicial urgente"
      : "Posible situación de violencia familiar",
    category: "familia",
    urgency: "alta",
    plainSummary: rawStory,
    rightTitle: "Tienes derecho a recibir protección inmediata",
    rightExplanation: hasJudicialDeadline
      ? "Prioriza tu seguridad y solicita medidas de protección. Además, una notificación o audiencia puede activar un plazo: conserva el documento completo y pide revisión jurídica humana cuanto antes."
      : "Una Comisaría de Familia puede adoptar medidas de protección dentro de sus competencias. Si hay peligro actual, prioriza tu seguridad y contacta los servicios de emergencia.",
    sourceIds: hasJudicialDeadline
      ? ["ley-2126", "codigo-general-proceso", "constitucion"]
      : ["ley-2126", "constitucion"],
    nextSteps: [
      {
        title: "Ponte a salvo",
        detail: "Si hay riesgo inmediato, llama al 123 o busca un lugar seguro.",
      },
      {
        title: "Conserva evidencia sin exponerte",
        detail: hasJudicialDeadline
          ? "Guarda mensajes, reportes y la notificación judicial completa, incluida la fecha de recepción y sus anexos."
          : "Guarda mensajes, fotos, reportes médicos y datos de testigos.",
      },
      {
        title: hasJudicialDeadline ? "Solicita protección y revisión del plazo" : "Solicita protección",
        detail: hasJudicialDeadline
          ? "Acude a una Comisaría de Familia y lleva la notificación a revisión jurídica humana hoy."
          : "Acude a una Comisaría de Familia o autoridad competente.",
      },
    ],
    freeHelp,
    documentKind: "medida-proteccion",
    recommendedDocument: "Solicitud de medida de protección",
    documentReason: "Para organizar los hechos y pedir acciones concretas de protección.",
    triageQuestions: hasJudicialDeadline
      ? ["¿Estás en peligro en este momento?", "¿Qué fecha, juzgado y hora aparecen en la notificación o audiencia?"]
      : ["¿Estás en peligro en este momento?", "¿Hay niñas, niños u otras personas en riesgo?"],
    extractedFacts: [rawStory],
  };
}

export function buildFallbackOrientation(
  rawStory: string,
  city = "tu municipio",
): LegalOrientation {
  const story = rawStory.toLocaleLowerCase("es-CO");
  const administrativeContext = hasAny(story, ["alcaldía", "resolución", "entidad pública", "comparendo", "multa", "acto administrativo"]);
  const judicialContext = hasAny(story, ["juzgado", "demanda", "mandamiento", "proceso", "radicado", "audiencia", "recurso"]);
  const strongJudicialContext = hasAny(story, ["juzgado", "me demandaron", "demanda en mi contra", "mandamiento", "audiencia judicial", "citacion judicial"]);
  const incomingJudicialAction = hasAny(story, ["me demandaron", "en mi contra", "recibí", "recibi", "notific", "contestar", "citaron", "citación"]);
  const deadlineSignal = hasAny(story, ["plazo", "días", "vence", "vencimiento", "mañana", "fecha límite"]);
  const harmContext = hasAny(story, ["violencia", "golpe", "amenaz", "maltrat", "agred", "agresi", "abus", "tocam", "acoso sexual", "violacion", "explot", "arma", "matar"]);
  const childVictimContext = hasAny(story, [
    "a mi hijo",
    "a mi hija",
    "contra mi hijo",
    "contra mi hija",
    "abuso de mi hijo",
    "abuso de mi hija",
    "al niño",
    "a la niña",
    "de un niño",
    "de una niña",
    "mi hijo fue",
    "mi hija fue",
    "mi hijo sufrio",
    "mi hija sufrio",
    "niño fue",
    "niña fue",
    "menor fue",
  ]);
  const familyAggressorContext = hasAny(story, [
    "mi pareja",
    "mi expareja",
    "mi esposo",
    "mi esposa",
    "mi novio",
    "mi novia",
    "mi padre",
    "mi madre",
    "mi papa",
    "mi mama",
    "mi hermano",
    "mi hermana",
    "padre de mis hijos",
    "madre de mis hijos",
    "padre de mi hijo",
    "padre de mi hija",
    "madre de mi hijo",
    "madre de mi hija",
    "otro familiar",
    "violencia intrafamiliar",
    "en mi hogar",
  ]);
  const familyViolenceContext = harmContext && familyAggressorContext;
  const judicialDeadline =
    (strongJudicialContext || (!administrativeContext && judicialContext)) &&
    (incomingJudicialAction || deadlineSignal);

  if (harmContext && childVictimContext) {
    return buildChildRiskOrientation(rawStory);
  }

  if (familyViolenceContext) {
    return buildFamilyViolenceOrientation(rawStory, city, judicialDeadline);
  }

  if (judicialDeadline) {
    return {
      caseTitle: "Notificación o plazo que requiere revisión urgente",
      category: "otro",
      urgency: "alta",
      plainSummary: rawStory,
      rightTitle: "Una notificación puede activar un plazo que no debes dejar pasar",
      rightExplanation:
        "No es responsable calcular ni interpretar ese plazo solo con este relato. Conserva la notificación completa y busca revisión jurídica humana cuanto antes; un borrador de esta aplicación no sustituye la contestación, el recurso ni la actuación que corresponda.",
      sourceIds: ["codigo-general-proceso", "rama-procesos", "constitucion"],
      nextSteps: [
        { title: "Conserva la notificación completa", detail: "Guarda el mensaje, sobre o constancia, la fecha y hora de recepción, todos los anexos y el radicado." },
        { title: "Verifica el proceso por el canal oficial", detail: "Consulta el radicado en la Rama Judicial sin asumir que esa consulta reemplaza la notificación recibida." },
        { title: "Solicita revisión humana hoy", detail: "Lleva el documento completo a un consultorio jurídico o a la Defensoría, según el tipo de proceso y sus criterios de atención." },
      ],
      freeHelp: [
        {
          name: "Consultorio jurídico universitario",
          detail: "Revisión inicial según competencia, elegibilidad y capacidad de atención.",
          channel: "Verifica sede, criterios y cita en el directorio oficial",
          sourceId: "consultorios",
        },
        {
          name: "Defensoría del Pueblo",
          detail: "Orientación y posible acceso a servicios de defensoría dentro de sus competencias.",
          channel: `Consulta el punto o canal oficial disponible para ${city}`,
          sourceId: "defensoria",
        },
      ],
      documentKind: "resumen-urgente",
      recommendedDocument: "Resumen para revisión jurídica urgente",
      documentReason: "Para entregar los hechos y anexos a quien revise el plazo; no sirve por sí solo para contestar la actuación.",
      triageQuestions: ["¿Qué día y por qué medio recibiste la notificación?", "¿Qué juzgado, radicado y plazo aparecen en el documento?"],
      extractedFacts: [rawStory],
    };
  }

  if (hasAny(story, ["desaloj", "arriendo", "arrend", "apartamento", "inquilin"])) {
    return {
      ...initialOrientation,
      caseTitle: "Posible conflicto de arrendamiento",
      plainSummary: rawStory,
      freeHelp: initialOrientation.freeHelp.map((help) => ({
        ...help,
        channel: `${help.channel} para ${city}`,
      })),
      extractedFacts: [rawStory],
    };
  }

  if (hasAny(story, ["salario", "sueldo", "empleador", "despid", "trabajo", "liquidación"])) {
    return {
      caseTitle: "Posible incumplimiento laboral",
      category: "laboral",
      urgency: "media",
      plainSummary: rawStory,
      rightTitle: "Tu salario y prestaciones tienen protección legal",
      rightExplanation:
        "El empleador debe pagar el salario en las condiciones acordadas. Para definir la ruta hacen falta el tipo de vinculación, las fechas y los soportes de pago.",
      sourceIds: ["codigo-trabajo", "constitucion"],
      nextSteps: [
        { title: "Reúne soportes", detail: "Contrato, desprendibles, chats, turnos y comprobantes bancarios." },
        { title: "Haz una solicitud escrita", detail: "Pide el pago y una explicación, dejando constancia de la fecha." },
        { title: "Solicita orientación", detail: "Acude al Ministerio del Trabajo o a un consultorio jurídico." },
      ],
      freeHelp: [
        {
          name: "Inspección del Trabajo",
          detail: "Orientación laboral y recepción de quejas dentro de sus competencias.",
          channel: `Verifica la Dirección Territorial y sus canales oficiales para ${city}`,
          sourceId: "legalapp",
        },
        {
          name: "Consultorio jurídico universitario",
          detail: "Revisión del caso y apoyo según criterios de atención.",
          channel: "Verifica sede, elegibilidad y cita en el directorio oficial",
          sourceId: "consultorios",
        },
      ],
      documentKind: "reclamacion-laboral",
      recommendedDocument: "Reclamación laboral escrita",
      documentReason: "Para dejar constancia del pago pendiente y de tu solicitud.",
      triageQuestions: ["¿Tienes contrato escrito?", "¿Cuáles pagos y periodos están pendientes?"],
      extractedFacts: [rawStory],
    };
  }

  if (hasAny(story, ["eps", "medicamento", "cirugía", "cita médica", "salud", "tratamiento"])) {
    return {
      caseTitle: "Posible barrera de acceso a salud",
      category: "salud",
      urgency: "alta",
      plainSummary: rawStory,
      rightTitle: "La salud es un derecho fundamental",
      rightExplanation:
        "Si una demora o negativa pone en riesgo tu salud, puedes exigir una respuesta de la entidad y buscar orientación urgente. La tutela puede ser procedente según las circunstancias concretas.",
      sourceIds: ["ley-1751", "constitucion", "decreto-2591"],
      nextSteps: [
        { title: "Guarda la orden médica", detail: "Incluye historia, autorizaciones, negativas y radicados." },
        { title: "Radica la solicitud", detail: "Pide respuesta y solución por un canal que entregue número de radicado." },
        { title: "Escala la urgencia", detail: "Busca apoyo de Personería o Defensoría si hay riesgo actual." },
      ],
      freeHelp: [
        {
          name: "Defensoría del Pueblo",
          detail: "Orientación sobre derechos fundamentales y canales disponibles.",
          channel: `Consulta el punto o canal oficial disponible para ${city}`,
          sourceId: "defensoria",
        },
        {
          name: "Tutela en Línea",
          detail: "Canal nacional de radicación; verifica primero si la tutela es procedente para tu caso.",
          channel: "Servicio oficial de la Rama Judicial",
          sourceId: "tutela-linea",
        },
      ],
      documentKind: "solicitud-salud",
      recommendedDocument: "Solicitud prioritaria de servicio de salud",
      documentReason: "Para pedir la atención y dejar un radicado verificable.",
      triageQuestions: ["¿Tienes orden médica vigente?", "¿La demora genera un riesgo inmediato?"],
      extractedFacts: [rawStory],
    };
  }

  if (hasAny(story, ["alimentos", "cuota alimentaria", "custodia", "visitas", "hijo", "hija", "divorcio", "familia"])) {
    return {
      caseTitle: "Posible asunto de familia",
      category: "familia",
      urgency: "media",
      plainSummary: rawStory,
      rightTitle: "Puedes solicitar orientación para definir acuerdos y proteger a niñas, niños o adolescentes",
      rightExplanation:
        "Custodia, visitas y alimentos tienen rutas distintas de los casos de violencia. La autoridad y el paso aplicable dependen de si existe un acuerdo, una decisión previa y de las necesidades de la niña, niño o adolescente.",
      sourceIds: ["constitucion", "ley-2220", "icbf-conciliacion"],
      nextSteps: [
        { title: "Organiza la información familiar", detail: "Reúne registros civiles, acuerdos o decisiones previas, gastos y comunicaciones relevantes." },
        { title: "Define el asunto concreto", detail: "Separa lo relacionado con alimentos, custodia y visitas; cada tema puede requerir información distinta." },
        { title: "Solicita orientación", detail: "Consulta al ICBF o a un consultorio jurídico sobre la ruta aplicable y sus requisitos." },
      ],
      freeHelp: [
        {
          name: "Defensoría de Familia del ICBF",
          detail: "Orientación y trámites dentro de sus competencias en asuntos de niñez y familia.",
          channel: `Verifica el centro zonal y el canal oficial disponible para ${city}`,
          sourceId: "icbf-conciliacion",
        },
        {
          name: "Consultorio jurídico universitario",
          detail: "Revisión del caso según sus criterios de atención y capacidad.",
          channel: "Verifica sede, elegibilidad y cita en el directorio oficial",
          sourceId: "consultorios",
        },
      ],
      documentKind: "resumen-familia",
      recommendedDocument: "Resumen de situación familiar",
      documentReason: "Para organizar hechos, personas, decisiones previas y necesidades antes de solicitar orientación.",
      triageQuestions: ["¿Ya existe un acuerdo o decisión de una autoridad?", "¿El asunto principal es alimentos, custodia o visitas?"],
      extractedFacts: [rawStory],
    };
  }

  if (hasAny(story, ["robo", "robó", "robar", "robaron", "robado", "estaf", "delit", "denunci", "fiscal", "agred", "agresi", "atrac", "hurt", "amenaz"])) {
    return {
      caseTitle: "Posible hecho que requiere denuncia",
      category: "penal",
      urgency: hasAny(story, ["ahora", "arma", "peligro", "amenaza", "herida"]) ? "alta" : "media",
      plainSummary: rawStory,
      rightTitle: "Puedes denunciar y conservar un registro del caso",
      rightExplanation:
        "La Fiscalía recibe denuncias por varios canales. La aplicación organiza el relato y la evidencia, pero no determina si hubo delito ni reemplaza la valoración de la autoridad.",
      sourceIds: ["fiscalia-denuncia", "constitucion"],
      nextSteps: [
        { title: "Prioriza tu seguridad", detail: "Si el hecho está ocurriendo o hay peligro, llama al 123 y busca un lugar seguro." },
        { title: "Conserva los originales", detail: "Guarda archivos, chats, recibos y datos de testigos sin modificarlos ni exponerte." },
        { title: "Presenta la denuncia", detail: "Usa un canal oficial de la Fiscalía y conserva el NUNC o número de radicado." },
      ],
      freeHelp: [
        {
          name: "Fiscalía General de la Nación",
          detail: "Línea 122 desde celular, 01 8000 919748 y puntos de recepción presenciales.",
          channel: "Verifica el estado del canal virtual antes de usarlo",
          sourceId: "fiscalia-denuncia",
        },
        {
          name: "Defensoría del Pueblo",
          detail: "Orientación sobre derechos y servicios de defensoría cuando corresponda.",
          channel: `Consulta el punto o canal oficial disponible para ${city}`,
          sourceId: "defensoria",
        },
      ],
      documentKind: "relato-denuncia",
      recommendedDocument: "Relato organizado para denuncia",
      documentReason: "Para llevar una cronología clara, datos de contacto y un índice de evidencias.",
      triageQuestions: ["¿Hay peligro para alguien en este momento?", "¿Ya tienes NUNC o número de radicado?"],
      extractedFacts: [rawStory],
    };
  }

  if (hasAny(story, ["alcaldía", "resolución", "entidad pública", "comparendo", "multa", "recurso", "acto administrativo"])) {
    return {
      caseTitle: "Posible trámite ante una entidad pública",
      category: "administrativo",
      urgency: deadlineSignal ? "alta" : "media",
      plainSummary: rawStory,
      rightTitle: "Tienes derecho a pedir información y al debido proceso",
      rightExplanation:
        "Las actuaciones administrativas deben respetar el debido proceso. La ruta exacta depende del acto, la autoridad, la notificación y los términos; estos deben ser verificados antes de presentar un recurso.",
      sourceIds: ["cpaca", "ley-1755", "constitucion"],
      nextSteps: [
        { title: "Guarda el acto completo", detail: "Incluye constancia de notificación, anexos y cualquier número de expediente." },
        { title: "Identifica lo que necesitas", detail: "Diferencia entre pedir información, corregir un dato o controvertir una decisión." },
        { title: "Verifica el término con una persona experta", detail: "No dejes vencer un plazo basándote solo en una herramienta automática." },
      ],
      freeHelp: [
        {
          name: "Casa de Justicia",
          detail: "Orientación inicial y remisión según los servicios disponibles.",
          channel: `Verifica disponibilidad y sede para ${city} en el portal oficial`,
          sourceId: "casas-justicia",
        },
        {
          name: "Consultorio jurídico universitario",
          detail: "Revisión del acto, la notificación y las opciones según criterios de atención.",
          channel: "Verifica sede, elegibilidad y cita en el directorio oficial",
          sourceId: "consultorios",
        },
      ],
      documentKind: "solicitud-administrativa",
      recommendedDocument: "Solicitud de información o revisión",
      documentReason: "Para dejar una petición concreta y un radicado verificable mientras se revisa la ruta aplicable.",
      triageQuestions: ["¿Cuándo y cómo te notificaron?", "¿El documento indica recursos y plazo para presentarlos?"],
      extractedFacts: [rawStory],
    };
  }

  return {
    caseTitle: "Solicitud de orientación jurídica",
    category: "otro",
    urgency: "media",
    plainSummary: rawStory,
    rightTitle: "Aún hace falta definir la ruta jurídica aplicable",
    rightExplanation:
      "Con la información disponible no es responsable afirmar una ruta jurídica única ni generar una solicitud dirigida a una autoridad específica. Organiza los hechos y pide una revisión inicial.",
    sourceIds: ["constitucion", "legalapp"],
    nextSteps: [
      { title: "Ordena los hechos", detail: "Anota qué ocurrió, cuándo, quiénes participaron y qué pediste." },
      { title: "Reúne los soportes", detail: "Adjunta comunicaciones, recibos, decisiones y números de radicado." },
      { title: "Valida la ruta", detail: "Consulta una Casa de Justicia o consultorio jurídico." },
    ],
    freeHelp: [
      {
        name: "Casa de Justicia",
        detail: "Orientación sobre la entidad y el mecanismo que podría corresponder.",
        channel: `Verifica disponibilidad y sede para ${city} en el portal oficial`,
        sourceId: "casas-justicia",
      },
      {
        name: "Consultorio jurídico universitario",
        detail: "Orientación según criterios de atención y capacidad.",
        channel: "Verifica sede, elegibilidad y cita en el directorio oficial",
        sourceId: "consultorios",
      },
    ],
    documentKind: "resumen-general",
    recommendedDocument: "Resumen para orientación jurídica",
    documentReason: "Para llevar los hechos, soportes y preguntas a una entidad o profesional que pueda definir la ruta.",
    triageQuestions: ["¿Qué resultado necesitas obtener?", "¿Ya presentaste una solicitud y tienes radicado?"],
    extractedFacts: [rawStory],
  };
}

export function getOfficialSources(sourceIds: string[]) {
  return sourceIds
    .map((id) => officialSources.find((source) => source.id === id))
    .filter((source): source is OfficialSource => Boolean(source));
}
