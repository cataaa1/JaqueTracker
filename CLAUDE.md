# CLAUDE.md — Jaque Tracker

Este archivo son instrucciones permanentes para cualquier asistente de IA que trabaje en
este repositorio. Leelas completas antes de escribir código. El PRD (`PRD.md`) define
**qué** se construye; este archivo define **cómo**.

---

## 1. Contexto sobre el usuario

El propietario de este proyecto **no tiene experiencia previa programando**. Eso cambia
la forma de trabajar:

- **Explicá antes de codear.** Antes de cada tarea, decí en 2–3 oraciones qué vas a hacer
  y por qué. Después escribí el código.
- **Explicá los comandos.** Nunca digas "corré `npm run dev`" sin aclarar qué hace y qué
  debería ver el usuario en pantalla.
- **Nombrá los archivos con su ruta completa** cuando le pidas que abra o revise algo.
- **Un concepto nuevo por vez.** No introduzcas hooks personalizados, context, reducers y
  Dexie en la misma tarea.
- **Cuando algo falle, enseñá a diagnosticar,** no solo arregles. Mostrá cómo leer el
  mensaje de error y dónde mirar.
- **No uses jerga sin definirla la primera vez.** "Migración", "blob", "service worker",
  "estado derivado": todas se explican en una línea al aparecer.

El usuario habla español. **Toda la comunicación es en español.** El código, en inglés
(ver sección 5).

## 2. Stack (fijo — no proponer alternativas)

- React 18 + TypeScript, bundler Vite
- Tailwind CSS para estilos
- Dexie.js sobre IndexedDB para persistencia
- jsPDF + jspdf-autotable para el reporte
- vite-plugin-pwa para instalación y offline
- date-fns para fechas (locale `es`)
- Deploy en Cloudflare Pages (no Workers — ver PRD, sección 4)

Estas decisiones están tomadas y justificadas en el PRD. **No sugieras cambiar de stack,
migrar a Next.js, agregar Redux, ni reemplazar Dexie.** Si detectás un problema técnico
real que exija reconsiderar algo, planteá el problema concreto y esperá decisión; no
refactorices por tu cuenta.

## 3. Estructura de carpetas

```
src/
  db/            Todo lo relacionado con Dexie: esquema, migraciones, queries
    schema.ts    Definición de tablas y versiones
    queries.ts   Funciones de lectura/escritura (la única puerta a los datos)
  types/         Tipos e interfaces TypeScript compartidos
  components/    Componentes de UI reutilizables y sin lógica de negocio
  screens/       Una pantalla completa por archivo (Home, NewEpisode, History, Report, Settings)
  lib/           Utilidades puras: cálculos de estadísticas, formateo, generación de PDF
    stats.ts     Cálculo de métricas del reporte
    pdf.ts       Generación del PDF
    backup.ts    Export/import JSON
  hooks/         Hooks personalizados
  App.tsx
  main.tsx
```

**Regla de dependencias:** `screens/` puede importar de todo. `components/` no importa de
`screens/` ni de `db/`. `lib/` no importa de `components/` ni de `screens/` — son funciones
puras, testeables sin React.

## 4. Reglas inviolables

Estas reglas no se rompen ni siquiera si el usuario lo pide en el momento. Si lo pide,
recordale por qué existen y pedí confirmación explícita.

1. **Ninguna llamada de red en runtime.** Sin `fetch`, sin APIs externas, sin CDN de
   fuentes, sin analytics, sin Sentry, sin telemetría de ningún tipo. Son datos de salud.
2. **Ningún backend.** Si una función parece necesitar servidor, la función está mal diseñada
   para este proyecto: planteá el problema en vez de agregar un servidor.
3. **Todo acceso a datos pasa por `src/db/queries.ts`.** Ningún componente llama a Dexie
   directamente.
4. **Nunca borrar ni sobrescribir datos del usuario sin confirmación explícita en la UI.**
   Vale para borrar episodios, importar backups y limpiar la base.
5. **Nunca romper una migración de Dexie.** Cada cambio de esquema es una versión nueva con
   su función `upgrade`. Jamás editar una versión ya publicada. Jamás sugerir "borrá la base
   y arrancamos de nuevo" si hay datos reales.
6. **No agregar dependencias sin preguntar.** Cada `npm install` nuevo se justifica y se
   aprueba antes.
7. **No implementar nada de la sección 9 del PRD** (fuera de alcance), ni "por si acaso",
   ni "ya que estamos", ni dejando el andamiaje preparado.
8. **La app no diagnostica.** No agregues textos que sugieran un diagnóstico, un tratamiento,
   una dosis o una interpretación clínica. La única advertencia permitida es la de RF-22,
   con el texto exacto del PRD.
9. **`localStorage` solo para preferencias de UI** (tema, último rango de reporte usado).
   Ningún dato clínico ahí: va todo a IndexedDB.

## 5. Convenciones de código

- **Código en inglés, interfaz en español.** Variables, funciones, tipos y comentarios en
  inglés (`episode`, `intensity`, `preventiveLog`). Todo lo que ve el usuario, en español
  rioplatense natural.
- **TypeScript estricto.** `strict: true`. Prohibido `any`; usá `unknown` y validá.
- **Sin abstracciones prematuras.** No crees un componente genérico hasta tener el tercer
  caso de uso. La duplicación es preferible a la abstracción equivocada.
- **Componentes de función con hooks.** Sin clases.
- **Fechas:** siempre ISO 8601 en la base. Formateo solo en la capa de presentación, con
  date-fns y locale `es`. Cuidado con la zona horaria: un "día con cefalea" es un día en
  hora local del usuario, no en UTC.
- **Un archivo, una responsabilidad.** Si un archivo pasa de ~200 líneas, revisá si no
  está haciendo dos cosas.
- **Errores visibles.** Si una operación de base de datos falla, el usuario tiene que
  enterarse en la pantalla. Nunca un `catch` silencioso.

## 6. Reglas de UX

Se escriben para alguien que va a usar la app **mientras le duele la cabeza**:

- Targets táctiles de 44×44 px como mínimo.
- Tipografía de 16 px o más. Nunca texto gris claro sobre blanco.
- Modo oscuro real y accesible con un toque: la fotofobia es un síntoma habitual.
- Sin animaciones parpadeantes, sin flashes, sin transiciones de alto contraste.
- La acción principal ("Registrar episodio") está siempre visible en Home, sin scroll.
- Campos opcionales que se ven opcionales. El único requisito para guardar es fecha e
  intensidad (RF-10).
- Mobile-first: se diseña para 390 px de ancho y después se adapta. Si algo se ve bien en
  el navegador de escritorio pero mal en un iPhone, está mal.
- Sin librerías de componentes con estética genérica de dashboard. Es una herramienta
  clínica personal, calma y legible.

## 7. Consideraciones específicas de iOS / Safari

- Probar en Safari de iOS, no solo en Chrome de escritorio. Varias cosas se comportan
  distinto.
- El `100vh` de Safari incluye la barra de direcciones. Usar `100dvh` o `-webkit-fill-available`.
- Las descargas de blobs no funcionan igual: para el PDF, usar la Web Share API cuando
  esté disponible y abrir en pestaña nueva como fallback.
- Safari puede eliminar el almacenamiento tras 7 días sin uso; los PWA instalados están
  exentos. Por eso el backup JSON es requisito de la v1, no un extra.
- El zoom automático al enfocar inputs se evita con `font-size: 16px` en los campos.

## 8. Cómo trabajar

- **Una fase del PRD por vez** (sección 11). No empieces la fase siguiente sin que la
  anterior esté desplegada y funcionando.
- **Al iniciar una tarea:** decí qué vas a hacer, qué archivos vas a tocar y qué tendría
  que poder hacer el usuario al terminar.
- **Al terminar una tarea:** decí explícitamente cómo probarla — qué abrir, qué tocar, qué
  debería pasar. Y qué comando de git correr para guardar el avance.
- **Commits chicos y descriptivos**, uno por unidad de trabajo con sentido. Mensajes en
  inglés, imperativo: `add episode form`, `fix timezone in day counter`.
- **Si el usuario pide algo que contradice el PRD:** decilo, explicá el conflicto y ofrecé
  dos caminos (hacerlo ahora y actualizar el PRD, o anotarlo para v2). No lo implementes
  en silencio.
- **Si algo es ambiguo, preguntá.** No adivines requisitos en un proyecto de datos de salud.

## 9. Definición de terminado (por tarea)

Una tarea está terminada cuando:

1. El código compila sin errores ni warnings de TypeScript.
2. La funcionalidad se probó a mano en el navegador y se le explicó al usuario cómo probarla.
3. No se rompió ninguna funcionalidad previa.
4. No hay `console.log` de depuración olvidados.
5. Los cambios están commiteados.

## 10. Skills de diseño instaladas

Este proyecto usa un subconjunto de `julianoczkowski/designer-skills` (Apache 2.0),
instalado con **alcance de proyecto**, no global.

### Instalación

```bash
npx skills add julianoczkowski/designer-skills
```

La CLI es interactiva. Seleccionar únicamente estas tres:

- `design-tokens`
- `frontend-design`
- `design-review`

Alcance: **project**. Agente: Claude Code.

**Deliberadamente NO se instalan** `design-flow`, `grill-me`, `design-brief`,
`brief-to-tasks` ni `information-architecture`, porque producen artefactos que este
proyecto ya tiene (`PRD.md`) y generarían una segunda fuente de verdad. Si alguna
aparece instalada, no invocarla.

Verificación de que quedaron disponibles: `ls .claude/skills/` debe listar las tres.

### Cuándo invocar cada skill

Estos disparadores son automáticos. No hace falta que el usuario nombre la skill; si se
cumple la condición, invocala y avisale que la estás usando y por qué.

| Skill | Invocar cuando | Frecuencia |
|---|---|---|
| `design-tokens` | Antes de escribir el primer componente con estilos, al inicio de la fase 1 | Una sola vez en todo el proyecto |
| `frontend-design` | Antes de construir cualquier pantalla nueva de `src/screens/` o cualquier componente visual nuevo | Cada pantalla |
| `design-review` | Al cerrar cada fase del PRD, antes de dar la fase por terminada | Una vez por fase |

**Regla de orden:** nunca escribir estilos antes de que existan los tokens. Si
`src/styles/tokens.css` (o el archivo equivalente que genere la skill) no existe todavía
y hay que construir UI, correr `design-tokens` primero.

### Qué pasarle a cada skill

Las skills no conocen este proyecto. Al invocarlas hay que darles el contexto explícito:

- **Siempre:** la filosofía estética fijada (ver más abajo), el ancho objetivo de 390 px,
  iOS Safari como target, y las restricciones de la sección 6 de este archivo.
- **`design-tokens`:** que necesita una escala de intensidad de 10 pasos, distinguible en
  modo claro y oscuro, y legible para daltonismo (no basar la escala solo en rojo/verde).
- **`frontend-design`:** el requisito funcional específico del PRD que la pantalla
  implementa, citando su número (RF-01, RF-12, etc.).
- **`design-review`:** los números de RF de la fase que se está cerrando, para que la
  crítica sea contra requisitos y no contra gusto estético.

### Precedencia de documentos

Si aparece cualquier contradicción entre documentos, el orden de autoridad es:

1. `PRD.md` — define el alcance y los requisitos. Gana siempre.
2. `CLAUDE.md` — define cómo se construye.
3. Cualquier archivo en `.design/` — apoyo visual, nunca fuente de requisitos.

En particular: **nada en `.design/` puede ampliar el alcance.** Si una skill de diseño
propone una pantalla, una función o un campo que no está en el PRD, no se implementa;
se menciona al usuario como candidato para v2.

### Filosofía estética fijada

La filosofía de diseño para este proyecto es **Escandinavo**: calidez con contención,
formas redondeadas, accesibilidad por defecto. Está elegida y no se renegocia en cada
sesión. `/frontend-design` no debe seleccionar una filosofía por su cuenta ni proponer
otra.

Restricción que prevalece sobre cualquier parámetro estético: las reglas de la sección 6
de este archivo (targets de 44 px, tipografía ≥ 16 px, contraste alto, sin animaciones
parpadeantes). Si un parámetro de la filosofía elegida entra en conflicto con la
accesibilidad bajo dolor de cabeza, gana la accesibilidad.

## 11. Comandos

```bash
npm run dev        # servidor de desarrollo, http://localhost:5173
npm run build      # build de producción en /dist
npm run preview    # sirve el build local (necesario para probar el PWA)
npx tsc --noEmit   # verifica los tipos sin generar archivos
```

Para probar el modo offline y la instalación hay que usar `build` + `preview`: el service
worker no está activo en `dev`.
