import assert from "node:assert/strict";
import test from "node:test";

import {
  addBusinessDays,
  bestAvailableDiscount,
  buildAgreementStatus,
  buildFineDeadlines,
  daysBetween,
  generateAlertEmailContent,
  normalizeLookup,
  parseLocalDate,
  validateLookup,
} from "./traffic-fines.ts";

test("parseLocalDate no corre la fecha por zona horaria", () => {
  const date = parseLocalDate("2026-08-17");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 7);
  assert.equal(date.getDate(), 17);
});

test("parseLocalDate rechaza fechas imposibles y basura", () => {
  assert.equal(parseLocalDate("2026-02-30"), null);
  assert.equal(parseLocalDate("17/08/2026"), null);
  assert.equal(parseLocalDate(""), null);
});

test("addBusinessDays salta el fin de semana", () => {
  // viernes 14 de agosto de 2026 + 1 hábil = lunes 17
  const viernes = parseLocalDate("2026-08-14");
  assert.equal(addBusinessDays(viernes, 1).getDate(), 17);
  // viernes + 5 hábiles = viernes siguiente, 21
  assert.equal(addBusinessDays(viernes, 5).getDate(), 21);
});

test("addBusinessDays acumula varias semanas", () => {
  const lunes = parseLocalDate("2026-08-03");
  const veinte = addBusinessDays(lunes, 20);
  // 20 hábiles = 4 semanas exactas
  assert.equal(veinte.getMonth(), 7);
  assert.equal(veinte.getDate(), 31);
  assert.equal(veinte.getDay(), 1);
});

test("daysBetween ignora la hora del día", () => {
  const a = new Date(2026, 7, 17, 23, 59);
  const b = new Date(2026, 7, 18, 0, 1);
  assert.equal(daysBetween(a, b), 1);
});

test("buildFineDeadlines aplica los dos descuentos sobre el valor", () => {
  const impuesto = parseLocalDate("2026-08-17");
  const hoy = parseLocalDate("2026-08-18");
  const [cincuenta, veinticinco] = buildFineDeadlines(impuesto, hoy, 600000);
  assert.equal(cincuenta.percentage, 50);
  assert.equal(cincuenta.amount, 300000);
  assert.equal(veinticinco.percentage, 25);
  assert.equal(veinticinco.amount, 450000);
});

test("buildFineDeadlines marca vencido, último día y vigente", () => {
  const impuesto = parseLocalDate("2026-08-03");
  // 5 hábiles -> lunes 10 de agosto; 20 hábiles -> lunes 31
  const [cincuenta, veinticinco] = buildFineDeadlines(impuesto, parseLocalDate("2026-08-10"));
  assert.equal(cincuenta.status, "ultimo-dia");
  assert.equal(veinticinco.status, "vigente");

  const [vencido] = buildFineDeadlines(impuesto, parseLocalDate("2026-08-11"));
  assert.equal(vencido.status, "vencido");
});

test("buildFineDeadlines deja el valor en null si no se conoce el total", () => {
  const deadlines = buildFineDeadlines(parseLocalDate("2026-08-17"), parseLocalDate("2026-08-17"));
  assert.equal(deadlines[0].amount, null);
});

test("bestAvailableDiscount prefiere el descuento mayor que siga vigente", () => {
  const impuesto = parseLocalDate("2026-08-03");
  const conAmbos = buildFineDeadlines(impuesto, parseLocalDate("2026-08-04"));
  assert.equal(bestAvailableDiscount(conAmbos).percentage, 50);

  const soloVeinticinco = buildFineDeadlines(impuesto, parseLocalDate("2026-08-12"));
  assert.equal(bestAvailableDiscount(soloVeinticinco).percentage, 25);

  const ninguno = buildFineDeadlines(impuesto, parseLocalDate("2026-09-15"));
  assert.equal(bestAvailableDiscount(ninguno), null);
});

test("normalizeLookup limpia espacios, guiones y mayúsculas", () => {
  assert.equal(normalizeLookup(" abc-123 "), "ABC123");
  assert.equal(normalizeLookup("1.098.765.432"), "1098765432");
});

test("validateLookup acepta placas de carro y de moto", () => {
  assert.equal(validateLookup("placa", "ABC123"), null);
  assert.equal(validateLookup("placa", "abc12d"), null);
});

test("validateLookup rechaza placas mal formadas", () => {
  assert.match(validateLookup("placa", "AB123"), /Revisa la placa/);
  assert.match(validateLookup("placa", "ABCDEF"), /Revisa la placa/);
  assert.match(validateLookup("placa", ""), /Escribe la placa/);
});

test("validateLookup valida documentos numéricos", () => {
  assert.equal(validateLookup("documento", "1098765432"), null);
  assert.match(validateLookup("documento", "123"), /entre 5 y 12/);
  assert.match(validateLookup("documento", "10A98765"), /solo números/);
  assert.match(validateLookup("documento", ""), /Escribe el número/);
});

test("buildAgreementStatus calcula días restantes y estado de cuotas", () => {
  const due = parseLocalDate("2026-09-15");
  const today1 = parseLocalDate("2026-09-10");
  const status1 = buildAgreementStatus(due, today1, 250000);
  assert.equal(status1.daysLeft, 5);
  assert.equal(status1.status, "vigente");
  assert.equal(status1.amount, 250000);

  const today2 = parseLocalDate("2026-09-15");
  const status2 = buildAgreementStatus(due, today2, 250000);
  assert.equal(status2.daysLeft, 0);
  assert.equal(status2.status, "ultimo-dia");

  const today3 = parseLocalDate("2026-09-20");
  const status3 = buildAgreementStatus(due, today3, 250000);
  assert.equal(status3.daysLeft, -5);
  assert.equal(status3.status, "vencido");
});

test("generateAlertEmailContent genera asunto y cuerpo con enlaces SIMIT", () => {
  const result = generateAlertEmailContent({
    userName: "Carlos Pérez",
    reference: "1100100000009999",
    kind: "comparendo",
    subject: "ABC123",
    daysLeft: 2,
    deadlineText: "28 de agosto de 2026",
    amount: 300000,
    discountPercentage: 50,
  });

  assert.match(result.subject, /Alerta: Vencimiento de descuento/);
  assert.match(result.text, /Carlos Pérez/);
  assert.match(result.text, /ABC123/);
  assert.match(result.text, /50% de descuento/);
  assert.match(result.text, /simit/i);
  assert.match(result.html, /simit/i);
});

test("validateLookup y normalizeLookup manejan placas colombianas de carro y moto", () => {
  assert.equal(normalizeLookup("kto-310"), "KTO310");
  assert.equal(validateLookup("placa", "kto-310"), null);

  assert.equal(normalizeLookup("wms 45 e"), "WMS45E");
  assert.equal(validateLookup("placa", "wms 45 e"), null);

  assert.match(validateLookup("placa", "123456"), /Revisa la placa/);
});


