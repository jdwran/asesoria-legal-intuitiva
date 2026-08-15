# Orientador Legal

Proyecto para el hackathon **Colombia Tech Week 2026** — track *Justicia: democratizar el acceso a asesoría legal para quienes no pueden pagar un abogado*.

## El problema

El cuello de botella real del acceso a justicia para población de bajos ingresos no es elegir entre abogados. Es no saber si su problema tiene solución legal, y no saber que existen canales gratuitos: defensoría pública, consultorios jurídicos universitarios, personerías, comisarías de familia, casas de justicia.

## La solución

Un asistente conversacional que recibe el problema de la persona en lenguaje coloquial y responde con tres cosas: qué derecho la ampara, qué hacer ahora, y a qué entidad gratuita acudir — además de generar el documento base (derecho de petición, tutela, queja) ya diligenciado con sus datos.

## Cómo funciona

1. La persona escribe su problema en lenguaje simple ("me quieren desalojar sin avisarme", "no me pagan el sueldo hace dos meses").
2. Un LLM clasifica el caso (laboral, arrendamiento, familia, otros) y hace máximo dos preguntas de triage si falta información clave.
3. Devuelve la respuesta en tres tarjetas separadas: **Tu derecho** / **Qué hacer ahora** / **A dónde ir gratis**.
4. "A dónde ir gratis" usa un directorio curado y verificado de recursos gratuitos (no un marketplace de calificación de abogados: aquí no hay problema de oferta que resolver, sino de información y direccionamiento).
5. Genera un documento descargable pre-llenado con los datos ya provistos en la conversación.

## Por qué así

Un marketplace de calificación de abogados asume un mercado de oferta visible que el usuario ya sabe que debe comparar. En este segmento ese mercado no existe desde la perspectiva del usuario: el problema no es elegir, es no saber que hay a quién acudir gratis. Este producto ataca esa barrera de información directamente, es demostrable en vivo, y no depende de reviews ni de datos históricos para funcionar desde el primer uso.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- LLM vía API (Anthropic/OpenAI) para clasificación de casos y generación de respuesta
- Despliegue en Vercel

## Estado del proyecto

En construcción durante el hackathon (36 horas, agosto de 2026). Este repo arranca con la definición del producto; el código base se genera y se sube durante el evento.

## Instalación

_Se completa cuando el código base esté generado._

## Licencia

MIT — ver [LICENSE](LICENSE).
