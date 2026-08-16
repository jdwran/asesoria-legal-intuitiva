import type { LegalCategory } from "./legal-data.ts";

export interface StoryTemplate {
  id: string;
  label: string;
  template: string;
  category: LegalCategory;
  description: string;
  featured?: boolean;
  alert?: string;
}

export const storyTemplates: StoryTemplate[] = [
  {
    id: "laboral-pagos-pendientes",
    label: "No me pagan salario o prestaciones",
    category: "laboral",
    description: "Para salarios, liquidación, prima, cesantías u otros pagos laborales pendientes.",
    featured: true,
    template:
      "Trabajo o trabajé para [empresa o tipo de empleador, sin datos de identificación] en [municipio], desde [fecha aproximada] como [cargo o labor]. Mi vínculo es o era [contrato escrito / acuerdo verbal / prestación de servicios, según corresponda]. No me han pagado [concepto pendiente y periodo aproximado]. Reclamé por [correo / mensaje / carta / conversación] y [respuesta recibida o “no respondieron”]. Conservo [contrato / chats / turnos / desprendibles / comprobantes / otros soportes]. Necesito orientación para reclamar lo pendiente y dejar constancia de mi solicitud.",
  },
  {
    id: "laboral-despido-liquidacion",
    label: "Me despidieron o terminó mi contrato",
    category: "laboral",
    description: "Para organizar la terminación, la causa informada y los pagos o documentos faltantes.",
    template:
      "Trabajé para [empresa o tipo de empleador, sin datos de identificación] en [municipio] desde [fecha aproximada], realizando [cargo o labor]. Mi contrato laboral o vínculo funcionaba así: [contrato escrito / acuerdo verbal / prestación de servicios, horarios y forma de pago]. La relación terminó el [fecha aproximada] por [carta / mensaje / llamada / conversación] y me indicaron [motivo informado o “no explicaron la causa”]. Me entregaron [carta / liquidación / certificado / ningún documento] y quedaron pendientes [pagos o documentos]. Conservo [contrato / chats / pagos / turnos / testigos / otros soportes]. Quiero saber qué pedir por escrito y dónde buscar orientación.",
  },
  {
    id: "arrendamiento-terminacion",
    label: "Problema con arriendo o entrega del inmueble",
    category: "arrendamiento",
    description: "Para comunicaciones sobre vivienda, entrega, pagos discutidos o acceso al inmueble.",
    featured: true,
    template:
      "Soy [arrendatario/a / arrendador/a] de una [vivienda urbana / habitación / otro inmueble de vivienda] en [municipio]. El contrato de arriendo es [escrito / verbal] y comenzó en [fecha aproximada]. El problema actual es [describe en tus palabras lo que ocurrió]. Recibí o envié una comunicación el [fecha aproximada] por [carta / correo / mensaje / conversación], que decía [resumen del mensaje]. Los pagos de canon, servicios y administración están [estado general de los pagos]. Conservo [contrato / recibos / mensajes / inventario / fotos / otros soportes]. Necesito saber qué comunicación enviar y qué ruta seguir sin tomar medidas por la fuerza.",
  },
  {
    id: "salud-servicio-negado",
    label: "EPS o IPS niega o demora un servicio",
    category: "salud",
    description: "Para medicamentos, citas, procedimientos, terapias o autorizaciones demoradas.",
    featured: true,
    alert: "Si existe una urgencia o un deterioro grave, busca atención inmediata antes de continuar con el relato.",
    template:
      "Estoy afiliado/a a [EPS o régimen] y recibo atención en [municipio]. Un profesional de salud ordenó [medicamento / cita / examen / procedimiento / terapia / otro servicio] el [fecha aproximada]. Lo solicité por [portal / correo / llamada / atención presencial] y tengo [radicado / respuesta / ninguna constancia]. La entidad no entregó el servicio como fue solicitado y ocurrió lo siguiente: [describe la respuesta o la demora]. Esto me afecta así: [consecuencia concreta en tu salud o vida diaria]. Conservo [orden médica / historia / autorización / radicado / respuestas / otros soportes]. Necesito orientación para pedir la atención y escalar la barrera si continúa.",
  },
  {
    id: "familia-cuota-alimentos",
    label: "Cuota de alimentos no fijada o incumplida",
    category: "familia",
    description: "Para solicitar una cuota, revisar un acuerdo o registrar pagos atrasados.",
    template:
      "Necesito orientación sobre una cuota alimentaria para [hijo/a menor u otra persona beneficiaria, indicando solo su edad aproximada]. Existe [acta / acuerdo / decisión judicial / ningún acuerdo] desde [fecha aproximada]. La situación actual es [describe lo que se dejó de pagar o lo que necesitas fijar]. Los gastos principales son [alimentación / vivienda / educación / cuidados / transporte / otros] y conservo [registro civil / recibos / consignaciones / mensajes / acta / otros soportes]. La otra persona vive o trabaja en [municipio o dato general, sin ubicación exacta]. Quiero saber dónde solicitar la fijación o el cumplimiento y qué constancia conservar.",
  },
  {
    id: "familia-custodia-visitas",
    label: "Custodia, cuidado personal o visitas",
    category: "familia",
    description: "Para definir o modificar acuerdos sobre cuidado y contacto con hijos.",
    template:
      "Necesito orientación sobre [custodia / cuidado personal / visitas] de [niño, niña o adolescente, indicando solo su edad aproximada], que actualmente vive con [madre / padre / familiar / otra persona] en [municipio]. Existe [acuerdo verbal / acta / decisión / ningún acuerdo]. El problema actual es [describe el desacuerdo o incumplimiento] desde [fecha aproximada]. Intenté acordar por [mensaje / conversación / conciliación / otro medio] y [respuesta obtenida o “no hubo acuerdo”]. Sobre su bienestar, [describe cualquier situación relevante o indica que no conoces una afectación]. Conservo [registro civil / chats / acta / decisión / otros soportes]. Quiero saber ante qué entidad pedir orientación y cómo dejar un acuerdo verificable.",
  },
  {
    id: "familia-violencia-proteccion",
    label: "Violencia familiar o necesidad de protección",
    category: "familia",
    description: "Para organizar hechos y pedir protección; no propone conciliación como salida automática.",
    alert: "Si hay peligro actual, busca un lugar seguro y llama al 123. La Línea 155 orienta a mujeres víctimas de violencia y la Línea 141 atiende riesgos para menores de edad.",
    template:
      "Necesito protección por violencia familiar de mi pareja, expareja u otro familiar [indica el vínculo sin escribir nombres ni datos de identificación]. Los hechos ocurrieron el [fecha o periodo aproximado] en [lugar general] y consistieron en [describe brevemente qué ocurrió]. En este momento [cuenta si estás a salvo y si esa persona puede acercarse]. También podrían estar expuestas [otras personas, sin escribir sus nombres / ninguna otra persona]. Pedí ayuda a [entidad o servicio / nadie todavía] y [respuesta recibida]. Conservo [mensajes / fotos / audios / valoración / testigos / otros soportes]. Necesito orientación para protegerme y saber qué trámite iniciar.",
  },
  {
    id: "penal-hurto-estafa-amenaza",
    label: "Hurto, estafa, amenaza u otro posible delito",
    category: "penal",
    description: "Para preparar un reporte con cronología, evidencias y necesidades de protección.",
    alert: "Si el hecho ocurre ahora o existe peligro, llama al 123 antes de continuar con el relato.",
    template:
      "Quiero poner en conocimiento un posible delito. Ocurrió el [fecha aproximada] en [lugar general / plataforma digital] y pasó así: [cuenta la secuencia breve en orden, sin completar lo que no recuerdes]. Las personas involucradas o testigos son [relación o descripción general, sin datos sensibles / no los conozco]. La pérdida, afectación o preocupación fue [valor aproximado / bien / lesión / otra consecuencia]. Conservo [comprobante / chats / capturas / audios / fotos / enlace / serial / otros soportes]. Ya informé a [banco / plataforma / Policía / Fiscalía / nadie] y [respuesta o número recibido]. Necesito organizar el relato, saber dónde presentarlo y qué constancia guardar.",
  },
  {
    id: "administrativo-multa-resolucion",
    label: "Multa, comparendo o decisión de una entidad",
    category: "administrativo",
    description: "Para revisar una decisión administrativa, su notificación y los recursos indicados.",
    alert: "Una petición genérica no suspende automáticamente el término de un recurso. Busca revisión humana si la fecha está próxima.",
    template:
      "Una entidad pública, [nombre de la entidad], emitió un acto administrativo relacionado con [asunto general]. Me notificaron o me enteré el [fecha aproximada] por [correo / carta / plataforma / visita / consulta propia], o [explica si no recibiste notificación]. El documento menciona [reposición / apelación / otro recurso / ningún recurso visible] y el término escrito dice [copia sus palabras exactas sin calcularlo]. No estoy de acuerdo porque [hecho, dato o decisión que debe revisarse]. Ya presenté [petición / recurso / pago / ninguna gestión] y [respuesta recibida]. Conservo [acto / constancia de notificación / soportes / comunicaciones]. Necesito identificar la actuación correcta y el comprobante que debo conservar.",
  },
  {
    id: "judicial-notificacion",
    label: "Recibí una demanda o notificación judicial",
    category: "otro",
    description: "Para organizar una notificación antes de buscar revisión jurídica urgente.",
    alert: "No uses este ejemplo de relato para contestar el proceso. Conserva todo y solicita revisión humana cuanto antes.",
    template:
      "Recibí una notificación de [juzgado o despacho] el [fecha y hora aproximadas] por [correo / carta / aviso / sobre / otro medio]. El documento parece corresponder a [demanda / mandamiento / citación / audiencia / otra actuación] y mi relación es [demandante / demandado/a / tercero/a / no estoy seguro/a]. El radicado y cualquier fecha o término dicen [copia tal como aparecen, sin calcularlos]. Recibí [documento principal y anexos] y hasta ahora [no he respondido / consulté el proceso / busqué ayuda / otra actuación]. Necesito preparar la carpeta completa y encontrar revisión jurídica urgente; este relato no reemplaza una contestación ni suspende ningún término.",
  },
];

export const featuredStoryTemplates = storyTemplates.filter((template) => template.featured);

export function getStoryTemplate(templateId: string) {
  return storyTemplates.find((template) => template.id === templateId);
}
