import type { LegalCategory } from "./legal-data.ts";

export interface StoryTemplate {
  id: string;
  label: string;
  category: LegalCategory;
  description: string;
  story: string;
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
    story:
      "Trabajo para [nombre o tipo de empleador] en [municipio] desde [fecha aproximada], desempeñando el cargo o labor de [cargo o labor]. Mi vínculo es [contrato escrito / acuerdo verbal / prestación de servicios / no estoy seguro]. No me han pagado [salario, liquidación o prestación] correspondiente a [periodos]. El último pago que recibí fue el [fecha]. He pedido una solución por [correo, mensaje o conversación] el [fecha] y me respondieron [respuesta o no hubo respuesta]. Tengo como soportes [contrato, chats, turnos, desprendibles o movimientos bancarios]. Necesito orientación para reclamar lo pendiente y dejar constancia de mi solicitud.",
  },
  {
    id: "laboral-despido-liquidacion",
    label: "Me despidieron o terminó mi contrato",
    category: "laboral",
    description: "Para organizar la terminación, la causa informada y los pagos o documentos faltantes.",
    story:
      "Trabajé para [nombre o tipo de empleador] en [municipio] desde [fecha de inicio] hasta [fecha de terminación], como [cargo o labor]. El [fecha] me informaron la terminación por [medio] y dijeron que la razón era [razón informada / no explicaron]. Mi contrato era [tipo de contrato / no estoy seguro]. Me entregaron [carta, liquidación o ningún documento] y están pendientes [salario, liquidación, prestaciones, certificado u otro]. Tengo [contrato, carta, chats, comprobantes y datos de testigos]. Quiero entender qué debo pedir por escrito y a qué entidad acudir si no recibo respuesta.",
  },
  {
    id: "arrendamiento-terminacion",
    label: "Problema con arriendo o entrega del inmueble",
    category: "arrendamiento",
    description: "Para avisos de terminación, entrega, pagos discutidos o intentos de desalojo.",
    featured: true,
    story:
      "Soy [arrendatario / arrendador] de una [vivienda urbana / habitación / local] ubicada en [municipio]. El contrato es [escrito / verbal], comenzó el [fecha] y el canon acordado es de [valor aproximado, si es necesario]. El [fecha] recibí o envié un aviso por [medio] solicitando [terminar el contrato / entregar el inmueble / pagar una deuda] con la razón de [causal indicada]. La situación de cánones, servicios y administración es [al día / hay valores discutidos]. Tengo [contrato, inventario, avisos, comprobantes, fotos o mensajes]. Necesito saber cuál comunicación enviar y qué ruta seguir sin tomar medidas por la fuerza.",
  },
  {
    id: "salud-servicio-negado",
    label: "EPS o IPS niega o demora un servicio",
    category: "salud",
    description: "Para medicamentos, citas, procedimientos, terapias o autorizaciones demoradas.",
    featured: true,
    alert: "Si existe una urgencia o deterioro grave, busca atención inmediata antes de completar el formulario.",
    story:
      "Estoy afiliado a [EPS] y recibo atención en [IPS o centro médico]. El profesional de salud ordenó [medicamento, cita, procedimiento o tratamiento] el [fecha] por [descripción breve de la necesidad, sin autodiagnosticar]. Solicité el servicio por [canal] el [fecha] y obtuve el radicado [número o no me dieron radicado]. La entidad respondió [negativa, demora, autorización incompleta o no respondió]. Esta situación está causando [afectación o riesgo indicado por el personal de salud]. Tengo [orden médica, historia pertinente, autorización, respuesta y radicados]. Necesito que me indiquen cómo pedir la atención y cómo escalar si la barrera continúa.",
  },
  {
    id: "familia-cuota-alimentos",
    label: "Cuota de alimentos no fijada o incumplida",
    category: "familia",
    description: "Para solicitar una cuota, revisar un acuerdo o registrar pagos atrasados.",
    story:
      "La situación se relaciona con los alimentos de [mi hija, hijo u otra persona beneficiaria], de [edad aproximada]. [Existe / no existe] un acta, acuerdo o decisión del [fecha] que fijó una cuota de [valor o forma de aporte]. La persona obligada [no ha pagado / paga de forma incompleta / quiero solicitar la fijación] desde [fecha o periodos]. Los gastos principales son [alimentación, vivienda, atención médica, educación y otros] y cuento con [registro civil, recibos, acuerdo, consignaciones o mensajes]. La otra persona vive o puede ser ubicada en [municipio o dato general]. Necesito saber dónde solicitar la fijación o el cumplimiento y qué constancia debo conservar.",
  },
  {
    id: "familia-custodia-visitas",
    label: "Custodia, cuidado personal o visitas",
    category: "familia",
    description: "Para definir o modificar acuerdos sobre cuidado y contacto con hijos.",
    story:
      "Necesito orientación sobre [custodia, cuidado personal o visitas] de [mi hija o hijo], de [edad aproximada], quien vive actualmente con [persona cuidadora] en [municipio]. [Existe / no existe] un acuerdo, acta o decisión previa del [fecha]. El problema actual es [incumplimiento, desacuerdo de horarios, cambio de residencia u otro hecho] y ocurre desde [fecha]. He intentado acordar una solución por [medio] y la respuesta fue [respuesta o no hubo acuerdo]. Tengo [registro civil, actas, decisiones, mensajes y soportes relevantes]. No hay violencia o riesgo actual [ajusta esta frase si no es cierto]. Quiero saber ante qué entidad pedir orientación y cómo dejar un acuerdo verificable.",
  },
  {
    id: "familia-violencia-proteccion",
    label: "Violencia familiar o necesidad de protección",
    category: "familia",
    description: "Para organizar hechos y pedir protección; no propone conciliación como salida automática.",
    alert: "Si hay peligro actual, busca un lugar seguro y llama al 123. La Línea 155 orienta a mujeres víctimas de violencia y la Línea 141 atiende riesgos para menores de edad.",
    story:
      "Tengo o tuve una relación de [pareja, expareja o vínculo familiar] con [persona involucrada, sin escribir su identificación]. El [fecha o periodo] en [municipio o lugar general] ocurrió [describe amenazas, agresiones, control u otros hechos en orden]. En este momento estoy [a salvo / en riesgo / no estoy seguro] y [hay / no hay] niñas, niños u otras personas en riesgo. Ya pedí ayuda a [entidad o persona, si aplica] y recibí [respuesta o ninguna]. Tengo disponibles [mensajes, fotos, reportes médicos, medidas previas o datos de testigos], pero necesito protección aunque no tenga todos los soportes. Para recibir orientación de forma segura necesito [llamada desde un lugar seguro / atención presencial / otra alternativa sin incluir aquí mis datos de contacto].",
  },
  {
    id: "penal-hurto-estafa-amenaza",
    label: "Hurto, estafa, amenaza u otro posible delito",
    category: "penal",
    description: "Para preparar una denuncia con cronología, evidencias y necesidades de protección.",
    alert: "Si el hecho ocurre ahora o existe peligro, llama al 123 antes de completar el relato.",
    story:
      "El [fecha] aproximadamente a las [hora] en [municipio y lugar general] ocurrió [hurto, estafa, amenaza, agresión u otro hecho]. La secuencia fue: [cuenta en orden qué pasó, sin completar lo que no recuerdes]. Participaron [personas conocidas o descripción general] y hubo [testigos / no conozco testigos]. La pérdida, afectación o riesgo consiste en [descripción y valor aproximado si aplica]. Conservé [mensajes, recibos, capturas, fotos, videos o archivos originales] y están guardados en [lugar seguro]. [Ya denuncié y tengo el número / aún no he denunciado]. Necesito organizar el relato, saber dónde presentarlo y qué número o constancia debo guardar.",
  },
  {
    id: "administrativo-multa-resolucion",
    label: "Multa, comparendo o decisión de una entidad",
    category: "administrativo",
    description: "Para revisar una decisión administrativa, su notificación y los recursos indicados.",
    alert: "Una petición genérica no suspende automáticamente el término de un recurso. Busca revisión humana si la fecha está próxima.",
    story:
      "La entidad [nombre de la entidad pública] expidió [resolución, multa, comparendo u otro acto] número [número o referencia] sobre [asunto]. Recibí la notificación el [fecha] por [correo, sede electrónica, entrega personal u otro medio]. El documento indica que proceden [recursos que aparecen / no entiendo la parte de recursos] y menciona [fecha o término escrito en el acto]. Considero que deben revisar [hecho, dato o decisión concreta] porque [razones basadas en lo ocurrido]. Tengo el acto completo, sus anexos y [constancia de notificación, pagos, solicitudes o radicados previos]. Necesito identificar la actuación correcta, la autoridad que la recibe y el comprobante que debo conservar.",
  },
  {
    id: "judicial-notificacion",
    label: "Recibí una demanda o notificación judicial",
    category: "otro",
    description: "Para organizar una notificación antes de buscar revisión jurídica urgente.",
    alert: "No uses esta plantilla para contestar el proceso. Conserva todo y solicita revisión humana cuanto antes.",
    story:
      "El [fecha y hora aproximada] recibí por [correo, mensaje, entrega personal u otro medio] un documento de [juzgado o despacho] relacionado con [demanda, audiencia, mandamiento u otra actuación]. El número de radicado que aparece es [radicado] y el documento menciona [fecha de audiencia o término escrito, sin calcularlo]. Recibí [documento principal y anexos / faltan anexos / no estoy seguro] y la notificación fue dirigida a [mi persona o entidad relacionada]. Aún no he presentado una respuesta. Tengo guardados el mensaje, el sobre o constancia y todos los archivos recibidos. Necesito preparar la carpeta completa y encontrar revisión jurídica urgente; entiendo que este relato no reemplaza la contestación ni suspende ningún plazo.",
  },
];

export const featuredStoryTemplates = storyTemplates.filter((template) => template.featured);

export function getStoryTemplate(templateId: string) {
  return storyTemplates.find((template) => template.id === templateId);
}
