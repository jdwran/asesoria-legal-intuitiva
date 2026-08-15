# Orientador Legal

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
- Integración opcional con OpenAI mediante salida estructurada.
- Modo demo determinista cuando no existe una clave o la API no está disponible.
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
- OpenAI Responses API con Structured Outputs y Zod
- Despliegue objetivo: Vercel

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

La clave es opcional. Sin ella, el producto conserva el recorrido completo con respuestas deterministas de demostración.

```env
OPENAI_API_KEY=tu_clave
OPENAI_MODEL=gpt-5.4-mini
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Nunca expongas `OPENAI_API_KEY` al navegador. La llamada se ejecuta en `app/api/orientar/route.ts`.
La integración envía `store: false`, limita la salida y exige consentimiento en la interfaz. Esto no sustituye revisar las políticas de tratamiento y retención del proveedor antes de usar datos reales.

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
