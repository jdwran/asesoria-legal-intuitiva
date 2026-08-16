export const ORIENTATION_FORM_LIMITS = {
  storyMin: 12,
  storyMax: 6000,
  cityMin: 2,
  cityMax: 120,
} as const;

export const PROCESSING_CONSENT_COPY =
  "Autorizo procesar este relato para organizar el caso. Esta herramienta no es un abogado: el envío no crea una relación abogado–cliente ni secreto profesional.";

export const EXTERNAL_PROCESSING_COPY =
  "Al enviar, el relato puede enviarse a un proveedor externo de IA para procesarlo y organizar el caso.";

export const ORIENTATION_FORM_ERRORS = {
  story: "Cuéntanos un poco más: el relato debe tener al menos 12 caracteres.",
  city: "Escribe un municipio o ciudad para orientar los canales de consulta.",
  consent: "Necesitamos tu autorización para procesar el relato.",
} as const;

export function isOrientationFormReady({
  story,
  city,
  processingConsent,
}: {
  story: string;
  city: string;
  processingConsent: boolean;
}) {
  return (
    story.trim().length >= ORIENTATION_FORM_LIMITS.storyMin &&
    city.trim().length >= ORIENTATION_FORM_LIMITS.cityMin &&
    processingConsent
  );
}
