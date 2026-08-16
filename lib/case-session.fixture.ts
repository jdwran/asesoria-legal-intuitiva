import { buildFallbackOrientation } from "./legal-data.ts";

export function sessionFixture() {
  const story = "Mi empleador no me paga el salario desde hace dos meses.";
  return {
    schemaVersion: 1 as const,
    draft: { story: "", city: "Bogotá" },
    case: {
      savedStory: story,
      orientation: buildFallbackOrientation(story, "Bogotá"),
      elements: [],
      completedStepIds: ["reunir-soportes"],
      triageAnswers: { contrato: "Sí, tengo contrato escrito." },
      triageSaved: true,
      analysis: {
        mode: "demo" as const,
        provider: "demo" as const,
        fallbackUsed: false,
        degraded: false,
      },
    },
  };
}
