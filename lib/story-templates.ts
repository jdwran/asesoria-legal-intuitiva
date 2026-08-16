import type { LegalCategory } from "./legal-data.ts";

export interface StoryTemplateField {
  key: string;
  label: string;
  placeholder: string;
}

export interface StoryTemplate {
  id: string;
  label: string;
  template: string;
  fields: StoryTemplateField[];
  category: LegalCategory;
  description: string;
  featured?: boolean;
  alert?: string;
}

export type StoryTemplateValues = Record<string, string>;

const STORY_TOKEN_PATTERN = /\{\{([a-z][A-Za-z0-9]*)\}\}/g;

export function getStoryTemplateProgress(
  template: StoryTemplate,
  values: StoryTemplateValues,
) {
  return {
    completed: template.fields.filter((field) => values[field.key]?.trim()).length,
    total: template.fields.length,
  };
}

export function renderStoryTemplatePreview(
  template: StoryTemplate,
  values: StoryTemplateValues,
) {
  return template.template.replace(STORY_TOKEN_PATTERN, (token, key: string) => {
    const value = values[key]?.trim();
    return value || token;
  });
}

export function buildStoryFromTemplate(
  template: StoryTemplate,
  values: StoryTemplateValues,
  optionalDetail = "",
) {
  const { completed, total } = getStoryTemplateProgress(template, values);
  if (completed !== total) return null;

  const story = renderStoryTemplatePreview(template, values).trim();
  if (STORY_TOKEN_PATTERN.test(story)) {
    STORY_TOKEN_PATTERN.lastIndex = 0;
    return null;
  }
  STORY_TOKEN_PATTERN.lastIndex = 0;

  const detail = optionalDetail.trim();
  return detail ? `${story}\n${detail}` : story;
}

export const storyTemplates: StoryTemplate[] = [
  {
    id: "laboral-pagos-pendientes",
    label: "No me pagan salario o prestaciones",
    category: "laboral",
    description: "Para salarios, liquidación, prima, cesantías u otros pagos laborales pendientes.",
    featured: true,
    template:
      "Trabajo en {{empresa}} desde {{fechaIngreso}} como {{cargo}}. No me han pagado salario, prestaciones u otro concepto pendiente: {{concepto}}. Ya reclamé y {{resultadoReclamo}}. Tengo {{soporte}} como soporte. Necesito orientación para reclamar lo pendiente y dejar constancia de mi solicitud.",
    fields: [
      { key: "empresa", label: "Nombre de la empresa", placeholder: "Ej.: una empresa de mensajería en Cali" },
      { key: "fechaIngreso", label: "Desde cuándo trabajas ahí", placeholder: "Ej.: marzo de 2025" },
      { key: "cargo", label: "Tu cargo", placeholder: "Ej.: auxiliar de bodega" },
      { key: "concepto", label: "Qué no te han pagado y de qué periodo", placeholder: "Ej.: dos salarios, prima y cesantías de junio y julio" },
      { key: "resultadoReclamo", label: "Qué pasó cuando reclamaste: a quién, cuándo y qué te dijeron", placeholder: "Ej.: escribí a recursos humanos y no respondieron" },
      { key: "soporte", label: "Qué pruebas tienes", placeholder: "Ej.: chats, turnos y comprobantes de pagos anteriores" },
    ],
  },
  {
    id: "laboral-despido-liquidacion",
    label: "Me despidieron o terminó mi contrato",
    category: "laboral",
    description: "Para organizar la terminación, la causa informada y los pagos o documentos faltantes.",
    template:
      "Mi empleador fue {{empleador}} y el contrato laboral o vínculo funcionaba así: {{relacionLaboral}}. La relación terminó de esta manera: {{terminacion}}. Al finalizar me entregaron {{documentos}} y siguen pendientes {{pendientes}}. Cuento con {{soportes}}. Quiero entender qué debo pedir por escrito y dónde solicitar orientación.",
    fields: [
      { key: "empleador", label: "Quién te contrató y dónde trabajabas", placeholder: "Ej.: una empresa de transporte en Itagüí" },
      { key: "relacionLaboral", label: "Cómo era tu relación de trabajo", placeholder: "Ej.: trabajé nueve meses, con turnos y acuerdo verbal" },
      { key: "terminacion", label: "Cuándo y cómo terminó, y qué razón te dieron", placeholder: "Ej.: me despidieron por WhatsApp y no explicaron la causa" },
      { key: "documentos", label: "Qué documentos te entregaron al terminar", placeholder: "Ej.: ninguna carta ni liquidación" },
      { key: "pendientes", label: "Qué pagos o certificados faltan", placeholder: "Ej.: último salario, liquidación y certificado laboral" },
      { key: "soportes", label: "Qué pruebas conservas", placeholder: "Ej.: chats, turnos, pagos y nombres de testigos" },
    ],
  },
  {
    id: "arrendamiento-terminacion",
    label: "Problema con arriendo o entrega del inmueble",
    category: "arrendamiento",
    description: "Para avisos de terminación, entrega, pagos discutidos o intentos de desalojo.",
    featured: true,
    template:
      "Soy parte de un contrato de arriendo y mi situación es {{rolInmueble}}. El contrato se acordó así: {{contrato}}. El problema actual es {{situacion}}. El aviso o comunicación que recibí o envié dice {{aviso}}. Sobre el canon, servicios y administración: {{pagos}}. Tengo {{soportes}}. Necesito saber qué comunicación enviar y qué ruta seguir sin tomar medidas por la fuerza.",
    fields: [
      { key: "rolInmueble", label: "Tu rol y el tipo de inmueble", placeholder: "Ej.: soy arrendatario de una vivienda urbana en Bogotá" },
      { key: "contrato", label: "Cómo es el contrato y desde cuándo existe", placeholder: "Ej.: contrato escrito desde marzo de 2025" },
      { key: "situacion", label: "Qué está pasando ahora", placeholder: "Ej.: me piden entregar el inmueble porque lo van a vender" },
      { key: "aviso", label: "Cuándo, por qué medio y con qué plazo avisaron", placeholder: "Ej.: WhatsApp recibido ayer con plazo de cinco días" },
      { key: "pagos", label: "Cómo están los pagos y qué valores se discuten", placeholder: "Ej.: estoy al día y conservo todos los recibos" },
      { key: "soportes", label: "Qué documentos o pruebas tienes", placeholder: "Ej.: contrato, mensajes, inventario y comprobantes" },
    ],
  },
  {
    id: "salud-servicio-negado",
    label: "EPS o IPS niega o demora un servicio",
    category: "salud",
    description: "Para medicamentos, citas, procedimientos, terapias o autorizaciones demoradas.",
    featured: true,
    alert: "Si existe una urgencia o deterioro grave, busca atención inmediata antes de completar el formulario.",
    template:
      "Mi EPS o IPS es {{afiliacion}}. Tengo una orden médica para {{ordenMedica}}. Solicité el servicio de esta forma: {{solicitud}}. La entidad respondió o actuó así: {{respuesta}}. La demora o negativa me afecta de esta manera: {{afectacion}}. Tengo {{soportes}}. Necesito orientación para pedir la atención y escalar la barrera si continúa.",
    fields: [
      { key: "afiliacion", label: "EPS, IPS y municipio donde recibes atención", placeholder: "Ej.: EPS Ejemplo e IPS Central en Barranquilla" },
      { key: "ordenMedica", label: "Qué ordenó el personal de salud y cuándo", placeholder: "Ej.: cirugía de vesícula ordenada el 12 de abril" },
      { key: "solicitud", label: "Cuándo y por qué canal pediste el servicio", placeholder: "Ej.: radiqué la solicitud el 2 de mayo y tengo número" },
      { key: "respuesta", label: "Qué respondió la entidad o cuánto ha demorado", placeholder: "Ej.: no ha respondido después de cuatro meses" },
      { key: "afectacion", label: "Qué riesgo o afectación existe", placeholder: "Ej.: he ido a urgencias por dolor y no puedo trabajar" },
      { key: "soportes", label: "Qué documentos conservas", placeholder: "Ej.: orden médica, historia, radicado y respuestas" },
    ],
  },
  {
    id: "familia-cuota-alimentos",
    label: "Cuota de alimentos no fijada o incumplida",
    category: "familia",
    description: "Para solicitar una cuota, revisar un acuerdo o registrar pagos atrasados.",
    template:
      "Necesito orientación por una cuota alimentaria para {{beneficiario}}. Sobre acuerdos o decisiones previas: {{acuerdo}}. La falta de pago o necesidad de fijación consiste en {{incumplimiento}}. Los gastos principales son {{gastos}}. La otra persona puede ser ubicada así: {{ubicacion}}. Tengo {{soportes}}. Quiero saber dónde solicitar la fijación o el cumplimiento y qué constancia conservar.",
    fields: [
      { key: "beneficiario", label: "Para quién son los alimentos y qué edad tiene", placeholder: "Ej.: mi hija de seis años" },
      { key: "acuerdo", label: "Si existe acta, acuerdo o decisión previa", placeholder: "Ej.: nunca hemos fijado una cuota por escrito" },
      { key: "incumplimiento", label: "Qué se dejó de pagar o qué necesitas fijar", placeholder: "Ej.: no aporta desde hace ocho meses" },
      { key: "gastos", label: "Cuáles son los gastos principales", placeholder: "Ej.: colegio, vivienda, alimentación y salud" },
      { key: "ubicacion", label: "Municipio o dato general para ubicar a la otra persona", placeholder: "Ej.: vive y trabaja en Pereira" },
      { key: "soportes", label: "Qué documentos o comprobantes tienes", placeholder: "Ej.: registro civil, recibos, consignaciones y mensajes" },
    ],
  },
  {
    id: "familia-custodia-visitas",
    label: "Custodia, cuidado personal o visitas",
    category: "familia",
    description: "Para definir o modificar acuerdos sobre cuidado y contacto con hijos.",
    template:
      "Necesito definir custodia, cuidado personal o régimen de visitas. La situación de la niña, niño o adolescente es {{menorYCuidado}}. Sobre acuerdos o decisiones previas: {{acuerdo}}. El problema actual es {{problema}}. Ya intenté acordar y {{intentoAcuerdo}}. Sobre seguridad o riesgo: {{seguridad}}. Tengo {{soportes}}. Quiero saber ante qué entidad pedir orientación y cómo dejar un acuerdo verificable.",
    fields: [
      { key: "menorYCuidado", label: "Edad, cuidador actual y municipio", placeholder: "Ej.: mi hijo de ocho años vive conmigo en Cali" },
      { key: "acuerdo", label: "Si existe un acuerdo, acta o decisión previa", placeholder: "Ej.: solo tenemos un acuerdo verbal" },
      { key: "problema", label: "Qué ocurre con la custodia o las visitas y desde cuándo", placeholder: "Ej.: no respetan los horarios desde junio" },
      { key: "intentoAcuerdo", label: "Qué intentaste y cuál fue la respuesta", placeholder: "Ej.: propuse un horario por mensaje y no hubo acuerdo" },
      { key: "seguridad", label: "Si existe violencia o algún riesgo actual", placeholder: "Ej.: no hay violencia ni riesgo actual" },
      { key: "soportes", label: "Qué documentos o mensajes conservas", placeholder: "Ej.: registro civil, chats y acuerdo anterior" },
    ],
  },
  {
    id: "familia-violencia-proteccion",
    label: "Violencia familiar o necesidad de protección",
    category: "familia",
    description: "Para organizar hechos y pedir protección; no propone conciliación como salida automática.",
    alert: "Si hay peligro actual, busca un lugar seguro y llama al 123. La Línea 155 orienta a mujeres víctimas de violencia y la Línea 141 atiende riesgos para menores de edad.",
    template:
      "Necesito protección por violencia familiar. Mi vínculo familiar o de pareja con la persona involucrada es {{vinculo}}. Los hechos fueron {{hechos}}. Mi seguridad en este momento es {{seguridad}}. Las otras personas que podrían estar en riesgo son {{personasRiesgo}}. Ya busqué ayuda y {{ayudaPrevia}}. Sobre soportes y forma segura de atención: {{soportesYAtencion}}.",
    fields: [
      { key: "vinculo", label: "Qué vínculo tienes o tuviste con la persona", placeholder: "Ej.: es mi expareja y ya no vivimos juntos" },
      { key: "hechos", label: "Qué ocurrió, cuándo y en qué lugar general", placeholder: "Ej.: el sábado me empujó, amenazó y conserva llaves" },
      { key: "seguridad", label: "Si estás a salvo y si la persona puede acercarse", placeholder: "Ej.: estoy con una familiar, pero temo que vuelva" },
      { key: "personasRiesgo", label: "Si hay niñas, niños u otras personas expuestas", placeholder: "Ej.: vivo con mis dos hijos" },
      { key: "ayudaPrevia", label: "A quién pediste ayuda y qué respuesta recibiste", placeholder: "Ej.: aún no he pedido ayuda institucional" },
      { key: "soportesYAtencion", label: "Qué soportes tienes y cómo puedes recibir orientación segura", placeholder: "Ej.: tengo fotos y mensajes; prefiero atención presencial" },
    ],
  },
  {
    id: "penal-hurto-estafa-amenaza",
    label: "Hurto, estafa, amenaza u otro posible delito",
    category: "penal",
    description: "Para preparar una denuncia con cronología, evidencias y necesidades de protección.",
    alert: "Si el hecho ocurre ahora o existe peligro, llama al 123 antes de completar el relato.",
    template:
      "Quiero poner en conocimiento un posible delito. Ocurrió {{momentoLugar}}. El hecho fue {{hecho}}. Las personas involucradas o testigos son {{involucrados}}. La pérdida, afectación o riesgo es {{afectacion}}. Conservé {{evidencia}}. Sobre la denuncia: {{denuncia}}. Necesito organizar el relato, saber dónde presentarlo y qué número o constancia guardar.",
    fields: [
      { key: "momentoLugar", label: "Cuándo y dónde ocurrió", placeholder: "Ej.: el 10 de agosto en una página de ventas, desde Medellín" },
      { key: "hecho", label: "Qué pasó, en orden y sin completar lo que no recuerdes", placeholder: "Ej.: ofrecieron un celular, transferí y luego me bloquearon" },
      { key: "involucrados", label: "Quiénes participaron o presenciaron el hecho", placeholder: "Ej.: conservo el perfil del vendedor y no conozco testigos" },
      { key: "afectacion", label: "Qué pérdida, daño o riesgo existe", placeholder: "Ej.: transferí un valor y nunca recibí el equipo" },
      { key: "evidencia", label: "Qué evidencias originales conservas", placeholder: "Ej.: comprobante, chats, URL y capturas" },
      { key: "denuncia", label: "Si ya informaste a alguna entidad y qué número recibiste", placeholder: "Ej.: aún no he denunciado ni reportado al banco" },
    ],
  },
  {
    id: "administrativo-multa-resolucion",
    label: "Multa, comparendo o decisión de una entidad",
    category: "administrativo",
    description: "Para revisar una decisión administrativa, su notificación y los recursos indicados.",
    alert: "Una petición genérica no suspende automáticamente el término de un recurso. Busca revisión humana si la fecha está próxima.",
    template:
      "Una entidad pública expidió un acto administrativo: {{acto}}. La notificación ocurrió así: {{notificacion}}. El documento dice esto sobre recursos y términos: {{recursos}}. Solicito que revisen {{motivo}}. Tengo {{soportes}}. Necesito identificar la actuación correcta, la autoridad que la recibe y el comprobante que debo conservar.",
    fields: [
      { key: "acto", label: "Qué entidad expidió qué decisión", placeholder: "Ej.: la Secretaría de Movilidad expidió un comparendo" },
      { key: "notificacion", label: "Cuándo y cómo te notificaron o cómo te enteraste", placeholder: "Ej.: nunca me notificaron; lo vi al renovar la licencia" },
      { key: "recursos", label: "Qué recursos y término aparecen escritos", placeholder: "Ej.: menciona reposición, pero no entiendo el plazo" },
      { key: "motivo", label: "Qué hecho, dato o decisión concreta debe revisarse", placeholder: "Ej.: el vehículo ya estaba traspasado para esa fecha" },
      { key: "soportes", label: "Qué documentos y constancias conservas", placeholder: "Ej.: resolución, contrato de venta y formulario de traspaso" },
    ],
  },
  {
    id: "judicial-notificacion",
    label: "Recibí una demanda o notificación judicial",
    category: "otro",
    description: "Para organizar una notificación antes de buscar revisión jurídica urgente.",
    alert: "No uses este ejemplo de relato para contestar el proceso. Conserva todo y solicita revisión humana cuanto antes.",
    template:
      "Recibí una notificación de un juzgado. La recepción ocurrió así: {{recepcion}}. El despacho y la actuación indicados son {{despachoActuacion}}. El radicado, audiencia o término escrito dicen {{radicadoTermino}}. Los documentos recibidos son {{documentos}}. Hasta ahora {{estadoActual}}. Necesito preparar la carpeta completa y encontrar revisión jurídica urgente; este relato no reemplaza la contestación ni suspende ningún plazo.",
    fields: [
      { key: "recepcion", label: "Cuándo, a qué hora y por qué medio recibiste el documento", placeholder: "Ej.: ayer a las 4 p. m. dejaron un sobre en portería" },
      { key: "despachoActuacion", label: "Qué juzgado y qué tipo de actuación aparecen", placeholder: "Ej.: juzgado civil y demanda por una deuda" },
      { key: "radicadoTermino", label: "Radicado y fechas o términos tal como están escritos", placeholder: "Ej.: radicado completo y texto que menciona diez días" },
      { key: "documentos", label: "Qué documento principal y anexos recibiste", placeholder: "Ej.: demanda, mandamiento y tres anexos" },
      { key: "estadoActual", label: "Qué has hecho y qué necesitas revisar", placeholder: "Ej.: no he respondido y necesito saber a quién acudir hoy" },
    ],
  },
];

export const featuredStoryTemplates = storyTemplates.filter((template) => template.featured);

export function getStoryTemplate(templateId: string) {
  return storyTemplates.find((template) => template.id === templateId);
}
