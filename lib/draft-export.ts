import type { LegalOrientation } from "./legal-data";

export type DraftExportFormat = "story" | "petition" | "pqr" | "tutela";

export const DRAFT_EXPORT_OPTIONS: ReadonlyArray<{
  value: DraftExportFormat;
  label: string;
}> = [
  { value: "story", label: "Relato" },
  { value: "petition", label: "Derecho de petición" },
  { value: "pqr", label: "PQR" },
  { value: "tutela", label: "Acción de tutela" },
];

type DraftExportOrientation = Pick<
  LegalOrientation,
  "caseTitle" | "extractedFacts" | "rightTitle" | "rightExplanation" | "nextSteps"
>;

export interface DraftExportInput {
  draftText: string;
  orientation: DraftExportOrientation;
  evidenceNames: string[];
  city?: string;
  date?: string;
}

const TUTELA_OATH =
  "Manifiesto bajo la gravedad de juramento que no he presentado otra acción de tutela por los mismos hechos y derechos ante ninguna otra autoridad.";

function firstStepText(orientation: DraftExportOrientation) {
  const firstStep = orientation.nextSteps[0];
  if (!firstStep) return "[DESCRIBA AQUÍ LA PETICIÓN O PRETENSIÓN CONCRETA]";

  return [firstStep.title.trim(), firstStep.detail.trim()].filter(Boolean).join("\n");
}

function letterExport(
  format: "petition" | "pqr",
  input: DraftExportInput,
  city: string,
  date: string,
) {
  const isPetition = format === "petition";
  const heading = isPetition ? "DERECHO DE PETICIÓN" : "PQR — PETICIÓN, QUEJA O RECLAMO";
  const reference = isPetition ? "Derecho de petición" : "PQR";

  return `${heading}

Señores
[ENTIDAD]
${city}, ${date}

Referencia: ${reference} relacionada con ${input.orientation.caseTitle}

HECHOS
${input.draftText}

PETICIÓN CONCRETA
${firstStepText(input.orientation)}

FUNDAMENTO
Ley 1755 de 2015.

FIRMA Y NOTIFICACIONES
Nombre: [NOMBRE COMPLETO]
Cédula: [CÉDULA]
Dirección de notificación: [DIRECCIÓN DE NOTIFICACIÓN]

Firma: ______________________________`;
}

function tutelaExport(input: DraftExportInput, city: string, date: string) {
  const facts = input.orientation.extractedFacts
    .map((fact) => fact.trim())
    .filter(Boolean);
  const renderedFacts = facts.length > 0
    ? facts.map((fact, index) => `${index + 1}. ${fact}`).join("\n")
    : input.draftText.trim() || "[DESCRIBA AQUÍ LOS HECHOS]";
  const evidence = input.evidenceNames
    .map((name) => name.trim())
    .filter(Boolean);
  const renderedEvidence = evidence.length > 0
    ? evidence.map((name, index) => `${index + 1}. ${name}`).join("\n")
    : "No se registraron pruebas.";

  return `ACCIÓN DE TUTELA

Señor Juez (Reparto)
${city}, ${date}

Accionante: [NOMBRE COMPLETO]
Accionado: [ENTIDAD O PERSONA ACCIONADA]
Referencia: Acción de tutela relacionada con ${input.orientation.caseTitle}

HECHOS
${renderedFacts}

DERECHOS FUNDAMENTALES INVOCADOS
${input.orientation.rightTitle}
${input.orientation.rightExplanation}

PRETENSIÓN
Solicito al despacho valorar la protección de ${input.orientation.rightTitle} y, si encuentra acreditada una vulneración o amenaza, ordenar a [ENTIDAD O PERSONA ACCIONADA] [MEDIDA CONCRETA QUE SOLICITAS].

JURAMENTO
${TUTELA_OATH}

ANEXOS
${renderedEvidence}

FIRMA Y NOTIFICACIONES
Nombre: [NOMBRE COMPLETO]
Cédula: [CÉDULA]
Dirección de notificación: [DIRECCIÓN DE NOTIFICACIÓN]

Firma: ______________________________`;
}

export function composeDraftExport(format: DraftExportFormat, input: DraftExportInput) {
  if (format === "story") return input.draftText;

  const city = input.city?.trim() || "[CIUDAD]";
  const date = input.date?.trim() || "[FECHA]";

  if (format === "tutela") return tutelaExport(input, city, date);
  return letterExport(format, input, city, date);
}

export function getDraftExportFilename(format: DraftExportFormat) {
  const filenames: Record<DraftExportFormat, string> = {
    story: "relato-caso.txt",
    petition: "derecho-de-peticion-caso.txt",
    pqr: "pqr-caso.txt",
    tutela: "accion-de-tutela-caso.txt",
  };

  return filenames[format];
}
