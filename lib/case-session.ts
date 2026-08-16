import { z } from "zod";

import { DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION } from "./detailed-guidance.ts";
import type { CaseElement, LegalOrientation } from "./legal-data.ts";
import { ORIENTATION_FORM_LIMITS } from "./orientation-form.ts";

export const CASE_SESSION_SCHEMA_VERSION = 1 as const;
export const MAX_CASE_SESSION_BYTES = 256 * 1024;

export type CaseSessionSnapshot = {
  schemaVersion: 1;
  draft: {
    story: string;
    city: string;
  };
  case: null | {
    savedStory: string;
    orientation: LegalOrientation;
    elements: CaseElement[];
    completedStepIds: string[];
    triageAnswers: Record<string, string>;
    triageSaved: boolean;
    detailedGuidanceAcknowledgement?: {
      acceptedAt: string;
      version: typeof DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION;
    };
    analysis: {
      mode: "ready" | "demo" | "ai";
      provider: "demo" | "open" | "openai" | null;
      fallbackUsed: boolean;
      degraded: boolean;
    };
  };
};

const caseElementSchema: z.ZodType<CaseElement> = z
  .object({
    id: z.string().min(1).max(160),
    type: z.enum(["hechos", "personas", "pruebas", "fechas", "normas", "documentos"]),
    title: z.string().min(1).max(500),
    detail: z.string().max(12_000),
    date: z.string().max(120).optional(),
    status: z.enum(["listo", "pendiente"]).optional(),
    sourceId: z.string().max(160).optional(),
    sourceUrl: z.string().url().max(2_048).optional(),
    attachment: z
      .object({
        id: z.string().uuid(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(160),
        sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
        uploadedAt: z.iso.datetime(),
      })
      .strict()
      .optional(),
  })
  .strict();

const legalOrientationSchema: z.ZodType<LegalOrientation> = z
  .object({
    caseTitle: z.string().min(1).max(500),
    category: z.enum([
      "arrendamiento",
      "laboral",
      "salud",
      "familia",
      "penal",
      "administrativo",
      "otro",
    ]),
    urgency: z.enum(["baja", "media", "alta"]),
    plainSummary: z.string().max(12_000),
    rightTitle: z.string().max(1_000),
    rightExplanation: z.string().max(12_000),
    sourceIds: z.array(z.string().min(1).max(160)).max(100),
    nextSteps: z
      .array(
        z
          .object({
            title: z.string().max(1_000),
            detail: z.string().max(12_000),
          })
          .strict(),
      )
      .max(20),
    freeHelp: z
      .array(
        z
          .object({
            name: z.string().max(1_000),
            detail: z.string().max(12_000),
            channel: z.string().max(4_000),
            sourceId: z.string().min(1).max(160),
          })
          .strict(),
      )
      .max(20),
    documentKind: z.enum([
      "arrendamiento-comunicacion",
      "reclamacion-laboral",
      "solicitud-salud",
      "medida-proteccion",
      "resumen-familia",
      "relato-denuncia",
      "solicitud-administrativa",
      "resumen-urgente",
      "resumen-general",
    ]),
    recommendedDocument: z.string().max(1_000),
    documentReason: z.string().max(12_000),
    triageQuestions: z.array(z.string().max(4_000)).max(2),
    extractedFacts: z.array(z.string().max(12_000)).max(100),
  })
  .strict();

const triageAnswersSchema = z.record(z.string().min(1).max(160), z.string().max(6_000)).superRefine(
  (answers, context) => {
    if (Object.keys(answers).length > 20) {
      context.addIssue({
        code: "custom",
        message: "Hay demasiadas respuestas de triage.",
      });
    }
  },
);

export const caseSessionSnapshotSchema: z.ZodType<CaseSessionSnapshot> = z
  .object({
    schemaVersion: z.literal(CASE_SESSION_SCHEMA_VERSION),
    draft: z
      .object({
        story: z.string().max(ORIENTATION_FORM_LIMITS.storyMax),
        city: z.string().max(ORIENTATION_FORM_LIMITS.cityMax),
      })
      .strict(),
    case: z
      .object({
        savedStory: z.string().max(ORIENTATION_FORM_LIMITS.storyMax + 12_000),
        orientation: legalOrientationSchema,
        elements: z.array(caseElementSchema).max(500),
        completedStepIds: z.array(z.string().min(1).max(160)).max(100),
        triageAnswers: triageAnswersSchema,
        triageSaved: z.boolean(),
        detailedGuidanceAcknowledgement: z
          .object({
            acceptedAt: z.iso.datetime(),
            version: z.literal(DETAILED_GUIDANCE_ACKNOWLEDGEMENT_VERSION),
          })
          .strict()
          .optional(),
        analysis: z
          .object({
            mode: z.enum(["ready", "demo", "ai"]),
            provider: z.enum(["demo", "open", "openai"]).nullable(),
            fallbackUsed: z.boolean(),
            degraded: z.boolean(),
          })
          .strict(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export function serializedSnapshotSize(snapshot: CaseSessionSnapshot): number {
  return new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
}

export function parseCaseSessionSnapshot(value: unknown): CaseSessionSnapshot {
  const snapshot = caseSessionSnapshotSchema.parse(value);
  if (serializedSnapshotSize(snapshot) > MAX_CASE_SESSION_BYTES) {
    throw new RangeError("El estado de la sesión supera el tamaño permitido.");
  }
  return snapshot;
}
