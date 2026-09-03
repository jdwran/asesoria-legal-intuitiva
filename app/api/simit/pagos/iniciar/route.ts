import { NextResponse } from "next/server";
import { processSimitPayment, type PaymentInitiationRequest } from "@/lib/simit-payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentInitiationRequest;

    if (!body || !body.metodoPago || !body.pagador || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { exitoso: false, error: "Datos de pago incompletos o sin infracciones seleccionadas." },
        { status: 400 },
      );
    }

    if (!body.pagador.numeroDocumento || !body.pagador.nombres || !body.pagador.email) {
      return NextResponse.json(
        { exitoso: false, error: "Los datos del pagador (documento, nombres, email) son obligatorios." },
        { status: 400 },
      );
    }

    const response = await processSimitPayment(body);
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al procesar la pasarela de pago.";
    return NextResponse.json({ exitoso: false, error: msg }, { status: 500 });
  }
}
