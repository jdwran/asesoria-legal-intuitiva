import assert from "node:assert/strict";
import test from "node:test";

import {
  featuredStoryTemplates,
  getStoryTemplate,
  storyTemplates,
} from "./story-templates.ts";
import { buildFallbackOrientation } from "./legal-data.ts";
import { isOrientationFormReady } from "./orientation-form.ts";
import { orientationRequestSchema } from "./orientation-request.ts";

test("las plantillas cubren las rutas frecuentes del producto", () => {
  const categories = new Set(storyTemplates.map((template) => template.category));
  for (const category of ["laboral", "arrendamiento", "salud", "familia", "penal", "administrativo", "otro"]) {
    assert.ok(categories.has(category), category);
  }
});

test("las plantillas son detalladas, únicas y editables", () => {
  const ids = new Set();
  for (const template of storyTemplates) {
    assert.ok(!ids.has(template.id), template.id);
    ids.add(template.id);
    assert.ok(template.story.length >= 350, `${template.id}: relato demasiado corto`);
    assert.ok(template.story.length <= 900, `${template.id}: relato demasiado largo`);
    assert.ok((template.story.match(/\[[^\]]+\]/g) ?? []).length >= 4, `${template.id}: faltan campos editables`);
    assert.equal((template.story.match(/\[/g) ?? []).length, (template.story.match(/\]/g) ?? []).length);
    assert.doesNotMatch(template.story, /\b(cédula|documento de identidad|contraseña|clave bancaria)\b/i);
    assert.equal(getStoryTemplate(template.id), template);
  }
});

test("la portada mantiene solo tres plantillas destacadas", () => {
  assert.equal(featuredStoryTemplates.length, 3);
});

test("las plantillas no afirman resultados jurídicos", () => {
  for (const template of storyTemplates) {
    assert.doesNotMatch(template.story, /vas a ganar|garantiza|deben condenar|tienes derecho automáticamente/i);
  }
});

test("cada plantilla entra al formulario y conserva su categoría", () => {
  for (const template of storyTemplates) {
    const input = {
      story: template.story,
      city: "Cali",
      processingConsent: true,
    };
    assert.equal(isOrientationFormReady(input), true, template.id);
    assert.equal(orientationRequestSchema.safeParse(input).success, true, template.id);
    assert.equal(buildFallbackOrientation(template.story, input.city).category, template.category, template.id);
  }
});
