# PRD — Jaque Tracker

**Versión:** 1.0
**Fecha:** agosto 2026
**Autor:** usuario único / propietario del producto
**Estado:** aprobado para construcción de v1

---

## 1. Problema

En las consultas con el neurólogo, la información sobre los episodios de cefalea se
reconstruye de memoria. Eso produce dos errores sistemáticos:

- **Subregistro de frecuencia:** se recuerdan los episodios severos y se olvidan los leves.
- **Subregistro de consumo de analgésicos:** es la variable que más le importa al
  neurólogo, porque el uso de medicación de rescate más de 10–15 días por mes puede
  generar *cefalea por abuso de medicación* (CAM), que empeora el cuadro y cambia
  el tratamiento.

Sin datos, el ajuste del tratamiento preventivo se hace a ciegas.

## 2. Objetivo

Una app personal que permita registrar un episodio de cefalea en menos de 60 segundos,
incluso mientras duele, y generar un reporte en PDF que el neurólogo pueda leer en
menos de 2 minutos y usar para tomar decisiones clínicas.

### Métricas de éxito

| Métrica | Objetivo |
|---|---|
| Tiempo de registro de un episodio | < 60 segundos |
| Episodios registrados vs. ocurridos | > 90% |
| Reporte legible sin explicación previa | El neurólogo no pregunta "¿y esto qué es?" |

## 3. Usuario

Un único usuario. No hay registro, login, roles ni multiusuario. El neurólogo **no es
usuario de la app**: es el destinatario de un PDF.

## 4. Decisiones técnicas (cerradas)

| Capa | Decisión |
|---|---|
| Tipo de app | PWA (web app instalable), no nativa |
| Framework | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS |
| Persistencia | IndexedDB vía Dexie.js — 100% en el dispositivo |
| Generación de PDF | jsPDF + jspdf-autotable |
| Instalable / offline | vite-plugin-pwa |
| Hosting | Cloudflare Pages (plan gratuito) |
| Backend | **Ninguno** |
| Autenticación | **Ninguna** |
| Dispositivo objetivo | iPhone / Safari (mobile-first) |

### Nota sobre el hosting

Se elige **Cloudflare Pages** y no Workers, a pesar de que Cloudflare recomienda Workers
para proyectos nuevos. El argumento a favor de Workers es poder agregar backend sin
cambiar de plataforma; este proyecto está diseñado para no tener backend nunca
(ver sección 9). Pages ofrece el flujo más simple posible: repo conectado, `git push`,
publicado. Migrar a Workers más adelante sería un cambio de configuración, no una
reescritura.

### Consecuencia crítica de la decisión de persistencia

Los datos viven únicamente en el navegador del dispositivo. Safari en iOS puede
eliminar el almacenamiento de un sitio web tras 7 días sin uso; los PWA instalados en
la pantalla de inicio están exentos de esa política, pero la garantía no es absoluta.

**Por lo tanto:** la exportación e importación de un backup en JSON es un requisito
bloqueante de la v1 (RF-24, RF-25). Sin eso, la app no se considera terminada.

## 5. Modelo de datos

### `episodes` — episodios de cefalea

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | |
| `startedAt` | ISO datetime | Editable; por defecto "ahora" |
| `endedAt` | ISO datetime \| null | `null` = episodio en curso |
| `type` | `'migraine' \| 'tension' \| 'unknown'` | Por defecto `unknown` |
| `intensity` | 1–10 | Escala visual analógica |
| `location` | `'unilateral' \| 'bilateral' \| 'nuchal' \| 'periocular' \| 'other'` | Opcional |
| `hasAura` | boolean | |
| `auraTypes` | array de `'visual' \| 'sensory' \| 'speech' \| 'motor'` | Solo si `hasAura` |
| `symptoms` | array de `'nausea' \| 'vomiting' \| 'dizziness' \| 'photophobia' \| 'phonophobia' \| 'neckStiffness'` | |
| `disability` | 0–3 | 0 sin impacto · 1 molestia · 2 limitó actividades · 3 incapacitó |
| `notes` | string | Libre, opcional |

### `medications` — catálogo de medicamentos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | |
| `name` | string | Ej. "Ibuprofeno" |
| `dose` | number | |
| `unit` | `'mg' \| 'g' \| 'ml' \| 'ui'` | |
| `kind` | `'rescue' \| 'preventive'` | Determina cómo se cuenta en el reporte |
| `isActive` | boolean | Permite discontinuar sin borrar el historial |
| `schedule` | objeto \| null | Solo para preventivos: `{ timesPerDay, times[] }` |

### `intakes` — tomas de medicación de rescate

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | |
| `medicationId` | string | |
| `takenAt` | ISO datetime | |
| `episodeId` | string \| null | Vinculación opcional al episodio |
| `relief2h` | `'none' \| 'partial' \| 'complete' \| null` | Dato que el neurólogo pide explícitamente |

### `preventiveLogs` — adherencia al preventivo

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | |
| `medicationId` | string | |
| `date` | ISO date | Un registro por medicamento por día |
| `taken` | boolean | |

### `settings`

Nombre del paciente, fecha de nacimiento (opcional), nombre del neurólogo (opcional),
tema claro/oscuro.

## 6. Requisitos funcionales

### Épica A — Registro de episodios

- **RF-01** Registrar un episodio con un solo toque desde la pantalla principal.
- **RF-02** `startedAt` se precarga con la fecha y hora actuales y es editable.
- **RF-03** Seleccionar intensidad 1–10 con controles táctiles grandes (mínimo 44×44 px).
- **RF-04** Marcar tipo: migraña / tensional / no sé. "No sé" es una opción legítima y
  por defecto — la app no fuerza un autodiagnóstico.
- **RF-05** Marcar presencia de aura y, si aplica, su tipo.
- **RF-06** Marcar síntomas asociados mediante selección múltiple.
- **RF-07** Registrar grado de discapacidad funcional (0–3).
- **RF-08** Guardar el episodio como "en curso" y cerrarlo después con `endedAt`.
- **RF-09** Campo de notas libre, opcional.
- **RF-10** Guardar un episodio válido con solo fecha e intensidad. Todo lo demás es opcional.

### Épica B — Consulta y edición

- **RF-11** Listar episodios en orden cronológico inverso, con paginación o scroll.
- **RF-12** Vista de calendario mensual con marcas en los días con episodio, coloreadas por intensidad.
- **RF-13** Editar cualquier campo de un episodio pasado.
- **RF-14** Eliminar un episodio con confirmación explícita.
- **RF-15** Ver el detalle completo de un episodio, incluidas las tomas vinculadas.

### Épica C — Medicación

- **RF-16** Alta, edición y desactivación de medicamentos en el catálogo.
- **RF-17** Registrar una toma de rescate desde el episodio o de forma independiente.
- **RF-18** Registrar el alivio a las 2 horas de una toma (ninguno / parcial / completo).
- **RF-19** Marcar la toma diaria de cada preventivo activo desde la pantalla principal.
- **RF-20** Marcar retroactivamente la toma de un preventivo en días anteriores.
- **RF-21** Mostrar en pantalla el contador de días con medicación de rescate en el mes en curso.
- **RF-22** Advertencia visual (no bloqueante, sin alarmismo) al superar 10 días de rescate en el mes,
  con el texto: "Vas 11 días con analgésicos este mes. Puede ser útil comentarlo en la próxima consulta."

### Épica D — Reporte clínico

- **RF-23** Generar un PDF para un rango de fechas seleccionable (por defecto: últimos 90 días).
  El contenido exacto está especificado en la sección 8.

### Épica E — Respaldo de datos

- **RF-24** Exportar todos los datos a un archivo JSON.
- **RF-25** Importar un archivo JSON, con opción de reemplazar o fusionar, y confirmación explícita.
- **RF-26** Recordatorio en pantalla si pasaron más de 30 días desde el último backup.

### Épica F — Instalación

- **RF-27** Instalable en la pantalla de inicio de iOS.
- **RF-28** Funcional sin conexión a internet, en todas sus funciones.

## 7. Requisitos no funcionales

- **RNF-01 Privacidad:** ningún dato sale del dispositivo. Cero llamadas de red en runtime.
  Cero analytics, cero telemetría, cero fuentes ni scripts de terceros cargados en caliente.
- **RNF-02 Usabilidad bajo dolor:** targets táctiles ≥ 44 px, contraste alto, tipografía ≥ 16 px,
  modo oscuro disponible (la fotofobia es un síntoma frecuente), sin animaciones parpadeantes
  ni transiciones de alto contraste.
- **RNF-03 Rendimiento:** carga inicial < 2 s en 4G; interacciones sin bloqueo perceptible.
- **RNF-04 Offline-first:** la app nunca muestra un estado de error por falta de conexión.
- **RNF-05 Integridad:** ninguna operación destructiva sin confirmación explícita.
- **RNF-06 Portabilidad de datos:** el JSON exportado debe ser legible por un humano y
  suficiente para reconstruir el 100% del estado.

## 8. Especificación del reporte PDF

Este es el entregable de mayor valor del producto. Debe caber, idealmente, en 2 páginas.

### Encabezado

Nombre del paciente · rango de fechas del reporte · fecha de generación.

### Bloque 1 — Resumen del período

- Días con cefalea (métrica clínica principal) y promedio de días por mes.
- Días con cefalea por semana, en tabla.
- Desglose por tipo: migraña / tensional / no clasificada.
- Intensidad promedio y máxima.
- Duración promedio de los episodios.
- Días con discapacidad funcional grado 2 o 3.

### Bloque 2 — Medicación de rescate

- **Días con analgésicos por mes**, por medicamento. Destacado visualmente: es el dato
  que determina el riesgo de cefalea por abuso de medicación.
- Total de dosis por medicamento.
- Distribución de la respuesta a las 2 h: ninguno / parcial / completo.

### Bloque 3 — Medicación preventiva

- Medicamentos preventivos activos, con dosis y fecha de inicio.
- Porcentaje de adherencia en el período y por mes.
- Días omitidos.

### Bloque 4 — Síntomas asociados

Frecuencia absoluta y porcentual de cada síntoma sobre el total de episodios:
aura (y tipo), náuseas, vómitos, mareos, fotofobia, fonofobia.

### Bloque 5 — Registro detallado

Tabla con una fila por episodio: fecha, hora de inicio, duración, tipo, intensidad,
aura, síntomas, medicación tomada, alivio a las 2 h, discapacidad.

### Bloque 6 — Notas

Solo las notas no vacías, con su fecha.

### Pie de página

"Registro autoinformado por el paciente. No constituye un diagnóstico."

### Nota de implementación para iOS

En Safari iOS la descarga directa de un blob no siempre funciona como en desktop.
El PDF debe entregarse mediante la Web Share API cuando esté disponible, con fallback
a apertura en una pestaña nueva, para que el usuario pueda guardarlo en Archivos,
enviarlo por mail o imprimirlo.

## 9. Fuera de alcance (v1)

Explícitamente **no** se construye:

- Backend, base de datos en la nube o sincronización entre dispositivos.
- Cuentas de usuario, login, recuperación de contraseña.
- Cualquier función diagnóstica, sugerencia de tratamiento o interpretación clínica.
- Detección o análisis de disparadores (comidas, sueño, estrés, ciclo menstrual, clima).
- Integración con Apple Health, wearables o APIs de terceros.
- Notificaciones push o recordatorios de toma.
- Gráficos y visualizaciones dentro de la app (más allá del calendario de RF-12).
- Multiusuario, compartir por link, portal para el médico.
- Exportación a CSV o Excel.

Varios de estos son candidatos razonables para v2. Ninguno se toca antes de que la v1
esté completa y en uso real.

## 10. Definición de terminado (v1)

La v1 está terminada cuando, y solo cuando:

1. Se puede registrar un episodio completo en menos de 60 segundos desde la pantalla de inicio.
2. Se puede registrar una toma de rescate y su alivio a las 2 h.
3. Se puede marcar la toma diaria del preventivo.
4. Se puede editar y borrar cualquier registro.
5. El PDF se genera con los 6 bloques de la sección 8 y se puede guardar desde un iPhone.
6. El export e import de JSON funcionan y se verificó una restauración completa en un dispositivo limpio.
7. La app está instalada en la pantalla de inicio del iPhone del usuario y funciona en modo avión.
8. No hay ninguna llamada de red en runtime (verificable en la pestaña Network).

## 11. Fases de construcción

| Fase | Entrega | Requisitos |
|---|---|---|
| 0 | Entorno, repo, deploy vacío en Cloudflare Pages | — |
| 1 | Esquema Dexie + registro y listado de episodios | RF-01 a RF-11 |
| 2 | Catálogo de medicamentos, tomas de rescate | RF-16 a RF-18 |
| 3 | Preventivos y contadores | RF-19 a RF-22 |
| 4 | Calendario, edición, borrado | RF-12 a RF-15 |
| 5 | **Reporte PDF** | RF-23 |
| 6 | Export/import JSON | RF-24 a RF-26 |
| 7 | PWA, offline, modo oscuro, instalación | RF-27, RF-28, RNF-02 |

Cada fase termina con la app desplegada y funcionando. No se avanza a la siguiente
fase con la anterior a medias.

## 12. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Safari borra el IndexedDB | Pérdida total de datos | Backup JSON (fase 6) + recordatorio de 30 días + instalación como PWA |
| El usuario deja de registrar | El reporte pierde valor | Registro en < 60 s; jamás pedir campos obligatorios innecesarios |
| Feature creep | La v1 nunca termina | La sección 9 es vinculante |
| El PDF no le sirve al neurólogo | Se pierde el objetivo del producto | Llevar el primer PDF a la consulta y ajustar según el feedback real |
