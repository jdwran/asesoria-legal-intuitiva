import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { scrapeSimitRecords } from "@/lib/simit-scraper";
import {
  normalizeLookup,
  validateLookup,
} from "@/lib/traffic-fines";

export const dynamic = "force-dynamic";

// Permitir hasta 45 segundos para que Puppeteer complete la validación anti-bot de SIMIT
export const maxDuration = 45;

const querySchema = z.object({
  tipo: z.enum(["placa", "documento"]),
  valor: z.string().min(3).max(20),
  idTipoDocumento: z.number().optional().default(1),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = querySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Criterio de búsqueda inválido. Proporciona placa o documento válido." },
        { status: 400 },
      );
    }

    const { tipo, valor } = parsed.data;
    const cleanValue = normalizeLookup(valor);

    const validationError = validateLookup(tipo, cleanValue);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 422 });
    }

    // Ejecutar el scraper headless con resolución de validador y extracción de datos oficiales
    const result = await scrapeSimitRecords(tipo, cleanValue);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al procesar la consulta SIMIT.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
