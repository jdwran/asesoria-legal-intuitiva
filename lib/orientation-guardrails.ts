import type { LegalOrientation } from "./legal-data.ts";

function requiresCanonicalSafetyRoute(orientation: LegalOrientation) {
  return (
    orientation.documentKind === "medida-proteccion" ||
    orientation.documentKind === "resumen-urgente" ||
    orientation.sourceIds.includes("icbf-linea-141")
  );
}

function hasDeterministicCommonRoute(orientation: LegalOrientation) {
  const canonicalSourceIds = new Set([
    "codigo-policia-tenencia",
    "ley-820-canon",
    "codigo-trabajo-terminacion",
    "codigo-transito",
    "codigo-penal-estafa",
  ]);
  return (
    orientation.sourceIds.some((sourceId) => canonicalSourceIds.has(sourceId)) ||
    (orientation.category === "salud" && orientation.sourceIds.includes("ley-1751")) ||
    (orientation.category === "familia" && orientation.documentKind === "resumen-familia")
  );
}

export function applyOrientationGuardrails(
  parsed: LegalOrientation,
  fallback: LegalOrientation,
): LegalOrientation {
  const routeConflict = parsed.category !== fallback.category;
  const useCanonicalRoute =
    requiresCanonicalSafetyRoute(fallback) ||
    hasDeterministicCommonRoute(fallback);

  if (!useCanonicalRoute) {
    if (fallback.urgency !== "alta") return parsed;
    return { ...parsed, urgency: "alta" };
  }

  return {
    ...parsed,
    ...fallback,
    plainSummary: routeConflict ? fallback.plainSummary : parsed.plainSummary,
    extractedFacts: routeConflict ? fallback.extractedFacts : parsed.extractedFacts,
  };
}
