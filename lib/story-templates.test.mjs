import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoryFromTemplate,
  featuredStoryTemplates,
  getStoryTemplate,
  getStoryTemplateProgress,
  renderStoryTemplatePreview,
  storyTemplates,
} from "./story-templates.ts";
import { buildFallbackOrientation } from "./legal-data.ts";
import { isOrientationFormReady } from "./orientation-form.ts";
import { orientationRequestSchema } from "./orientation-request.ts";

const TOKEN_PATTERN = /\{\{([a-z][A-Za-z0-9]*)\}\}/g;

function completedValues(template) {
  return Object.fromEntries(
    template.fields.map((field, index) => [field.key, `Dato completo ${index + 1}: ${field.label}`]),
  );
}

test("las plantillas cubren las rutas frecuentes del producto", () => {
  const categories = new Set(storyTemplates.map((template) => template.category));
  for (const category of ["laboral", "arrendamiento", "salud", "familia", "penal", "administrativo", "otro"]) {
    assert.ok(categories.has(category), category);
  }
});

test("cada ejemplo ofrece un checklist consolidado de cuatro a seis preguntas", () => {
  const ids = new Set();

  for (const template of storyTemplates) {
    assert.ok(!ids.has(template.id), template.id);
    ids.add(template.id);
    assert.ok(template.template.length >= 100, `${template.id}: plantilla demasiado corta`);
    assert.ok(template.fields.length >= 4, `${template.id}: menos de cuatro preguntas`);
    assert.ok(template.fields.length <= 6, `${template.id}: más de seis preguntas`);
    assert.doesNotMatch(template.template, /\[[^\]]*\]/, `${template.id}: conserva corchetes editables`);

    const fieldKeys = template.fields.map((field) => field.key);
    assert.equal(new Set(fieldKeys).size, fieldKeys.length, `${template.id}: keys repetidas`);

    const tokenKeys = [...template.template.matchAll(TOKEN_PATTERN)].map((match) => match[1]);
    assert.deepEqual(
      [...new Set(tokenKeys)].sort(),
      [...fieldKeys].sort(),
      `${template.id}: tokens y campos no coinciden`,
    );

    for (const field of template.fields) {
      assert.match(field.key, /^[a-z][A-Za-z0-9]*$/, `${template.id}: key inválida`);
      assert.ok(field.label.trim().length > 0, `${template.id}.${field.key}: falta label`);
      assert.ok(field.placeholder.trim().length > 0, `${template.id}.${field.key}: falta placeholder`);
      assert.doesNotMatch(
        field.placeholder,
        /\{\{|\}\}|\[[^\]]*\]/,
        `${template.id}.${field.key}: placeholder anidado`,
      );
    }

    assert.doesNotMatch(
      template.template,
      /\b(cédula|documento de identidad|contraseña|clave bancaria)\b/i,
    );
    assert.equal(getStoryTemplate(template.id), template);
  }
});

test("el ejemplo de pagos laborales consolida la información en seis preguntas", () => {
  const template = getStoryTemplate("laboral-pagos-pendientes");
  assert.ok(template);
  assert.deepEqual(
    template.fields.map((field) => field.key),
    ["empresa", "fechaIngreso", "cargo", "concepto", "resultadoReclamo", "soporte"],
  );
});

test("la vista previa reemplaza respuestas y conserva visibles solo los tokens pendientes", () => {
  const template = storyTemplates[0];
  const values = {
    [template.fields[0].key]: "Panadería La Esquina",
    [template.fields[1].key]: "enero de 2025",
  };

  const preview = renderStoryTemplatePreview(template, values);

  assert.match(preview, /Panadería La Esquina/);
  assert.match(preview, /enero de 2025/);
  assert.doesNotMatch(preview, new RegExp(`\\{\\{${template.fields[0].key}\\}\\}`));
  assert.doesNotMatch(preview, new RegExp(`\\{\\{${template.fields[1].key}\\}\\}`));
  for (const field of template.fields.slice(2)) {
    assert.match(preview, new RegExp(`\\{\\{${field.key}\\}\\}`));
  }
  assert.match(template.template, new RegExp(`\\{\\{${template.fields[0].key}\\}\\}`));
});

test("el progreso ignora espacios y valores que no pertenecen al checklist", () => {
  const template = storyTemplates[0];
  const values = {
    [template.fields[0].key]: "Respuesta válida",
    [template.fields[1].key]: "   ",
    campoInventado: "No cuenta",
  };

  assert.deepEqual(getStoryTemplateProgress(template, {}), {
    completed: 0,
    total: template.fields.length,
  });
  assert.deepEqual(getStoryTemplateProgress(template, values), {
    completed: 1,
    total: template.fields.length,
  });
  assert.deepEqual(getStoryTemplateProgress(template, completedValues(template)), {
    completed: template.fields.length,
    total: template.fields.length,
  });
});

test("no construye un relato final mientras falte cualquier respuesta obligatoria", () => {
  const template = storyTemplates[0];
  const values = completedValues(template);
  delete values[template.fields.at(-1).key];

  assert.equal(buildStoryFromTemplate(template, values), null);

  values[template.fields.at(-1).key] = "    ";
  assert.equal(buildStoryFromTemplate(template, values, "Un detalle opcional"), null);
});

test("el relato final reemplaza todos los tokens y el detalle opcional nunca bloquea", () => {
  for (const template of storyTemplates) {
    const values = completedValues(template);
    const withoutDetail = buildStoryFromTemplate(template, values);
    assert.equal(typeof withoutDetail, "string", template.id);
    assert.doesNotMatch(withoutDetail, /\{\{[^}]+\}\}/, template.id);

    const withBlankDetail = buildStoryFromTemplate(template, values, "   ");
    assert.equal(withBlankDetail, withoutDetail, template.id);

    const withDetail = buildStoryFromTemplate(
      template,
      values,
      "  También conservo el número del radicado.  ",
    );
    assert.equal(
      withDetail,
      `${withoutDetail}\nTambién conservo el número del radicado.`,
      template.id,
    );
    assert.doesNotMatch(withDetail, /\{\{[^}]+\}\}/, template.id);
  }
});

test("la portada mantiene solo tres plantillas destacadas", () => {
  assert.equal(featuredStoryTemplates.length, 3);
});

test("las plantillas no afirman resultados jurídicos", () => {
  for (const template of storyTemplates) {
    assert.doesNotMatch(template.template, /vas a ganar|garantiza|deben condenar|tienes derecho automáticamente/i);
  }
});

test("cada relato completo entra al contrato existente y conserva su categoría", () => {
  for (const template of storyTemplates) {
    const story = buildStoryFromTemplate(template, completedValues(template));
    assert.ok(story, template.id);
    const input = {
      story,
      city: "Cali",
      processingConsent: true,
    };
    assert.equal(isOrientationFormReady(input), true, template.id);
    assert.equal(orientationRequestSchema.safeParse(input).success, true, template.id);
    assert.equal(buildFallbackOrientation(story, input.city).category, template.category, template.id);
  }
});
