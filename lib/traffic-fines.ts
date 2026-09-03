/**
 * Reglas de descuento de comparendos de tránsito y utilidades de fechas.
 *
 * Todo aquí es informativo: la aplicación **no consulta el SIMIT** (no hay una
 * API pública para hacerlo) ni afirma un plazo definitivo. El cálculo de días
 * hábiles descuenta sábados y domingos, pero **no los festivos**, así que las
 * fechas que produce son orientativas y siempre deben confirmarse con la
 * autoridad de tránsito o con el propio comparendo.
 */

export interface FineDiscountTier {
  id: "descuento-50" | "descuento-25";
  percentage: number;
  businessDays: number;
  requirement: string;
}

/**
 * Artículo 136 del Código Nacional de Tránsito, modificado por la Ley 1843 de
 * 2017. Los porcentajes y los términos aparecen impresos en la orden de
 * comparendo: si lo que ves allí no coincide con esto, manda el comparendo.
 */
export const discountTiers: FineDiscountTier[] = [
  {
    id: "descuento-50",
    percentage: 50,
    businessDays: 5,
    requirement: "Pagando dentro del término y asistiendo al curso de seguridad vial.",
  },
  {
    id: "descuento-25",
    percentage: 25,
    businessDays: 20,
    requirement: "Pagando dentro del término y asistiendo al curso de seguridad vial.",
  },
];

/** Fecha en formato YYYY-MM-DD interpretada en horario local, sin desfase UTC. */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

/** Suma días hábiles saltando sábados y domingos. No conoce los festivos. */
export function addBusinessDays(start: Date, businessDays: number): Date {
  const result = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let remaining = businessDays;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return result;
}

/** Días de calendario entre dos fechas, ignorando la hora. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export interface FineDeadline extends FineDiscountTier {
  deadline: Date;
  daysLeft: number;
  status: "vigente" | "ultimo-dia" | "vencido";
  amount: number | null;
}

/**
 * Ventanas de descuento a partir de la fecha del comparendo. `amount` es el
 * valor con el descuento aplicado cuando se conoce el valor total.
 */
export function buildFineDeadlines(
  impositionDate: Date,
  today: Date,
  totalAmount: number | null = null,
): FineDeadline[] {
  return discountTiers.map((tier) => {
    const deadline = addBusinessDays(impositionDate, tier.businessDays);
    const daysLeft = daysBetween(today, deadline);
    return {
      ...tier,
      deadline,
      daysLeft,
      status: daysLeft < 0 ? "vencido" : daysLeft === 0 ? "ultimo-dia" : "vigente",
      amount:
        totalAmount === null || Number.isNaN(totalAmount)
          ? null
          : Math.round(totalAmount * (1 - tier.percentage / 100)),
    };
  });
}

/** El descuento más alto que todavía está a tiempo, si queda alguno. */
export function bestAvailableDiscount(deadlines: FineDeadline[]): FineDeadline | null {
  return deadlines.find((deadline) => deadline.status !== "vencido") ?? null;
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export const SIMIT_HOME_URL = "https://www.fcm.org.co/simit/#/home-public";
export const SIMIT_PAYMENT_POINTS_URL = "https://www.fcm.org.co/simit/#/puntos-pago";
export const SIMIT_AGREEMENTS_URL = "https://www.fcm.org.co/simit/#/tramites-servicios";

export interface AgreementStatus {
  dueDate: Date;
  daysLeft: number;
  status: "vigente" | "ultimo-dia" | "vencido";
  amount: number | null;
}

export function buildAgreementStatus(
  dueDate: Date,
  today: Date,
  amount: number | null = null,
): AgreementStatus {
  const daysLeft = daysBetween(today, dueDate);
  return {
    dueDate,
    daysLeft,
    status: daysLeft < 0 ? "vencido" : daysLeft === 0 ? "ultimo-dia" : "vigente",
    amount,
  };
}

export function generateAlertEmailContent({
  userName,
  reference,
  kind,
  subject,
  daysLeft,
  deadlineText,
  amount,
  discountPercentage,
}: {
  userName: string;
  reference: string;
  kind: "comparendo" | "acuerdo_pago";
  subject?: string;
  daysLeft: number;
  deadlineText: string;
  amount?: number | null;
  discountPercentage?: number;
}): { subject: string; text: string; html: string } {
  const isAgreement = kind === "acuerdo_pago";
  const title = isAgreement
    ? `Alerta: Vencimiento de cuota de acuerdo de pago N.° ${reference}`
    : `Alerta: Vencimiento de descuento para comparendo N.° ${reference}`;

  const urgencyText =
    daysLeft === 0
      ? "¡Vence HOY!"
      : daysLeft < 0
        ? `Venció hace ${Math.abs(daysLeft)} día(s)`
        : `Quedan ${daysLeft} día(s) para la fecha límite`;

  const formattedAmount = amount ? formatCurrency(amount) : "Por consultar en SIMIT";
  const vehicleText = subject ? ` (Placa/Doc: ${subject})` : "";

  const text = `Hola ${userName || "Ciudadano(a)"},

Te recordamos que tienes una fecha importante registrada en Orientador Legal:

Obligación: ${isAgreement ? "Cuota de Acuerdo de Pago" : "Comparendo de Tránsito"}${vehicleText}
Referencia N.°: ${reference}
Estado del plazo: ${urgencyText}
Fecha límite: ${deadlineText}
${discountPercentage ? `Beneficio: ${discountPercentage}% de descuento aplicable asistiendo al curso vial.\n` : ""}Valor registrado: ${formattedAmount}

Puedes consultar tu estado oficial de cuenta y realizar el pago en línea a través del portal oficial del SIMIT:
${SIMIT_HOME_URL}

Recomendación: Si realizas el pago con descuento, recuerda agendar y asistir al curso sobre normas de tránsito para validar el beneficio.

--
Orientador Legal Colombia
Guía informativa ciudadana`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #102238; background-color: #fdfcf8; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="background-color: #173f6b; padding: 16px 20px; border-radius: 8px; color: white; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px;">Orientador Legal Colombia</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.85;">Alerta de Tránsito y Vencimiento</p>
      </div>

      <p style="font-size: 15px;">Hola <strong>${userName || "Ciudadano(a)"}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.5;">Te informamos sobre una fecha límite próxima para tu obligación de tránsito registrada:</p>

      <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: bold;">
          ${isAgreement ? "Cuota de Acuerdo de Pago" : "Comparendo de Tránsito"}${vehicleText}
        </p>
        <p style="margin: 0 0 12px 0; font-size: 17px; font-weight: bold; color: #173f6b;">
          N.° ${reference}
        </p>
        <div style="background-color: ${daysLeft <= 1 ? "#fee2e2" : "#fef3c7"}; color: ${daysLeft <= 1 ? "#991b1b" : "#92400e"}; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-bottom: 12px;">
          ${urgencyText}
        </div>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Fecha límite:</strong> ${deadlineText}</p>
        ${discountPercentage ? `<p style="margin: 6px 0; font-size: 14px; color: #047857;"><strong>Beneficio:</strong> ${discountPercentage}% de descuento (con curso vial)</p>` : ""}
        <p style="margin: 6px 0; font-size: 14px;"><strong>Valor:</strong> ${formattedAmount}</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${SIMIT_HOME_URL}" target="_blank" style="background-color: #173f6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          Pagar o Consultar en el SIMIT
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
        Nota informativa: Orientador Legal no recauda dinero ni reemplaza la consulta oficial del SIMIT. Consulta siempre tu estado oficial antes de realizar cualquier pago.
      </p>
    </div>
  `;

  return { subject: title, text, html };
}

export type LookupKind = "placa" | "documento";

/** Quita espacios y guiones y sube a mayúsculas; el SIMIT no distingue formato. */
export function normalizeLookup(value: string): string {
  return value.replace(/[\s.-]/g, "").toLocaleUpperCase("es-CO");
}

/** Devuelve el mensaje de error, o null si el dato sirve para consultar. */
export function validateLookup(kind: LookupKind, value: string): string | null {
  const clean = normalizeLookup(value);
  if (!clean) {
    return kind === "placa" ? "Escribe la placa del vehículo." : "Escribe el número de documento.";
  }
  if (kind === "placa") {
    // Carros: tres letras y tres números. Motos: tres letras, dos números y una letra.
    const carro = /^[A-Z]{3}\d{3}$/.test(clean);
    const moto = /^[A-Z]{3}\d{2}[A-Z]$/.test(clean);
    if (!carro && !moto) {
      return "Revisa la placa: son tres letras y tres números (ABC123), o tres letras, dos números y una letra en motos (ABC12D).";
    }
    return null;
  }
  if (!/^\d{5,12}$/.test(clean)) {
    return "Revisa el documento: solo números, entre 5 y 12 dígitos.";
  }
  return null;
}

export interface SimitInfractionItem {
  id: string;
  tipo: "comparendo" | "fotodeteccion" | "resolucion";
  numeroComparendo: string;
  numeroResolucion?: string;
  fecha: string;
  hora?: string;
  placa: string;
  codigoInfraccion: string;
  descripcionInfraccion: string;
  organismoTransito: string;
  departamento?: string;
  municipio?: string;
  valorBase: number;
  valorPagar: number;
  descuento50?: number;
  fechaLimite50?: string;
  descuento25?: number;
  fechaLimite25?: string;
  diasRestantes50?: number;
  diasRestantes25?: number;
  estadoDescuento: "50%" | "25%" | "vencido" | "pagado";
  estadoComparendo: "vigente" | "coactivo" | "pagado" | "impugnado" | "en_acuerdo";
  requiereCurso: boolean;
  polca?: boolean;
}

export interface SimitAcuerdoItem {
  id: string;
  numeroAcuerdo: string;
  consecutivoCartera?: string;
  fechaSuscripcion: string;
  organismoTransito: string;
  departamento?: string;
  cuotaActual: number;
  totalCuotas: number;
  valorCuota: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: "al_dia" | "por_vencer" | "vencido" | "pagado";
  totalPagarAcuerdo?: number;
}

export interface SimitQueryResult {
  exitoso: boolean;
  mensaje: string;
  pazSalvo: boolean;
  consultadoEn: string;
  criterio: {
    tipo: "placa" | "documento";
    valor: string;
    tipoDocumentoDescripcion?: string;
  };
  infractor?: {
    nombreCompleto?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
  };
  resumen: {
    totalMultas: number;
    cantidadMultas: number;
    totalAcuerdos: number;
    cantidadAcuerdos: number;
    totalGeneral: number;
    tieneDescuentosActivos: boolean;
    proximoVencimiento?: string;
  };
  multas: SimitInfractionItem[];
  acuerdos: SimitAcuerdoItem[];
  fuente: "simit_oficial" | "simit_direct" | "simit_local";
}

/**
 * Convierte los datos crudos del panel oficial de SIMIT en la estructura enriquecida
 * con cálculo de plazos hábiles, descuentos del 50% y 25% y fechas de vencimiento.
 */
export function parseSimitPanelData(
  raw: any,
  queryKind: LookupKind,
  queryValue: string,
  today = new Date(),
): SimitQueryResult {
  if (!raw || typeof raw !== "object") {
    return {
      exitoso: false,
      mensaje: "No se recibieron datos válidos del panel SIMIT.",
      pazSalvo: true,
      consultadoEn: today.toISOString(),
      criterio: { tipo: queryKind, valor: queryValue },
      resumen: {
        totalMultas: 0,
        cantidadMultas: 0,
        totalAcuerdos: 0,
        cantidadAcuerdos: 0,
        totalGeneral: 0,
        tieneDescuentosActivos: false,
      },
      multas: [],
      acuerdos: [],
      fuente: "simit_oficial",
    };
  }

  const rawMultas: any[] = Array.isArray(raw.multas) ? raw.multas : [];
  const rawAcuerdos: any[] = Array.isArray(raw.acuerdosPago) ? raw.acuerdosPago : [];

  let infractorData: { nombreCompleto?: string; tipoDocumento?: string; numeroDocumento?: string } | undefined = undefined;

  const multas: SimitInfractionItem[] = rawMultas.map((m, idx) => {
    // Extraer infractor si está presente en la multa
    if (m.infractor && !infractorData) {
      const nombre = `${m.infractor.nombre || ""} ${m.infractor.apellido || ""}`.trim();
      infractorData = {
        nombreCompleto: nombre || undefined,
        tipoDocumento: m.infractor.tipoDocumento || undefined,
        numeroDocumento: m.infractor.numeroDocumento || undefined,
      };
    }

    // Extraer fecha de la multa o de la proyección de resolución
    let rawFecha = m.fecha || m.fechaComparendo || "";
    if (!rawFecha && Array.isArray(m.proyeccion) && m.proyeccion[0]?.fecha) {
      const projFecha: string = m.proyeccion[0].fecha;
      // Convertir formato DD/MM/YYYY a YYYY-MM-DD
      const dateParts = projFecha.split(" ")[0].split("/");
      if (dateParts.length === 3) {
        rawFecha = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;
      }
    }
    if (!rawFecha) {
      rawFecha = today.toISOString().split("T")[0];
    }

    const fechaObj = parseLocalDate(rawFecha) || today;
    const baseAmount = Number(m.valor) || Number(m.valorInfraccion) || Number(m.valorPagar) || 0;
    const totalPagar = Number(m.valorPagar) || baseAmount;
    const deadlines = buildFineDeadlines(fechaObj, today, baseAmount);
    const d50 = deadlines[0];
    const d25 = deadlines[1];

    const infraccionObj = Array.isArray(m.infracciones) && m.infracciones[0] ? m.infracciones[0] : null;
    const codigo = m.codigoInfraccion || infraccionObj?.codigoInfraccion || "INF";
    const descripcion = m.descripcionInfraccion || infraccionObj?.descripcionInfraccion || "Infracción de tránsito";

    const isResolucion = m.comparendo === false || Boolean(m.numeroResolucion && !m.numeroComparendo);

    return {
      id: `simit-raw-${m.numeroComparendo || m.numeroResolucion || idx}`,
      tipo: isResolucion ? "resolucion" : m.fotodeteccion ? "fotodeteccion" : "comparendo",
      numeroComparendo: String(m.numeroComparendo || m.numeroResolucion || `COMP-${idx + 1}`),
      numeroResolucion: m.numeroResolucion ? String(m.numeroResolucion) : undefined,
      fecha: rawFecha,
      hora: m.hora,
      placa: m.placa || queryValue,
      codigoInfraccion: codigo,
      descripcionInfraccion: descripcion,
      organismoTransito: m.organismoTransito || m.secretaria || "Organismo de Tránsito",
      departamento: m.departamento,
      municipio: m.municipio || m.organismoTransito,
      valorBase: baseAmount,
      valorPagar: totalPagar,
      descuento50: isResolucion ? undefined : (d50.amount ?? baseAmount * 0.5),
      fechaLimite50: isResolucion ? undefined : d50.deadline.toISOString().split("T")[0],
      descuento25: isResolucion ? undefined : (d25.amount ?? baseAmount * 0.75),
      fechaLimite25: isResolucion ? undefined : d25.deadline.toISOString().split("T")[0],
      diasRestantes50: isResolucion ? -1 : d50.daysLeft,
      diasRestantes25: isResolucion ? -1 : d25.daysLeft,
      estadoDescuento: isResolucion
        ? "vencido"
        : d50.status === "vigente"
          ? "50%"
          : d25.status === "vigente"
            ? "25%"
            : "vencido",
      estadoComparendo:
        m.estado === "PAGADO" || m.estadoCartera === "Pagado"
          ? "pagado"
          : m.estadoCartera === "Pendiente de pago" || m.estadoCartera === "Cobro coactivo"
            ? "coactivo"
            : "vigente",
      requiereCurso: !isResolucion,
    };
  });

  const acuerdos: SimitAcuerdoItem[] = [];
  rawAcuerdos.forEach((a, aIdx) => {
    const cuotasList: any[] = Array.isArray(a.cuotasPendientes) ? a.cuotasPendientes : [];
    if (cuotasList.length > 0) {
      cuotasList.forEach((c, cIdx) => {
        const rawDue = c.fechaVencimiento || today.toISOString().split("T")[0];
        const dueObj = parseLocalDate(rawDue) || today;
        const status = buildAgreementStatus(dueObj, today, Number(c.valorCuota) || 0);

        acuerdos.push({
          id: `simit-ap-${a.numeroAcuerdo || aIdx}-${c.nroCuota || cIdx}`,
          numeroAcuerdo: String(a.numeroAcuerdo || `AP-${aIdx + 1}`),
          consecutivoCartera: a.consecutivoCartera,
          fechaSuscripcion: a.fechaSuscripcion || today.toISOString().split("T")[0],
          organismoTransito: a.secretaria || "Organismo de Tránsito",
          cuotaActual: Number(c.nroCuota) || cIdx + 1,
          totalCuotas: Number(a.cantCuotasPendientes) || cuotasList.length,
          valorCuota: Number(c.valorCuota) || 0,
          fechaVencimiento: rawDue,
          diasRestantes: status.daysLeft,
          estado: status.status === "vencido" ? "vencido" : status.daysLeft <= 3 ? "por_vencer" : "al_dia",
        });
      });
    } else {
      acuerdos.push({
        id: `simit-ap-${a.numeroAcuerdo || aIdx}`,
        numeroAcuerdo: String(a.numeroAcuerdo || `AP-${aIdx + 1}`),
        consecutivoCartera: a.consecutivoCartera,
        fechaSuscripcion: a.fechaSuscripcion || today.toISOString().split("T")[0],
        organismoTransito: a.secretaria || "Organismo de Tránsito",
        cuotaActual: 1,
        totalCuotas: Number(a.cantCuotasPendientes) || 1,
        valorCuota: Number(a.totalPagarSinDescuento) || 0,
        fechaVencimiento: today.toISOString().split("T")[0],
        diasRestantes: 0,
        estado: "al_dia",
      });
    }
  });

  const isPazSalvo = raw.pazSalvo === true || (multas.length === 0 && acuerdos.length === 0);
  const totalMultas = multas.reduce((sum, m) => sum + m.valorPagar, 0);
  const totalAcuerdos = acuerdos.reduce((sum, a) => sum + a.valorCuota, 0);

  return {
    exitoso: true,
    mensaje: isPazSalvo
      ? `El ${queryKind === "placa" ? "vehículo con placa" : "ciudadano con documento"} ${queryValue} se encuentra a PAZ Y SALVO en el SIMIT oficial.`
      : `Se encontraron ${multas.length} comparendo(s)/resolución(es) y ${acuerdos.length} cuota(s) de acuerdo en el SIMIT oficial.`,
    pazSalvo: isPazSalvo,
    consultadoEn: today.toISOString(),
    criterio: {
      tipo: queryKind,
      valor: queryValue,
    },
    infractor: infractorData,
    resumen: {
      totalMultas,
      cantidadMultas: multas.length,
      totalAcuerdos,
      cantidadAcuerdos: acuerdos.length,
      totalGeneral: totalMultas + totalAcuerdos,
      tieneDescuentosActivos: multas.some((m) => m.estadoDescuento === "50%" || m.estadoDescuento === "25%"),
      proximoVencimiento: multas[0]?.fechaLimite50 || acuerdos[0]?.fechaVencimiento,
    },
    multas,
    acuerdos,
    fuente: "simit_oficial",
  };
}


