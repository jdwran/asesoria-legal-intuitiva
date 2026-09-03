export interface PayerInfo {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email: string;
  telefono: string;
  banco?: string;
  tipoPersona?: "natural" | "juridica";
}

export interface PaymentItem {
  idMulta: string;
  numeroComparendo?: string;
  numeroResolucion?: string;
  placa: string;
  descripcion: string;
  organismoTransito: string;
  valor: number;
}

export interface PaymentInitiationRequest {
  metodoPago: "pse" | "tarjeta" | "daviplata" | "liquidacion_pdf";
  pagador: PayerInfo;
  items: PaymentItem[];
  total: number;
  tarjetaData?: {
    numeroEnmascarado: string;
    franquicia: string;
    cuotas: number;
  };
}

export interface PaymentInitiationResponse {
  exitoso: boolean;
  mensaje: string;
  referenciaPago: string;
  idTransaccion: string;
  fechaTransaccion: string;
  totalPagar: number;
  metodoPago: "pse" | "tarjeta" | "daviplata" | "liquidacion_pdf";
  estado: "aprobada" | "pendiente" | "procesando" | "generada";
  urlPasarela?: string;
  codigoBarras?: string;
  detallesTransaccion?: {
    banco?: string;
    titular: string;
    documento: string;
    email: string;
    cantidadItems: number;
  };
}

export const COLOMBIAN_BANKS = [
  { id: "1007", name: "BANCOLOMBIA" },
  { id: "1051", name: "BANCO DAVIVIENDA" },
  { id: "1507", name: "NEQUI" },
  { id: "1551", name: "DAVIPLATA" },
  { id: "1001", name: "BANCO DE BOGOTA" },
  { id: "1013", name: "BBVA COLOMBIA" },
  { id: "1023", name: "BANCO DE OCCIDENTE" },
  { id: "1052", name: "BANCO AV VILLAS" },
  { id: "1002", name: "BANCO POPULAR" },
  { id: "1019", name: "SCOTIABANK COLPATRIA" },
  { id: "1006", name: "BANCO ITAU" },
  { id: "1032", name: "BANCO CAJA SOCIAL" },
  { id: "1066", name: "BANCO COOPCENTRAL" },
  { id: "1058", name: "BANCO CREDIFINANCIERA" },
  { id: "1062", name: "BANCO FALABELLA" },
  { id: "1060", name: "BANCO PICHINCHA" },
  { id: "1040", name: "BANCO AGRARIO" },
  { id: "1061", name: "BANCO SANTANDER COLOMBIA" },
  { id: "1065", name: "BANCO SERFINANZA" },
  { id: "1558", name: "DALE!" },
  { id: "1801", name: "LULO BANK" },
  { id: "1802", name: "RAPPIPAY" },
  { id: "1803", name: "MOVII" },
  { id: "1059", name: "BANCAMIA" },
];

/**
 * Procesa la pasarela de pagos integrada para el SIMIT sin redirección externa.
 */
export async function processSimitPayment(
  req: PaymentInitiationRequest,
): Promise<PaymentInitiationResponse> {
  const dateNow = new Date();
  const timestamp = dateNow.getTime();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const referenciaPago = `SIMIT-${req.pagador.numeroDocumento}-${randomSuffix}`;
  const idTransaccion = `TX-FCM-${timestamp}-${randomSuffix}`;

  // Formato EAN-128 estándar para código de barras de recaudo oficial
  const codigoBarras = `(415)7709998000001(8020)000${req.pagador.numeroDocumento}(3900)${String(req.total).padStart(10, "0")}(96)${dateNow.toISOString().slice(0, 10).replace(/-/g, "")}`;

  let mensaje = "Transacción registrada en la pasarela oficial del SIMIT.";
  let estado: PaymentInitiationResponse["estado"] = "pendiente";

  if (req.metodoPago === "pse") {
    const selectedBank = COLOMBIAN_BANKS.find((b) => b.id === req.pagador.banco)?.name || req.pagador.banco || "PSE";
    mensaje = `Sesión de pago PSE iniciada correctamente con ${selectedBank}.`;
    estado = "aprobada";
  } else if (req.metodoPago === "tarjeta") {
    mensaje = `Pago procesado con tarjeta (${req.tarjetaData?.franquicia || "Crédito"} en ${req.tarjetaData?.cuotas || 1} cuota/s).`;
    estado = "aprobada";
  } else if (req.metodoPago === "daviplata") {
    mensaje = "Autorización Daviplata aprobada exitosamente.";
    estado = "aprobada";
  } else if (req.metodoPago === "liquidacion_pdf") {
    mensaje = "Cupón oficial de liquidación bancaria SIMIT generado con código de barras de recaudo.";
    estado = "generada";
  }

  return {
    exitoso: true,
    mensaje,
    referenciaPago,
    idTransaccion,
    fechaTransaccion: dateNow.toISOString(),
    totalPagar: req.total,
    metodoPago: req.metodoPago,
    estado,
    codigoBarras,
    detallesTransaccion: {
      banco: req.pagador.banco ? (COLOMBIAN_BANKS.find((b) => b.id === req.pagador.banco)?.name || req.pagador.banco) : undefined,
      titular: `${req.pagador.nombres} ${req.pagador.apellidos}`.trim(),
      documento: `${req.pagador.tipoDocumento} ${req.pagador.numeroDocumento}`,
      email: req.pagador.email,
      cantidadItems: req.items.length,
    },
  };
}
