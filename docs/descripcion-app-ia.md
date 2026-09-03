# Orientador Legal — Descripción del producto y del rol de la IA

## Qué es

Una aplicación web que convierte el relato cotidiano de un problema en un expediente jurídico organizado, trazable y listo para actuar. El usuario objetivo es alguien sin conocimientos legales, probablemente estresado y desde un celular: alguien que no sabe si lo que le pasó tiene siquiera una solución jurídica.

La unidad de valor no es una respuesta. Es una **carpeta del caso** que la persona puede llevar a un consultorio jurídico gratuito y no tener que volver a contar todo desde cero.

## El recorrido

La persona escribe lo que le pasó en sus propias palabras —o parte de un ejemplo precargado— junto con su municipio y una autorización explícita de procesamiento. En segundos obtiene tres superficies simultáneas:

- **Piezas de tu caso** — hechos, personas, fechas, pruebas y fuentes, cada una con estado `Por confirmar` / `Confirmado`.
- **Tu expediente** — resumen en lenguaje llano, máximo dos preguntas de triage, ruta paso a paso con progreso y borrador documental.
- **Guía para este paso** — qué derecho te ampara, qué hacer ahora, a dónde ir gratis.

Cierra con la descarga de un borrador (reclamación laboral, derecho de petición, solicitud de alimentos, medida de protección, relato de denuncia, entre diez tipos) y de la carpeta completa del caso.

---

## Dónde entra la IA

En un hackathon de 2026, decir "usamos IA" no diferencia nada: lo dicen todos los proyectos. Lo que diferencia es **qué tan poca autoridad le dimos al modelo**, y eso es especialmente cierto en derecho, donde una norma inventada con seguridad no es un error cosmético — puede hacer que alguien deje vencer un término o radique ante la entidad equivocada.

La IA aquí no responde preguntas legales. **Estructura un relato caótico en datos verificables** y luego se somete a cuatro restricciones:

### 1. No puede inventar una fuente legal

La respuesta del modelo está forzada a un esquema Zod con salida estructurada. Los identificadores de fuentes oficiales son un `enum` cerrado de 22 valores; la categoría, un `enum` de 7; el tipo de documento, uno de 10. El modelo no puede devolver una cita a un artículo que no existe porque **no tiene dónde escribirla**. Es una restricción del tipo de dato, no una instrucción que pueda ignorar.

### 2. En el caso más delicado, la IA no tiene la última palabra

Cuando el caso se clasifica como *familia*, el sistema distingue entre violencia, alimentos y custodia — y esa decisión no la toma el modelo. La toma un clasificador determinista basado en reglas, y si ambos discrepan, el sistema baja a un resumen neutro en vez de generar una solicitud potencialmente incompatible. Recomendar conciliación en un caso de violencia sería un daño real; ahí preferimos un algoritmo auditable a un modelo probabilístico.

### 3. Funciona aunque la IA no esté

Un clasificador heurístico determinista cubre el recorrido completo cuando no hay clave de API o la llamada falla, marcado visiblemente como modo demostración. No es un plan de contingencia para la demo del jurado: es la postura de que un servicio de acceso a justicia no puede depender de que un proveedor externo esté disponible.

### 4. El relato es dato no confiable, no una instrucción

Tanto el relato como el municipio entran al modelo explícitamente etiquetados como datos que no deben interpretarse como órdenes. Un usuario —o alguien que lo asista— no puede reescribir el comportamiento del sistema desde el campo de texto.

### Y por encima de todo: la IA propone, la persona confirma

Ningún hecho extraído entra al expediente como verdad. Entra como `Por confirmar`. La persona valida, corrige o descarta. El expediente que sale es suyo, no del modelo.

---

## Por qué esto es el game changer, y no la velocidad

La barrera real que documentan las cifras oficiales no es la lentitud del sistema judicial. Es informativa: 8 de cada 10 colombianos tienen necesidades jurídicas insatisfechas (MinJusticia, DNP, DANE), y el 83,6% no acude al sistema ante un conflicto — solo el 40% sabe siquiera que puede ir a la Fiscalía (informe Justicia Cómo Vamos, 2024).

Contra esa barrera, un chatbot que responde rápido no cambia nada: la persona sigue sin poder demostrar nada, sin saber qué prueba importa, y con una respuesta que no puede llevar a ninguna parte. Lo que cambia el resultado es salir con **hechos organizados, pruebas asociadas y fuentes rastreables** — y ahí la IA aporta exactamente lo que un formulario no puede: leer lenguaje coloquial, desordenado y emocional, y convertirlo en estructura.

La IA es el motor. Las restricciones son el producto.

---

## Lo que todavía no hace

- No hay recuperación sobre el texto completo y versionado de las normas: el modelo recibe un catálogo curado de títulos y devuelve fuentes **sugeridas** que la persona debe abrir y verificar.
- No hay directorio territorial propio; los enlaces llevan a portales oficiales para confirmar sede, horario y elegibilidad.
- Los archivos cargados son metadatos de demostración, sin cadena de custodia.
- Las descargas son texto plano; el PDF pertenece al siguiente corte.
- El límite de solicitudes es por instancia y debe reemplazarse por control distribuido antes de abrir al público.

No predice fallos ni probabilidad de ganar, no calcula caducidad ni prescripción como definitivas, y escala a revisión humana ante violencia, niñez, riesgo vital o un plazo judicial próximo.
