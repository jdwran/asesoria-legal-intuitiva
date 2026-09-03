import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import {
  normalizeLookup,
  parseSimitPanelData,
  validateLookup,
  type LookupKind,
  type SimitQueryResult,
} from "@/lib/traffic-fines";

const execFileAsync = promisify(execFile);

export async function scrapeSimitRecords(
  tipo: LookupKind,
  valor: string,
  timeoutMs = 45000,
): Promise<SimitQueryResult> {
  const cleanValue = normalizeLookup(valor);
  const validationError = validateLookup(tipo, cleanValue);
  if (validationError) {
    throw new Error(validationError);
  }

  const scriptPath = path.join(process.cwd(), "scripts", "simit-runner.mjs");
  try {
    const { stdout } = await execFileAsync("node", [scriptPath, tipo, cleanValue], {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });

    const rawJson = JSON.parse(stdout.trim());
    return parseSimitPanelData(rawJson, tipo, cleanValue);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al conectar con SIMIT.";
    throw new Error(`SIMIT Scraper: ${msg}`);
  }
}
