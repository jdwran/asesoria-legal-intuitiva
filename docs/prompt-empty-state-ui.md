# 📋 Prompt para la UI/UX Inicial — Empty State

> **Actúa como un Diseñador UX y Desarrollador Frontend experto.** Vamos a diseñar el "Empty State" (la pantalla antes de que el usuario envíe su primer relato) para "Orientador Legal". El usuario objetivo está estresado, navega desde un celular y no entiende jerga legal. Premisa: **cero fricción, confianza inmediata, cero sobre-promesas**.
>
> **CONTEXTO DEL SISTEMA (ya existe, no lo inventes)**
> - Stack: Next.js App Router + TypeScript + Tailwind + shadcn/ui. Componentes ya instalados: `Button`, `Textarea`, `Input`, `Label`, `Dialog`, `Badge`, `Progress`, `Separator`, `Sheet`. No existe un componente de chat/burbuja en el proyecto: constrúyelo con `div`s simples, no asumas un primitive que no está.
> - Paleta ya establecida en el resto de la app — reutilízala, no inventes una nueva: fondo `#f4f3ee` / `#fbfaf7`, texto y header en azul marino `#102238`, acentos y botones primarios en `#173f6b`, confianza/éxito en `emerald-400` / `emerald-600`, títulos con `font-display` (ver "Sistema visual").
> - El backend real (`POST /api/orientar`) exige tres campos: `story` (≥12 caracteres), `city` (≥2 caracteres) y `processingConsent: true`. Sin los tres, la API responde 400. Este Empty State es la puerta de entrada a ese endpoint: el formulario tiene que poder producir esos tres datos, no solo el texto libre.
>
> **ESTRUCTURA DE LA PANTALLA (2 ZONAS)**
>
> Cuenta los controles antes de dibujar: esta pantalla admite **dos botones visibles** (el selector de ejemplos y Enviar), un checkbox y un enlace de texto. Cada botón adicional es una decisión que le pasas a alguien estresado; si algo no cabe en esos dos, va dentro de un menú, no en una fila nueva.
>
> **1. Encabezado (estático arriba, compacto):**
> - Ícono: `ShieldCheck` de Lucide en `text-emerald-600` (ya se usa en el resto de la app para transmitir seguridad; reutilízalo en vez de introducir un ícono nuevo). Ícono y título en la **misma fila**: apilarlos costaba 84 px que hacían caer el botón Enviar fuera del pliegue en móvil.
> - Título: "Orientador Legal" — `font-display`.
> - Subtítulo: "Asesoría gratuita, rápida y en palabras sencillas." — `text-muted-foreground`.
> - Sin menú hamburguesa, sin links, sin login. Limpio.
>
> **2. Zona de acción (una sola tarjeta, sin apariencia de chat):**
> - Nada de mensaje simulado de bienvenida ni de burbujas, y **nada de una sección aparte de "ejemplos"** con su propio título y fila de botones: eso duplicaba encabezados y alargaba la pantalla.
> - `Textarea` amplio. Placeholder: "Escribe aquí tu problema con tus propias palabras…". Como el campo crece con el contenido (`field-sizing-content`), ponle tope (`max-h-[38dvh]`): sin él, una plantilla larga empuja el botón de enviar fuera de la pantalla.
> - **Selector de ejemplos: un único `DropdownMenu`** en la fila del `Label` del propio campo que rellena (`Tu situación` a la izquierda, botón `variant="outline" size="sm"` con ícono `FileText` + `ChevronDown` y texto "Usar un ejemplo" a la derecha). Dentro, los motivos agrupados por tema (Trabajo, Vivienda y arriendo, Salud, Familia, Denuncias, Entidades y juzgados) y, al final tras un separador, "Escribir desde cero" con ícono `Eraser`. Un botón de "limpiar" suelto en la pantalla no se justifica: es la misma decisión, dentro del mismo control.
> - Cada opción del menú **no es una frase, es una plantilla con campos entre corchetes** ("Trabajo en [nombre de la empresa] desde [fecha de ingreso]…"): un relato con fechas, soportes y actores concretos se clasifica mucho mejor que "me despidieron". Al elegir una, rellena el `Textarea`, y deja el cursor **seleccionando el primer corchete** para que se pueda escribir encima. Ojo: el menú devuelve el foco a su disparador al cerrarse, así que ese salto va en `onOpenChangeComplete`, no justo después del clic.
> - **Redacta las plantillas contra el clasificador**, no solo para que suenen bien: `buildFallbackOrientation` decide por palabras clave y en orden, así que una palabra de otra rama secuestra el caso (una plantilla de cuota alimentaria que enumere "alimentación, estudio, **salud**" termina clasificada como barrera de acceso a salud). Verifica cada plantilla contra esa función antes de darla por buena.
> - Debajo del relato, aviso vivo `text-amber-700` con el número de corchetes sin reemplazar ("Quedan 7 campos entre corchetes: reemplázalos con tus datos o borra los que no apliquen"). Ese aviso es el que explica los corchetes, **en el momento en que importa**: no repitas la explicación como texto fijo arriba.
> - Campo compacto de ciudad (`Input` pequeño, junto al botón de enviar o justo encima): placeholder con un ejemplo ("Ej.: Bogotá"), no una repetición del label. No bloquees la escritura si está vacío.
> - Checkbox de consentimiento, compacto, con este texto (es el mismo que ya usa el resto de la app; no lo reformules para no terminar con dos versiones distintas del mismo consentimiento en el producto): "Autorizo procesar este relato para organizar el caso. Esta herramienta no es un abogado: el envío no crea una relación abogado–cliente ni secreto profesional."
> - Botón de enviar: ícono `Send` de Lucide, **habilitado siempre** (solo se deshabilita mientras analiza). Las tres condiciones del backend (`story.length >= 12 && city.length >= 2 && consentimiento === true`) se validan **al pulsar**, mostrando qué falta. Un botón deshabilitado deja los mensajes de error de abajo inalcanzables: la persona pulsa, no pasa nada y nadie le dice por qué.
> - Mensajes de error si falta algo (reutiliza el copy existente, no inventes uno nuevo):
>   - Relato corto: "Cuéntanos un poco más: el relato debe tener al menos 12 caracteres."
>   - Sin ciudad: "Escribe un municipio o ciudad para orientar los canales de consulta."
>   - Sin consentimiento: "Necesitamos tu autorización para procesar el relato."
> - Disclaimer, `text-xs text-muted-foreground`, debajo de todo: "Esta orientación es una guía general y no reemplaza una consulta legal profesional." **No prometas "no guardamos tus datos"**: el relato puede enviarse a un proveedor de IA externo, y eso ya se explica en el checkbox de consentimiento. Prometer algo que el backend no garantiza no se arregla después con una nota pequeña.
>
> **ESTADO DE CARGA**
> - Al enviar, muestra una burbuja temporal con `LoaderCircle` de Lucide (`animate-spin`) — **no `Loader2`: ese nombre no existe en la versión de lucide-react que usa este proyecto.**
> - Texto: "Organizando tu relato…" — es el mismo que ya dispara el resto de la app al analizar un caso; no inventes una frase distinta para el mismo momento.
>
> **RESTRICCIONES TÉCNICAS (MOBILE-FIRST)**
> - Usa `100dvh` para que la zona de acción no quede tapada por la barra del navegador o el teclado virtual en iOS/Android. Nada está `fixed` ni `sticky`: la pantalla se sostiene porque **cabe**, no porque algo esté anclado.
> - Si esta pantalla vive dentro del mismo layout que el resto de la app (que hoy usa `min-h-screen` en el contenedor raíz), aplica `dvh` de forma consistente en todo el árbol de altura — si no, la altura queda bien aquí y mal en el resto de las pantallas.
> - **Presupuesto de altura: la pantalla vacía debe caber sin scroll en un móvil de 390×844 y en un portátil de 1280×720.** Mídelo, no lo estimes: cada encabezado decorativo, cada línea de ayuda fija y cada fila de botones se paga en píxeles, y lo primero que se cae del pliegue es el botón de enviar.

## Nota

Esta versión ya no tiene vocabulario de chatbot (mensaje de bienvenida, burbujas) ni una fila de botones de motivos: todo el arranque del relato es **un solo control** (el menú "Usar un ejemplo") sobre el campo que rellena. Eso la alinea con lo que dice tu propio README ("no se presenta como... chatbot") y mantiene la pantalla en dos botones visibles.

## Sistema visual (aplica a toda la app)

- **Tipografía: Helvetica en todo el entorno.** `--font-sans` es `"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif`. No se sirve como webfont —el CSP fija `font-src 'self'` y Helvetica no se licencia para web—, así que en macOS/iOS resuelve a Helvetica Neue real y en Windows/Android cae en Arial y Liberation Sans, que comparten métricas: no hay descarga ni salto de texto.
- Ya no hay contraste serif/sans. La jerarquía la sostiene la clase `.font-display` (misma familia, peso 600 y `letter-spacing: -0.021em`). Si vas a marcar un titular, usa `font-display`, no una familia nueva.
- Paleta sin cambios: crema `#f4f3ee`, azul marino `#102238` / `#173f6b`, esmeralda para confianza, ámbar para plazos, rosa para errores.

## Inicio de la versión app

Tres destinos, cada uno una tarjeta táctil grande con ícono, título, una línea de detalle y chevron: **Orientación legal**, **Seguimiento de casos** y **Comparendos y multas**. Los dos últimos muestran un contador ("1 guardado", "2 por vencer") que sale del mismo almacenamiento local que sus pantallas, vía `useSyncExternalStore` — no se pasan callbacks de conteo entre pantallas.

Reglas que no se negocian en esos módulos nuevos:

- **Nada se guarda a escondidas.** Casos y comparendos viven en `localStorage` y ambas pantallas lo dicen en voz alta y ofrecen borrar. Si cambias esto, corrige también el texto de `public/offline.html`.
- **La app no consulta el SIMIT.** No hay canal público para hacerlo: la persona registra lo que ya le llegó. Prometer una consulta automática sería mentir sobre lo que hace el producto.
- **Las fechas de descuento son orientativas.** El cálculo salta sábados y domingos pero no festivos, y así se declara en pantalla. Nunca presentes un plazo como definitivo: es dinero de alguien.
- **Los avisos solo llegan al abrir la app.** Sin un servidor que consulte y mande push, no hay más. Dilo en la propia pantalla de avisos en vez de dejar que se asuma.

## Historial de esta pantalla

1. **Primera versión:** 3 botones de motivos + un 4º con menú de "búsquedas populares"; los textos que insertaban eran frases de una línea.
2. **Segunda:** un único desplegable con los 10 motivos agrupados y plantillas con corchetes, bajo un bloque titulado "Ejemplos de relato".
3. **Tercera:** ese bloque desaparece y el desplegable se muda a la cabecera del campo de relato; "limpiar" pasa a ser un ítem del mismo menú y Enviar deja de estar deshabilitado.
4. **Actual:** la pantalla vacía deja de ser el inicio. El inicio es el hub de tres destinos, la orientación gana un botón de retroceso y el enlace de demostración se muda al hub. Toda la app pasa a Helvetica.
