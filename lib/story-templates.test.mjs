import assert from "node:assert/strict";
import test from "node:test";

import { buildFallbackOrientation } from "./legal-data.ts";
import {
  isOrientationFormReady,
  ORIENTATION_FORM_LIMITS,
} from "./orientation-form.ts";
import { orientationRequestSchema } from "./orientation-request.ts";
import {
  featuredStoryTemplates,
  getStoryTemplate,
  storyTemplates,
} from "./story-templates.ts";

const EDITABLE_PART = /\[[^\[\]\r\n]{3,180}\]/g;

test("los ejemplos cubren las rutas frecuentes del producto", () => {
  const categories = new Set(storyTemplates.map((template) => template.category));
  for (const category of ["laboral", "arrendamiento", "salud", "familia", "penal", "administrativo", "otro"]) {
    assert.ok(categories.has(category), category);
  }
});

test("cada ejemplo es texto libre con pistas editables y no un checklist", () => {
  const ids = new Set();

  for (const template of storyTemplates) {
    assert.ok(!ids.has(template.id), template.id);
    ids.add(template.id);
    assert.match(template.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(Object.hasOwn(template, "fields"), false, template.id);
    assert.equal(template.template, template.template.trim(), template.id);
    assert.ok(template.template.length >= 180, `${template.id}: relato poco detallado`);
    assert.ok(template.template.length <= 1800, `${template.id}: deja poco espacio para personalizar`);
    assert.ok(template.template.length <= ORIENTATION_FORM_LIMITS.storyMax, template.id);
    assert.doesNotMatch(template.template, /\{\{|\}\}/, `${template.id}: conserva tokens internos`);

    const editableParts = template.template.match(EDITABLE_PART) ?? [];
    assert.ok(editableParts.length >= 4, `${template.id}: faltan pistas editables`);
    assert.ok(
      editableParts.some((part) => part.includes(" / ")),
      `${template.id}: falta al menos un grupo de opciones`,
    );
    assert.doesNotMatch(
      template.template.replace(EDITABLE_PART, ""),
      /[\[\]]/,
      `${template.id}: corchetes desbalanceados`,
    );
    assert.equal(getStoryTemplate(template.id), template);
  }

  assert.equal(getStoryTemplate("no-existe"), undefined);
});

test("las opciones entre corchetes nunca se vuelven campos obligatorios", () => {
  for (const template of storyTemplates) {
    const untouched = {
      story: template.template,
      city: "Cali",
      processingConsent: true,
    };
    assert.equal(isOrientationFormReady(untouched), true, template.id);
    assert.equal(orientationRequestSchema.safeParse(untouched).success, true, template.id);

    const firstPart = template.template.match(EDITABLE_PART)?.[0];
    assert.ok(firstPart, template.id);
    const partiallyEdited = template.template.replace(firstPart, "información que sí conozco");
    assert.equal(
      orientationRequestSchema.safeParse({ ...untouched, story: partiallyEdited }).success,
      true,
      `${template.id}: una edición parcial no debe bloquear`,
    );
  }
});

test("los ejemplos no contienen datos personales concretos ni promesas jurídicas", () => {
  const sensitive = /\b(?:c[eé]dula|nuip|pasaporte|contrase(?:ña|na)|clave bancaria|cuenta bancaria|tel[eé]fono personal|correo personal)\b/iu;
  const concrete = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\+?57\s*)?3\d{9}\b|\b\d{6,}\b)/iu;

  for (const template of storyTemplates) {
    assert.doesNotMatch(template.template, sensitive, template.id);
    assert.doesNotMatch(template.template, concrete, template.id);
    assert.doesNotMatch(template.template, /\bEj\.:/i, template.id);
    assert.doesNotMatch(
      template.template,
      /vas a ganar|garantiza|deben condenar|tienes derecho automáticamente/i,
      template.id,
    );
  }
});

test("la portada mantiene solo tres ejemplos destacados", () => {
  assert.equal(featuredStoryTemplates.length, 3);
});

test("cada ejemplo conserva su materia al usarse directamente", () => {
  for (const template of storyTemplates) {
    const orientation = buildFallbackOrientation(template.template, "Cali");
    assert.equal(orientation.category, template.category, template.id);
  }
});

const routingExpectations = {
  "salud-servicio-negado": ["salud", "media", "solicitud-salud"],
  "familia-custodia-visitas": ["familia", "media", "resumen-familia"],
  "familia-violencia-proteccion": ["familia", "alta", "medida-proteccion"],
  "penal-hurto-estafa-amenaza": ["penal", "media", "relato-denuncia"],
  "administrativo-multa-resolucion": ["administrativo", "media", "solicitud-administrativa"],
  "judicial-notificacion": ["otro", "alta", "resumen-urgente"],
};

for (const [id, [category, urgency, documentKind]] of Object.entries(routingExpectations)) {
  test(`${id} no hereda urgencia de una opción pendiente`, () => {
    const template = getStoryTemplate(id);
    assert.ok(template);
    const orientation = buildFallbackOrientation(template.template, "Cali");
    assert.equal(orientation.category, category);
    assert.equal(orientation.urgency, urgency);
    assert.equal(orientation.documentKind, documentKind);
  });
}
