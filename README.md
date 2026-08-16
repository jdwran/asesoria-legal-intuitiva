# Orientador Legal

<<<<<<< HEAD
**De tu historia a un expediente listo para actuar.**

MVP para Colombia Tech Week 2026 · Track 02 — Tecnología para la Justicia.

Orientador Legal ayuda a una persona a entender si su problema puede tener una ruta jurídica, organizar la información del caso, ubicar ayuda gratuita y preparar un documento base. No se presenta como abogado ni como chatbot: su unidad de valor es una **carpeta del caso trazable y reutilizable**.

## El problema

Para muchas personas, el primer obstáculo no es elegir entre abogados. Es no saber:

- si su situación tiene una posible solución jurídica;
- qué hechos y pruebas importan;
- cuál es el siguiente paso razonable;
- qué entidad gratuita puede orientarlas;
- cómo preparar un documento sin empezar desde cero.

Esa desinformación también genera trámites incompletos, radicaciones repetidas y remisiones a la entidad equivocada.

## La propuesta

La experiencia se organiza en tres superficies:

1. **Piezas de tu caso** — panel izquierdo para agregar y confirmar hechos, personas, fechas, pruebas, fuentes y documentos.
2. **Tu expediente** — área central con resumen confirmado, preguntas de triage, ruta paso a paso y borrador documental.
3. **Guía para este paso** — panel derecho con tres respuestas concretas: tu derecho, qué hacer ahora y a dónde ir gratis.

La IA propone; la persona confirma. Cada recomendación debe poder rastrearse hasta hechos confirmados y fuentes oficiales.

## Lo que ya funciona en este prototipo

- Caso demostrable de arrendamiento cargado al iniciar.
- Creación de casos desde un relato en lenguaje cotidiano.
- Clasificación inicial de arrendamiento, laboral, salud, familia, penal, administrativo y otros.
- Máximo dos preguntas de triage en formato de formulario, no de chat.
- Panel de expediente con seis tipos de piezas y estados `Por confirmar` / `Confirmado`.
- Ruta accionable con progreso y siguiente paso visible.
- Fuentes oficiales sugeridas con enlace original; esta versión no afirma haber consultado automáticamente su contenido.
- Enlaces a directorios y canales oficiales de recursos gratuitos, sin inventar sedes ni disponibilidad local.
- Generación y descarga de un borrador y de una carpeta textual del caso.
- Cadena opcional de IA: modelo abierto en un endpoint compatible, OpenAI como respaldo y salida estructurada validada.
- Modo demo determinista cuando no existe una clave o ningún proveedor está disponible.
- Diseño adaptable a escritorio, tableta y móvil.

## Límites honestos de esta versión

- Todavía no existe un RAG sobre el texto completo y versionado de las normas. La IA solo recibe un catálogo curado de títulos e IDs y devuelve fuentes sugeridas que la persona debe abrir y verificar.
- No hay un directorio territorial propio. Los botones llevan a portales oficiales para confirmar sede, horario, elegibilidad y disponibilidad.
- Los “archivos” agregados son metadatos de demostración; esta versión no almacena originales ni promete cadena de custodia.
- La carpeta y el borrador se descargan como texto. El PDF completo hace parte del siguiente corte del MVP.
- El límite de solicitudes es básico y por instancia. Antes de abrir el servicio al público debe reemplazarse por control distribuido, monitoreo de cuota y protección contra abuso.
- Sin clave se usa una clasificación heurística claramente marcada como demostración; no debe usarse para actuar ni dejar vencer un plazo.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- shadcn/ui + Lucide
- Chat Completions compatible para el modelo abierto, OpenAI Responses API como respaldo, Structured Outputs y Zod
- Despliegue objetivo: OpenAI Sites / Cloudflare Workers

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

Las claves son opcionales. Sin ellas, el producto conserva el recorrido completo con respuestas deterministas de demostración. Si ambos proveedores están configurados, siempre intenta primero el modelo abierto y solo consume OpenAI cuando el primario falla o supera su tiempo límite.

```env
# Ejemplo gratuito alojado: crea una clave en Cerebras Inference Cloud.
PRIMARY_AI_BASE_URL=https://api.cerebras.ai/v1
PRIMARY_AI_API_KEY=tu_clave_cerebras
PRIMARY_AI_MODEL=gpt-oss-120b
PRIMARY_AI_TIMEOUT_MS=12000

# Respaldo de menor costo.
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-5.4-nano
OPENAI_TIMEOUT_MS=25000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Para usar Ollama en desarrollo, cambia las tres variables `PRIMARY_AI_*` a `http://127.0.0.1:11434/v1`, una clave ficticia como `ollama` y el modelo instalado. `localhost` no es accesible desde Sites: allí el primario debe ser un endpoint HTTPS alojado.

Nunca expongas `PRIMARY_AI_API_KEY` ni `OPENAI_API_KEY` al navegador y no definas `OPENAI_BASE_URL`: cada cliente tiene una URL separada para que el respaldo no se desvíe al proveedor primario. Las llamadas se ejecutan en `app/api/orientar/route.ts`. OpenAI recibe `store: false`; ambos proveedores tienen límites de salida, tiempo y cero reintentos automáticos. Esto no sustituye revisar las políticas de tratamiento y retención de cada proveedor antes de usar datos reales.

## Recorrido de demo (4 minutos)

1. **Promesa:** “Esto no responde y desaparece: convierte una historia difícil en un expediente utilizable.”
2. **Nuevo caso:** usa el ejemplo “Trabajo en un restaurante y no me pagan hace dos meses. Tengo contrato y conversaciones con mi jefe.”
3. **Triage:** responde las dos preguntas que aparecen dentro del expediente.
4. **Organización:** agrega una prueba y confirma el hecho detectado.
5. **Trazabilidad:** abre Fuentes oficiales, aclara que son sugeridas para verificar y muestra el enlace original. La extracción de artículos y citas exactas pertenece al siguiente corte RAG.
6. **Acción:** abre la Ruta recomendada y marca el primer paso.
7. **Resultado:** descarga el borrador y la carpeta para revisión de un consultorio jurídico o abogado.

## Fuentes iniciales

El prototipo registra fuentes de:

- Constitución Política y normativa vigente en [SUIN-Juriscol](https://www.suin-juriscol.gov.co/);
- Código de Procedimiento Administrativo y de lo Contencioso Administrativo;
- Código General del Proceso y Decreto 2591 de 1991;
- Ley 820 de 2003, Ley 1755 de 2015, Ley 2220 de 2022 y Ley Estatutaria de Salud;
- [dataset oficial de sentencias de la Corte Constitucional](https://www.datos.gov.co/Justicia-y-Derecho/Sentencias-proferidas-por-la-Corte-Constitucional/v2k4-2t8s);
- [Consulta de Jurisprudencia](https://jurisprudencia.ramajudicial.gov.co/WebRelatoria/cnsj/index.xhtml) y [Consulta de Procesos](https://consultaprocesos.ramajudicial.gov.co/Procesos/Index) de la Rama Judicial;
- LegalApp, Casas de Justicia, consultorios jurídicos, Defensoría, Fiscalía y rutas vigentes de GOV.CO/ICBF para alimentos, custodia, visitas y Línea 141.

SUIN declara que su contenido es informativo y se actualiza periódicamente. Por eso la versión productiva debe conservar URL canónica, versión, checksum, vigencia y fecha de consulta; una respuesta nunca debe presentar una fuente como inmutable.

## Arquitectura objetivo

```text
Relato de la persona
        ↓
Triage seguro y estructurado
        ↓
Expediente: hechos · partes · fechas · pruebas
        ↓
Recuperación con filtros de materia, territorio, fecha y vigencia
        ↓
Norma + jurisprudencia + ruta oficial + servicio territorial
        ↓
Orientación con citas · siguiente paso · entidad · borrador
        ↓
Confirmación humana y carpeta para revisión
```

La base de conocimiento debe separar:

- **fuentes vinculantes:** Constitución, leyes, códigos, decretos y versiones;
- **jurisprudencia:** tribunal, problema jurídico, regla, resolutivo y enlace oficial;
- **rutas oficiales:** supuesto, requisitos, pasos, autoridad, excepciones y costo;
- **servicios territoriales:** municipio, canal, horario, gratuidad, elegibilidad y fecha de verificación.

La evidencia privada de una persona nunca debe mezclarse con el índice jurídico global.

## Seguridad jurídica y de datos

- Orientación general y borradores; no representación ni garantía de resultado.
- Sin predicción de fallos, culpabilidad o “fortaleza” del caso.
- Sin cálculo definitivo de caducidad, prescripción o recursos.
- Escalamiento humano para violencia, niñez, riesgo vital, privación de libertad, notificación judicial o plazo próximo.
- Conciliación nunca sugerida por defecto cuando haya violencia o coerción.
- Confirmación expresa antes de generar o enviar cualquier documento.
- Consentimiento explícito antes de enviar el relato al proveedor de IA y explicación de que no equivale a secreto profesional abogado–cliente.
- Minimización, cifrado, control de acceso, retención corta y eliminación para datos sensibles.
- Originales de evidencia inmutables; OCR, resúmenes y borradores como derivados separados.
- Documentos cargados tratados como contenido no confiable, con análisis de archivos y defensa frente a prompt injection.

## Alcance de 36 horas

Prioridad para el hackathon:

1. Un golden path completo para salarios no pagados.
2. Directorio verificado de una ciudad de demostración y canales nacionales.
3. Asociación visible entre hecho y prueba.
4. Un documento completo: reclamación laboral escrita.
5. Exportación a PDF de resumen, cronología, índice de pruebas y borrador.
6. Persistencia local cifrada o sesión temporal con aviso claro.
7. Pruebas de calidad para respuestas, citas, abstención y rutas urgentes.

Fuera del MVP: ingerir toda la jurisprudencia nacional, radicar automáticamente, calcular términos como definitivos, predecir resultados o integrar en vivo todos los sistemas judiciales.

## Evolución

1. **Biblioteca jurídica versionada:** Constitución, códigos, normas, jurisprudencia y trámites.
2. **Navegador procesal:** radicado, despacho, etapa, última actuación y próxima tarea, siempre enlazando la consulta oficial.
3. **Vista para abogados:** matriz hecho–prueba–norma, preguntas abiertas, originales y registro de qué aportó la persona frente a qué sugirió la IA.
4. **Transferencia de caso:** carpeta cifrada para que la persona no tenga que volver a contar todo.

## Pitch

> Orientador Legal no pretende reemplazar al abogado. Convierte una historia difícil de contar en una carpeta clara, verificable y lista para actuar o pedir ayuda gratuita.
=======
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
- Modelo abierto vía API compatible, OpenAI como respaldo y modo determinista final
- Despliegue en OpenAI Sites / Cloudflare Workers

## Estado del proyecto

En construcción durante el hackathon (36 horas, agosto de 2026). Este repo arranca con la definición del producto; el código base se genera y se sube durante el evento.

## Instalación

_Se completa cuando el código base esté generado._

## Licencia

MIT — ver [LICENSE](LICENSE).
>>>>>>> d2631d5b9c7c98b8c15174469897778a9303c142
