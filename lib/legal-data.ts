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
  legal?: {
    kind: "constitucion" | "ley" | "codigo" | "decreto" | "sentencia";
    citation: string;
    proposition: string;
    scopeNote: string;
    verifiedAt: string;
    effectiveAsOf?: string;
  };
}

export type VerifiedLegalCitation = OfficialSource & {
  legal: NonNullable<OfficialSource["legal"]>;
};

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
    legal: {
      kind: "constitucion",
      citation: "Constitución Política, arts. 29 y 229",
      proposition:
        "Toda actuación judicial o administrativa debe respetar el debido proceso y toda persona tiene derecho a acceder a la administración de justicia.",
      scopeNote:
        "Estos principios no definen por sí solos el trámite, el término ni el resultado aplicable a un caso concreto.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "ley-820",
    shortTitle: "Ley 820 de 2003",
    title: "Régimen de arrendamiento de vivienda urbana",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1669010",
    legal: {
      kind: "ley",
      citation: "Ley 820 de 2003, arts. 21 a 24",
      proposition:
        "La terminación del arrendamiento de vivienda urbana depende de quién termina, la causal, el momento contractual y los requisitos de aviso, indemnización o caución que correspondan.",
      scopeNote:
        "Aplica a vivienda urbana; hace falta revisar el contrato, la causal invocada y la forma de comunicación antes de concluir si una terminación es válida.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "ley-1755",
    shortTitle: "Ley 1755 de 2015",
    title: "Regulación del derecho fundamental de petición",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=30043679",
    legal: {
      kind: "ley",
      citation: "Ley 1755 de 2015, arts. 13 y 14",
      proposition:
        "Las peticiones deben recibir una respuesta de fondo dentro del término general o especial que corresponda.",
      scopeNote:
        "Una respuesta de fondo no tiene que ser favorable y una petición no suspende automáticamente el término de un recurso.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "codigo-trabajo",
    shortTitle: "Código Sustantivo del Trabajo",
    title: "Código Sustantivo del Trabajo",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Codigo/30019323",
    legal: {
      kind: "codigo",
      citation: "Código Sustantivo del Trabajo, arts. 57.4, 134 y 488 a 489",
      proposition:
        "El empleador debe pagar la remuneración pactada; el sueldo se paga por periodos iguales y vencidos que no pueden superar un mes.",
      scopeNote:
        "El régimen, la prescripción y la jurisdicción dependen del tipo real de vínculo; no todos los contratos de prestación de servicios son relaciones laborales.",
      verifiedAt: "2026-08-15",
      effectiveAsOf: "Texto integrado consultado el 15 de agosto de 2026",
    },
  },
  {
    id: "codigo-trabajo-terminacion",
    shortTitle: "Terminación del contrato laboral",
    title: "Código Sustantivo del Trabajo — terminación e indemnización",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Codigo/30019323",
    legal: {
      kind: "codigo",
      citation: "Código Sustantivo del Trabajo, arts. 61 a 65",
      proposition:
        "El contrato de trabajo termina por las causas legales y la terminación unilateral sin justa causa puede generar la indemnización prevista por la ley; esto no implica por sí solo un reintegro automático.",
      scopeNote:
        "Deben verificarse el vínculo real, el tipo de contrato, la carta y causa informadas, las fechas y la posible existencia de fuero, estabilidad reforzada, discriminación o perjuicios adicionales.",
      verifiedAt: "2026-08-15",
      effectiveAsOf: "Texto integrado consultado el 15 de agosto de 2026",
    },
  },
  {
    id: "codigo-comercio-arrendamiento",
    shortTitle: "Arrendamiento de local comercial",
    title: "Código de Comercio — renovación de inmuebles ocupados por establecimientos de comercio",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=1833376",
    legal: {
      kind: "codigo",
      citation: "Código de Comercio — Decreto 410 de 1971, arts. 518 a 524",
      proposition:
        "Quien haya ocupado durante al menos dos años consecutivos un inmueble con el mismo establecimiento de comercio tiene derecho a la renovación, salvo las causales legales; algunas causales exigen aviso previo no menor de seis meses.",
      scopeNote:
        "Aplica a locales vinculados a un establecimiento de comercio, no a vivienda urbana. Deben confirmarse el uso, la duración de la ocupación, la causal, el contrato y el aviso.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "codigo-civil-alimentos",
    shortTitle: "Código Civil — alimentos",
    title: "Código Civil colombiano — personas titulares y reglas de los alimentos",
    organization: "Secretaría del Senado de la República",
    url: "https://www.secretariasenado.gov.co/senado/basedoc/codigo_civil_pr012.html",
    legal: {
      kind: "codigo",
      citation: "Código Civil, arts. 411 a 427",
      proposition:
        "La obligación alimentaria solo existe frente a las personas y bajo las condiciones previstas por la ley; su alcance depende de la necesidad de quien pide y de la capacidad de quien debe aportar.",
      scopeNote:
        "La relación familiar, la edad, los acuerdos o decisiones previas y las reglas especiales pueden cambiar la ruta. Este código no fija automáticamente cuantía, custodia ni visitas.",
      verifiedAt: "2026-08-15",
      effectiveAsOf: "Texto actualizado consultado el 15 de agosto de 2026",
    },
  },
  {
    id: "ley-2126",
    shortTitle: "Ley 2126 de 2021",
    title: "Creación y funcionamiento de las comisarías de familia",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F30042087",
    legal: {
      kind: "ley",
      citation: "Ley 2126 de 2021",
      proposition:
        "Las comisarías de familia tienen funciones de prevención y protección frente a la violencia en el contexto familiar y pueden adoptar las medidas previstas por la ley dentro de su competencia.",
      scopeNote:
        "La competencia cambia según los hechos, la presencia de niñas, niños o adolescentes y la posible existencia de violencia sexual u otros delitos.",
      verifiedAt: "2026-08-15",
    },
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
    legal: {
      kind: "codigo",
      citation: "CPACA — Ley 1437 de 2011, arts. 3, 34 y ss. y 74 a 79",
      proposition:
        "Las actuaciones administrativas deben respetar el debido proceso, la defensa y la contradicción; los recursos dependen del acto y de las reglas aplicables.",
      scopeNote:
        "Tránsito, policía, impuestos y otros regímenes pueden tener reglas especiales. Deben verificarse el acto completo, su notificación y el término escrito.",
      verifiedAt: "2026-08-15",
    },
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
    legal: {
      kind: "codigo",
      citation: "Código General del Proceso — Ley 1564 de 2012, arts. 14 y 384",
      proposition:
        "El debido proceso es obligatorio y la restitución judicial de un inmueble arrendado tiene un trámite específico.",
      scopeNote:
        "La defensa y las cargas procesales dependen del documento recibido, la causal, el contrato y los pagos; una comunicación privada no equivale a una orden judicial.",
      verifiedAt: "2026-08-15",
    },
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
    legal: {
      kind: "ley",
      citation: "Ley Estatutaria 1751 de 2015, arts. 2, 6, 8 y 14",
      proposition:
        "La salud es un derecho fundamental autónomo y comprende acceso oportuno, eficaz, de calidad e integral; la atención urgente no puede condicionarse a autorización previa.",
      scopeNote:
        "La procedencia de una tutela o de un servicio concreto exige revisar la orden médica, el riesgo, la regulación aplicable y la eficacia de otros canales.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "ley-2452",
    shortTitle: "Código Procesal del Trabajo 2025",
    title: "Código Procesal del Trabajo y de la Seguridad Social — Ley 2452 de 2025",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=30054744",
    legal: {
      kind: "codigo",
      citation: "Ley 2452 de 2025, arts. 286 y ss.",
      proposition:
        "Desde el 2 de abril de 2026 existe un proceso monitorio para ciertas obligaciones laborales determinadas y exigibles que no superen veinte salarios mínimos.",
      scopeNote:
        "No toda deuda salarial cumple esos requisitos y los procesos iniciados antes de la vigencia de este código continúan bajo el régimen anterior.",
      verifiedAt: "2026-08-15",
      effectiveAsOf: "Vigente desde el 2 de abril de 2026",
    },
  },
  {
    id: "codigo-infancia",
    shortTitle: "Código de Infancia y Adolescencia",
    title: "Código de la Infancia y la Adolescencia — Ley 1098 de 2006",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?id=1673639",
    legal: {
      kind: "codigo",
      citation: "Ley 1098 de 2006, arts. 8, 9, 23 y 24",
      proposition:
        "Las decisiones sobre niñas, niños y adolescentes deben atender su interés superior y la prevalencia de sus derechos; el código regula cuidado personal y el alcance de los alimentos.",
      scopeNote:
        "El interés superior exige una valoración individual y no fija automáticamente custodia, visitas ni cuantía alimentaria.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "codigo-procedimiento-penal",
    shortTitle: "Código de Procedimiento Penal",
    title: "Código de Procedimiento Penal — Ley 906 de 2004",
    organization: "SUIN-Juriscol · Ministerio de Justicia",
    url: "https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1670249",
    legal: {
      kind: "codigo",
      citation: "Ley 906 de 2004, arts. 11 y 69",
      proposition:
        "Las víctimas tienen derechos a información, protección y acceso a la justicia; una denuncia debe relatar de forma detallada los hechos conocidos.",
      scopeNote:
        "Denuncia y querella no son equivalentes. La herramienta no determina si hubo delito ni reemplaza la valoración de la Fiscalía.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-c-426-2023",
    shortTitle: "Sentencia C-426 de 2023",
    title: "Seguridad jurídica de la tenencia en arrendamiento de vivienda urbana",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2023/C-426-23.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia C-426 de 2023",
      proposition:
        "La seguridad jurídica de la tenencia integra la vivienda digna y los requisitos legales buscan prevenir terminaciones injustificadas en los supuestos examinados.",
      scopeNote:
        "La decisión examinó específicamente la caución del artículo 22.8 de la Ley 820; no vuelve inválida toda terminación ni autoriza permanencia indefinida.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-su-995-1999",
    shortTitle: "Sentencia SU-995 de 1999",
    title: "Pago oportuno del salario y mínimo vital",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/1999/SU995-99.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia SU-995 de 1999",
      proposition:
        "El pago completo y oportuno del salario tiene dimensión fundamental por su relación con la dignidad y el mínimo vital.",
      scopeNote:
        "La tutela no es un cobro laboral ordinario: requiere valorar la afectación concreta del mínimo vital y la eficacia de los otros medios judiciales.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-c-1507-2000",
    shortTitle: "Sentencia C-1507 de 2000",
    title: "Terminación unilateral sin justa causa e indemnización laboral",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2000/C-1507-00.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia C-1507 de 2000",
      proposition:
        "La terminación unilateral sin justa causa genera la indemnización legal y no un reintegro automático, sin excluir el análisis separado de protecciones especiales o perjuicios probados.",
      scopeNote:
        "La sentencia resolvió un control abstracto del artículo 64 y no determina si este relato configura un despido sin justa causa, un fuero, discriminación o estabilidad laboral reforzada.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-su-508-2020",
    shortTitle: "Sentencia SU-508 de 2020",
    title: "Acceso integral y oportuno a servicios de salud",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2020/SU508-20.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia SU-508 de 2020",
      proposition:
        "La garantía de salud exige integralidad y diagnóstico oportuno; lo no excluido expresamente se entiende incluido bajo las reglas examinadas por la Corte.",
      scopeNote:
        "La subsidiariedad de la tutela y la eficacia de la Superintendencia de Salud deben evaluarse en las circunstancias concretas.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-t-510-2003",
    shortTitle: "Sentencia T-510 de 2003",
    title: "Interés superior de niñas, niños y adolescentes",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2003/T-510-03.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia T-510 de 2003",
      proposition:
        "El interés superior de una persona menor de edad debe establecerse atendiendo las circunstancias fácticas y jurídicas particulares, no de manera abstracta.",
      scopeNote:
        "La sentencia no decide automáticamente custodia, alimentos o visitas en otros casos; sirve como criterio de valoración individual.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-t-462-2018",
    shortTitle: "Sentencia T-462 de 2018",
    title: "Protección inmediata frente a violencia intrafamiliar",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2018/T-462-18.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia T-462 de 2018",
      proposition:
        "Las víctimas de violencia intrafamiliar deben poder acceder a medidas inmediatas de protección frente a agresiones físicas, psicológicas, sexuales o amenazas.",
      scopeNote:
        "Ante peligro actual debe priorizarse la seguridad y el contacto humano de emergencia, no el análisis documental de la herramienta.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-c-1177-2005",
    shortTitle: "Sentencia C-1177 de 2005",
    title: "Contenido y recepción de la denuncia penal",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2005/C-1177-05.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia C-1177 de 2005",
      proposition:
        "La denuncia debe narrar claramente los hechos conocidos sin el rigor técnico de una demanda; una inadmisión debe ser motivada y comunicada.",
      scopeNote:
        "La persona debe separar hechos observados, inferencias y soportes; la aplicación no puede asignar autores, intención o tipo penal.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-c-980-2010",
    shortTitle: "Sentencia C-980 de 2010",
    title: "Garantías del debido proceso administrativo",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/RELATORIA/2010/C-980-10.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia C-980 de 2010",
      proposition:
        "El debido proceso administrativo comprende ser oído, notificación legal, autoridad competente, defensa, contradicción, pruebas e impugnación.",
      scopeNote:
        "El recurso y su término dependen del acto y del régimen especial; deben verificarse en el documento completo antes de actuar.",
      verifiedAt: "2026-08-15",
    },
  },
  {
    id: "sentencia-c-426-2002",
    shortTitle: "Sentencia C-426 de 2002",
    title: "Acceso efectivo a la administración de justicia",
    organization: "Corte Constitucional de Colombia",
    url: "https://www.corteconstitucional.gov.co/relatoria/2002/C-426-02.htm",
    legal: {
      kind: "sentencia",
      citation: "Corte Constitucional, Sentencia C-426 de 2002",
      proposition:
        "El acceso a la justicia permite acudir en condiciones de igualdad ante jueces y tribunales, con sujeción a los procedimientos y garantías aplicables.",
      scopeNote:
        "La sentencia no identifica qué acción, autoridad o término corresponde sin conocer los hechos y el régimen específico.",
      verifiedAt: "2026-08-15",
    },
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

const preliminaryCitationIdsByCategory: Record<LegalCategory, readonly string[]> = {
  arrendamiento: ["ley-820", "codigo-general-proceso"],
  laboral: ["codigo-trabajo"],
  salud: ["ley-1751", "sentencia-su-508-2020"],
  familia: ["constitucion"],
  penal: ["codigo-procedimiento-penal", "sentencia-c-1177-2005"],
  administrativo: ["cpaca", "sentencia-c-980-2010"],
  otro: ["constitucion", "sentencia-c-426-2002"],
};

export function getPreliminaryLegalCitations(
  orientation: LegalOrientation,
  rawStory = orientation.plainSummary,
): VerifiedLegalCitation[] {
  const facts = [
    rawStory,
    orientation.caseTitle,
    orientation.plainSummary,
    ...orientation.extractedFacts,
  ].join(" ");
  let citationIds = preliminaryCitationIdsByCategory[orientation.category];

  if (orientation.documentKind === "medida-proteccion") {
    citationIds = ["ley-2126", "sentencia-t-462-2018"];
  } else if (orientation.sourceIds.includes("icbf-linea-141")) {
    citationIds = [
      "codigo-infancia",
      "codigo-procedimiento-penal",
      "sentencia-c-1177-2005",
    ];
  } else if (orientation.category === "arrendamiento") {
    const isCommercialPremises = hasAny(facts, [
      "local comercial",
      "establecimiento de comercio",
      "mi local",
      "un local",
      "el local",
      "inmueble comercial",
      "negocio funciona",
    ]);
    const hasSpecialHousingGround = hasAny(facts, [
      "caucion",
      "causal especial",
      "ocupacion propia",
      "necesita ocupar",
      "va a ocupar",
      "demoler",
      "demolicion",
      "reparacion indispensable",
      "compraventa",
      "venta del inmueble",
      "plena voluntad",
      "cuatro anos",
    ]);

    citationIds = isCommercialPremises
      ? ["codigo-comercio-arrendamiento"]
      : [
          "ley-820",
          "codigo-general-proceso",
          ...(hasSpecialHousingGround ? ["sentencia-c-426-2023"] : []),
        ];
  } else if (orientation.category === "laboral") {
    const hasPaymentClaim = hasAny(facts, [
      "salario",
      "sueldo",
      "no me pagan",
      "no me han pagado",
      "liquidacion",
      "prestaciones",
      "prima",
      "cesantias",
    ]);
    const hasTerminationClaim = hasAny(facts, [
      "despid",
      "terminacion del contrato",
      "terminaron mi contrato",
      "termino mi contrato",
      "sin justa causa",
    ]);
    const hasUnexplainedOrNoCauseTermination = hasAny(facts, [
      "sin justa causa",
      "sin causa",
      "no explicaron",
      "no me explicaron",
      "no me dijeron la razon",
      "sin explicacion",
    ]);
    const hasMinimumVitalSignal = hasAny(facts, [
      "minimo vital",
      "no tengo para",
      "no puedo pagar el arriendo",
      "no puedo comprar comida",
      "necesidades basicas",
      "subsistencia",
      "dependemos de ese salario",
      "sostener a mi familia",
    ]);

    citationIds = [
      ...(hasPaymentClaim ? ["codigo-trabajo", "ley-2452"] : []),
      ...(hasPaymentClaim && hasMinimumVitalSignal ? ["sentencia-su-995-1999"] : []),
      ...(hasTerminationClaim ? ["codigo-trabajo-terminacion"] : []),
      ...(hasTerminationClaim && hasUnexplainedOrNoCauseTermination
        ? ["sentencia-c-1507-2000"]
        : []),
    ];
    if (citationIds.length === 0) citationIds = ["codigo-trabajo"];
  } else if (orientation.category === "familia") {
    const hasFoodClaim = hasAny(facts, ["alimentos", "cuota alimentaria", "pension alimentaria"]);
    const hasExplicitAdultBeneficiary = hasAny(facts, [
      "hijo adulto",
      "hija adulta",
      "persona adulta",
      "mayor de edad",
    ]);
    const hasMinor =
      !hasExplicitAdultBeneficiary &&
      hasAny(facts, [
        "mi hijo",
        "mi hija",
        "nino",
        "nina",
        "adolescente",
        "menor de edad",
      ]);

    citationIds = [
      ...(hasFoodClaim ? ["codigo-civil-alimentos"] : []),
      ...(hasMinor ? ["codigo-infancia", "sentencia-t-510-2003"] : []),
    ];
    if (citationIds.length === 0) citationIds = ["constitucion"];
  }

  return getOfficialSources([...new Set(citationIds)]).filter(
    (source): source is VerifiedLegalCitation => Boolean(source.legal),
  );
}
