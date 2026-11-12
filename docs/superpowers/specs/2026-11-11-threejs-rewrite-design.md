# Diseño — Lunar Rover Expedition en Three.js

**Fecha:** 2026-11-11
**Estado:** propuesta para aprobación (revisado tras comprobación del constructor)

---

## 1. Intención

El repositorio `traderxael/lunar-rover` contiene un juego web que a lo largo de catorce
checkpoints cambió de ser un juego de conducción a ser un tycoon de base científica. Ese giro
dejó el juego de conducir **escrito pero desconectado**, y dejó el proyecto **sin los recursos
visuales que necesita para dibujarse**.

Este diseño ordena tres cosas que hoy están mezcladas:

1. **Volver a hacer el juego jugable.** El rover tiene que poder conducirse.
2. **Rehacer la capa 3D en Three.js**, con modelos reales de exploración lunar, y una escena y
   una interfaz que se sostengan solas.
3. **Dejar el repositorio listo para seguir trabajando**: README, licencia, CI, tests,
   recursos propios y sin andamiaje de terceros.

La decisión de producto acordada es: **la conducción es el núcleo; la base es la capa de
progresión**. Sales a la superficie, recoges muestras, y lo que traes financia la base, que a
su vez desbloquea sectores y mejoras para la siguiente salida.

---

## 2. Estado actual verificado

Todo lo que sigue se comprobó leyendo el código clonado, no suponiendo.

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | **El rover no se conduce.** La misión de superficie está escrita y nadie la usa. | `GameWorld.ts` (16087 B), `Rover.ts` (7003 B), `Hud.ts` (4913 B) y `DustStorm.ts` (2359 B) no son importados por ningún archivo. `scene.ts` sólo construye `BaseWorld`. |
| 2 | **Los recursos visuales no están en el repositorio.** | Hay **19 referencias** a `/manus-storage/…`: 13 en `game/assets.ts`, 5 en `BuildingManager.ts` y el favicon en `index.html`. El directorio no existe en el proyecto: `client/public` sólo contiene `.gitkeep` y `__manus__/`. |
| 3 | **El proyecto depende de la infraestructura de Manus.** | `vite.config.ts` carga `vite-plugin-manus-runtime`, un plugin recolector de logs y un proxy `/manus-storage` que exige `BUILT_IN_FORGE_API_URL` y `BUILT_IN_FORGE_API_KEY`. `index.html` carga analítica de Manus y fuentes de Google. |
| 4 | **No hay README ni LICENSE.** | `package.json` declara `"license": "MIT"` pero no existe el archivo. |
| 5 | **No hay CI ni tests.** | `vitest` está en `devDependencies` y no hay ni un archivo de test. No hay `.github/`, ni `vitest.config.*`, ni ESLint. |
| 6 | **Sobra código de plantilla y código muerto.** | `pages/Home.tsx` es el "Example Page" sin tocar; `NotFound.tsx`, `LeaderboardPanel.tsx`, `components/Map.tsx` y `ManusDialog.tsx` no se usan; hay **53** componentes en `components/ui/` y el juego usa una fracción. |
| 7 | **El HUD esperado no existe.** | `Hud.ts` busca por id (`mission-hud`, `energy-bar`, `mission-result`, `sample-value`…) y esas marcas no están ni en `index.html` ni en `index.css`: el HUD de misión no tiene estructura ni estilo. |
| 8 | **La base y la misión viven en el mismo terreno.** | `BaseWorld.ts` construye el terreno desde el mismo `MissionMap` que define cráteres y muestras, y coloca los 12 nodos de construcción encima. Hoy se puede conducir por la base. |
| 9 | **Hay dos cianes.** | `#55cbd0` en la mayor parte del CSS y `#4ABDC0` en los materiales 3D. |

**Conclusión:** el trabajo no es "añadir Three.js". Es **reconectar el juego**, y el cambio de
motor es el vehículo para hacerlo.

---

## 3. Objetivos

- **O1 — Jugable de verdad.** Al abrir el juego se conduce un rover en 3D en menos de diez
  segundos, con teclado y con controles táctiles.
- **O2 — Bucle corto con reincidencia.** Una misión dura entre 60 y 150 segundos, se puede
  repetir, puntúa, y el resultado alimenta la base.
- **O3 — Escena visual creíble.** Terreno lunar con cráteres y rocas, iluminación con un sol
  rasante, Tierra en el horizonte, polvo, y un rover que se lee como vehículo y no como
  primitivas apiladas.
- **O4 — Interfaz clara.** HUD legible en escritorio y móvil, con jerarquía, estados y
  accesibilidad por teclado.
- **O5 — Repositorio autónomo.** Se clona, se instala, se ejecuta y se despliega sin
  credenciales de Manus ni recursos externos.
- **O6 — Base para el futuro.** CI que falla en rojo, tests de las reglas, guía de arquitectura
  y de recursos.

## 4. No objetivos

- Multijugador, salas o cualquier autoridad de servidor.
- Motor de física de terceros (Cannon, Rapier, Ammo). La conducción sigue siendo cinemática.
- Rediseño de la economía del tycoon: se conserva y sólo se conecta.
- Aplicación nativa, tiendas, o navegadores sin WebGL2.

## 5. Anti objetivos

- **Entregar con recursos faltantes.** Si un modelo o textura no está en el repositorio, la
  escena degrada con geometría procedural; nunca se emite un 404.
- **Dejar código muerto.** Lo que no se usa se borra en la misma fase en que se detecta.
- **Un juego que sólo se administra.** La base no puede volver a ser la única pantalla.
- **Reescribir las reglas.** `TycoonState`, `Progression`, campañas y bitácora tienen
  comportamiento conocido: se conserva su lógica, aunque sus archivos cambien (ver §8.2).

---

## 6. Restricciones

| Restricción | Consecuencia |
|---|---|
| TypeScript estricto, Vite, pnpm. | Los módulos nuevos siguen el `tsconfig` y el alias `@/`. |
| Persistencia en `localStorage` con versionado. | Se mantiene el esquema v3 y su migración. |
| Sin backend. | El juego es estático; `server/` se retira del build y del árbol. |
| Un único lienzo WebGL. | Se mantiene el patrón `createGameScene` → `GameHandle` con `sync` y `dispose`. |
| Presupuesto de descarga modesto. | Modelos optimizados; total de assets por debajo de ~15 MB. |
| Estética existente. | Se conserva grafito/marfil, cian de navegación y ámbar `#F3A533`. |
| Fuentes propias. | Las dos familias tipográficas se autoalojan; no se cargan de Google. |

---

## 7. Enfoque elegido

**Reemplazar sólo la capa 3D, conservando la lógica de React y de las reglas.**

Se borran los archivos que dependen de `@babylonjs/*` y se escriben los equivalentes en
Three.js. La lógica sin motor —estado, economía, construcción, investigación, campañas,
descubrimientos, progresión, sectores, demostración— se conserva.

### Alternativas consideradas

| Alternativa | Por qué se descarta |
|---|---|
| Proyecto nuevo en Three.js copiando sólo el diseño. | Se pierden las campañas, la bitácora con filtros y la clasificación, que son la mayor parte del valor construido. |
| Quedarse en Babylon y sólo añadir modelos. | No resuelve lo pedido y no elimina la dependencia de Manus. |
| Portar a Unity o a motor nativo. | Rompe la entrega web estática y el despliegue en GitHub Pages. |

---

## 8. Arquitectura destino

### 8.1 Capa 3D nueva — `client/src/three/`

| Módulo | Responsabilidad |
|---|---|
| `engine.ts` | Crea `WebGLRenderer`, escena, cámara, luces, niebla, el bucle de render y el `GameHandle`. Es el único dueño del renderer. |
| `terrain.ts` | Genera la malla de altura con cráteres y expone `terrainHeight(x, z)` como única fuente de verdad para apoyar objetos. Recibe la configuración del sector como parámetro, sin estado global. |
| `rover.ts` | Carga el GLB del rover (con reserva procedural si falla) y aplica el control cinemático: aceleración, inercia, dirección, impulso, inclinación y polvo de ruedas. |
| `mission.ts` | Misión de superficie: muestras, energía, cráteres peligrosos, tormenta, desafío opcional, éxito y agotamiento. |
| `base.ts` | Construye las mallas de la base a partir de `TycoonState`. |
| `dust.ts` | Partículas de tormenta y veladura atmosférica. |
| `models.ts` | Carga GLTF con `GLTFLoader`, normaliza escala y orientación, devuelve clones y registra procedencia. |
| `sky.ts` | Estrellas, Tierra, sol y gradiente de vacío. |
| `input.ts` | Traduce teclado y controles táctiles a acciones. Sustituye a `InputManager.ts`. |

### 8.2 «Se conserva» significa se conserva la lógica, no el archivo

Estos módulos mantienen sus reglas y su contrato público, y **sí cambian** en lo que sigue:

| Archivo | Cambio necesario |
|---|---|
| `TycoonState.ts` | Se admite un campo de origen de expedición. Migración compatible. |
| `MissionMap.ts` | Se quita la dependencia de `Vector3` de Babylon: pasa a `{ x, z }`. Sigue siendo sólo datos. |
| `BuildingManager.ts` | Las cinco imágenes de tarjeta dejan de apuntar a `/manus-storage`. |
| `Progression.ts` | Sin cambios de reglas; se le quita el acoplamiento DOM si aparece. |
| `ScienceArchive.tsx`, `DiscoveryTimeline.tsx` | Sólo cambian las rutas de imágenes y el cian unificado. |
| `EconomyManager.ts`, `ResearchManager.ts`, `CampaignManager.ts`, `DiscoveryManager.ts`, `ExpeditionManager.ts`, `SectorManager.ts`, `DemoManager.ts` | Sin cambios de reglas. |

Se conservan **sin tocar**: `components/ui/` que el juego usa, `lib/utils.ts` (`cn`), y los
hooks que sigan teniendo consumidores.

### 8.3 Lo que se elimina

`game/scene.ts`, `game/GameWorld.ts`, `game/Rover.ts`, `game/Hud.ts`, `game/DustStorm.ts`,
`game/BaseWorld.ts`, `game/terrain.ts` (versión Babylon), `game/InputManager.ts`,
`game/assets.ts` (se reescribe), `components/LeaderboardPanel.tsx`, `components/Map.tsx`,
`components/ManusDialog.tsx`, `pages/Home.tsx`, `pages/NotFound.tsx`, `client/public/__manus__/`,
`server/index.ts`, `shared/const.ts` si queda sin uso, los plugins de Manus de `vite.config.ts`
y la analítica de `index.html`.

`hooks/useMobile.tsx` y `hooks/useComposition.ts` se retiran **sólo si** el árbol de UI que
sobrevive deja de usarlos (`useComposition` lo usan `input` y `textarea`).

### 8.4 Escenas: base y misión son dos lugares distintos

Hoy comparten terreno. Se separan:

- **Escena de misión.** Terreno procedural propio del sector, cráteres, rocas, muestras,
  baliza, rover. Cámara de persecución.
- **Escena de base.** Suelo propio y llano, nodos de montaje, módulos, antena. Cámara orbital
  con zoom y paneo restringidos.

El motor sostiene las dos y sólo una está activa. `GameHandle` expone `showBase()` y
`showMission(sector)`. `dispose()` libera ambas. Esto resuelve el hallazgo 8 y hace que la
conducción no sea un recorrido de obstáculos dentro de la base.

### 8.5 Contrato de integración con React

`GameCanvas.tsx` deja de crear un `Engine` de Babylon y de ejecutar el bucle de render:

```
const handle = await createGameScene(canvas, initialState)
handle.syncTycoonState(state)   // al cambiar el estado de base
handle.showMission(sector)      // al salir a superficie
handle.dispose()                // al desmontar
```

El HUD se resuelve **dentro de React**, sobre el lienzo, en lugar del `Hud.ts` que escribía en
`getElementById`. Esto elimina la duplicación de estado y hace el HUD testeable.

### 8.6 Telemetría: canal efímero, no estado persistido

El HUD necesita energía, velocidad, distancia y tiempo a ~10 Hz. Esos valores viven en un
almacén efímero propio (`MissionTelemetry`) que React suscribe con `useSyncExternalStore`, y
**no** se escriben en `TycoonState`. Al terminar la misión se persiste sólo el resultado
(grado, tiempo, energía restante, muestras). Así se evita una escritura síncrona de
`localStorage` diez veces por segundo, que es exactamente el problema que `Hud.ts` resolvía
saliéndose de React.

---

## 9. Jugabilidad

### 9.1 Bucle corto (una misión)

1. **Briefing.** Sector, objetivo, energía disponible y desafío opcional.
2. **Superficie.** Conducción libre con cámara de persecución.
3. **Recolección.** Cada muestra se recoge por proximidad; suma datos y algo de energía.
4. **Riesgo.** Los cráteres profundos frenan y drenan; la tormenta reduce visibilidad y
   aumenta el consumo.
5. **Extracción.** Al reunir la cuota de muestras la misión termina y el rover regresa a la
   base. **No hay tramo de vuelta que conducir**: la misión se cierra al llegar a la cuota,
   para que dure entre 60 y 150 segundos.

### 9.2 Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Acelerar / retroceder | `W` `S` / `↑` `↓` | Palanca izquierda |
| Girar | `A` `D` / `←` `→` | Palanca izquierda |
| Impulso | `Espacio` | Botón derecho |
| Reiniciar | `R` | Botón de menú |
| Pausa | `Esc` | Botón de menú |

### 9.3 Modelo de conducción

Se conserva el modelo cinemático actual (aceleración `7,2`, fricción `1,7`, velocidad máxima
`9,7`, reversa `-4,2`, refuerzo temporal). Cambia que la orientación interpola hacia el vector
de marcha con un coeficiente dependiente de la velocidad, y que el rover se apoya en la altura
del terreno muestreada en las cuatro ruedas, no en el centro: eso es lo que hace que se sienta
pesado y no flotando.

### 9.4 Reincidencia

- **Grado y puntuación** con desempate transparente (ya existe en `Progression.ts`).
- **Rutas distintas**: las muestras se siembran con la semilla del sector, así que el orden
  óptimo cambia entre intentos.
- **Desafío opcional** por sector (balizas, bordes, muestreo eólico), que no bloquea el acceso
  pero da reconocimiento.
- **Desbloqueo de sectores** por grado, ya implementado.
- **Objetivo de base**: lo que traes financia módulos e investigaciones, que a su vez abren
  sectores y mejoras.

### 9.5 Dificultad

Tres sectores con multiplicador de riesgo creciente (1,00 / 1,25 / 1,50) y consumo por
desplazamiento. La curva se afina con la energía inicial y el número de muestras por sector.
Los umbrales de grado (energía y tiempo) se conservan tal como están en `Progression.ts`.

---

## 10. Contenido 3D

### 10.1 Estrategia

| Elemento | Origen | Motivo |
|---|---|---|
| Terreno, cráteres, rocas, módulos de base | Procedural en Three.js | Estilo consistente, peso cero, sin licencias. |
| Rover | **Modelo CC0 descargado (GLB), entregable principal** | Es la pieza que el jugador mira todo el tiempo; necesita detalle real. |
| Módulo de alunizaje / antena / hitos | Modelo CC0 descargado (GLB) | Da escala y narrativa a la escena. |
| Texturas de regolito | CC0 (Poly Haven) o generadas | Repetición controlada y detalle de cerca. |
| Partículas de polvo | Generadas en runtime | Peso cero, control total. |

Se descarta la generación por IA para los modelos protagonistas: un modelo por llamada, coste
por pieza y resultado no determinista. Queda como último recurso si no se encuentra un CC0
adecuado.

### 10.2 Reglas de incorporación

- Todo asset se guarda en `client/public/models/` o `client/public/textures/`.
- Se documenta en `ASSETS.md`: nombre, fuente, URL, autor y licencia.
- Se incluye el texto de licencia cuando la licencia lo exige (CC-BY).
- Ningún asset se carga desde una URL remota en tiempo de ejecución.
- Las dos familias tipográficas se autoalojan en `client/public/fonts/` con su licencia (OFL).
- Presupuesto: rover por debajo de 60k triángulos; textura de regolito 1024².

### 10.3 Reserva

Si un GLB no carga, el módulo construye geometría procedural equivalente y registra un aviso.
La escena nunca queda vacía. **La reserva no es el entregable**: un rover procedural aceptable
para §11 es casi un trabajo de modelado aparte, así que la fase 3 depende de encontrar y validar
el modelo antes de empezar. Si no aparece, se documenta y se decide con el usuario.

---

## 11. Dirección visual

- **Cámara de misión:** persecución oblicua elevada, amortiguada, que se aleja ligeramente con
  la velocidad. **Cámara de base:** orbital con zoom y paneo restringidos, como hoy.
- **Iluminación:** un sol rasante y frío, relleno hemisférico de baja intensidad y un contraluz
  cian. Sombras suaves de contacto.
- **Cielo:** vacío negro azulado, estrellas de intensidad variable, Tierra en el horizonte con
  un ligero brillo atmosférico.
- **Polvo:** partículas orientadas a cámara en Selenita, con veladura y consumo extra.
- **Paleta:** grafito `#252D35`, marfil `#E4E0D3`, cian único `#4ABDC0`, ámbar `#F3A533`. Se
  unifica el `#55cbd0` del CSS contra el `#4ABDC0` de los materiales.
- **HUD:** tipografía condensada para cifras y sans para lectura; jerarquía por tamaño y
  posición, no por color; los estados críticos se anuncian con texto además del color.

### 11.1 Interfaz

| Pantalla | Contenido |
|---|---|
| Título | Nombre, entrada, continuar, créditos de assets. |
| Selección de sector | Tarjetas con estado, requisito y mejor resultado. |
| Briefing | Objetivo, energía, desafío opcional, controles. |
| Juego | HUD: energía, muestras, distancia, velocidad, tiempo, estado. |
| Resultado | Grado, desglose de puntuación, desbloqueos, reintentar. |
| Base | Consola de construcción, operaciones, campañas, archivo. |
| Archivo | Investigación, campañas, bitácora con filtros, orden y búsqueda. |

---

## 12. Integración con la base

| Evento de misión | Efecto en `TycoonState` |
|---|---|
| Misión completada | Suma regolito y datos según muestras y grado. |
| Desafío opcional | Bono único de datos. |
| Nuevo récord | Entrada en clasificación y posible desbloqueo de sector. |
| Sector desbloqueado | Registro en la bitácora con recompensa. |

- **`Cerrar ciclo` se conserva.** Es la acción que hace avanzar la economía, la producción, las
  alertas, el daño y los hitos de campaña. Las misiones son una fuente de recursos adicional,
  no un reemplazo del ciclo.
- **La expedición deja de resolverse por temporizador de tres ciclos.** Se resuelve con la
  misión jugada. Se añade un campo `origin: "manual" | "demo"` al registro para no romper el
  modo demostración, con migración compatible (los guardados sin el campo reciben `manual`).
- **El modo `?demo` se mantiene** y deja de depender del temporizador de expedición: el rover
  usa un piloto automático simple que conduce hacia la muestra más cercana. Sigue sin escribir
  `localStorage`.

---

## 13. Repositorio y tooling

| Tarea | Detalle |
|---|---|
| `README.md` | Qué es, cómo se ejecuta, controles, arquitectura, cómo contribuir, licencia y créditos de assets. Secciones ES y EN en el mismo archivo. |
| `LICENSE` | MIT, autor `traderxael`. |
| `ASSETS.md` | Se amplía con procedencia y licencia de cada modelo y de las fuentes. |
| `.github/workflows/ci.yml` | `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build` en push y PR. |
| `.github/workflows/pages.yml` | Publica `dist/public` en GitHub Pages en `main`. Requiere **`base` en `vite.config.ts`**: sin él, un sitio de proyecto (`/lunar-rover/`) da 404 en todos los assets. |
| Tests | `vitest` sobre las reglas: puntuación, desempate, medallas, migración v3, campañas, descubrimientos, economía y construcción. `Progression` y `TycoonState` envuelven el acceso a `localStorage` en `try/catch`, así que corren en Node sin jsdom. Se añade un `tsconfig` que **incluya** los tests: el actual los excluye, y `pnpm check` no los vería. |
| ESLint | Configuración mínima con `typescript-eslint` y reglas de imports. |
| Scripts | `start` portable (sin `NODE_ENV=` al estilo Unix), `test`, `test:watch`, `lint`. Se retira `server/` del build. |
| Descritor del repo | Descripción, topics (`threejs`, `game`, `typescript`, `lunar`, `webgl`) y sitio de GitHub Pages. |
| Lockfile | Se regenera: `--frozen-lockfile` en CI falla hasta que se quite Babylon y entre Three.js. |
| Limpieza | Plantilla, código muerto, `__manus__`, plugins de Manus, analítica, `shared/const.ts` si queda sin uso. |

---

## 14. Fases y verificación

Cada fase termina con `pnpm check`, `pnpm build`, `pnpm test` y una comprobación manual en el
navegador sin errores de consola ni peticiones 404.

| Fase | Entrega | Verificación |
|---|---|---|
| **1. Cimientos del repo** | README, LICENSE, CI, ESLint, scripts portables, tests de las reglas, limpieza de plantilla y código muerto, fuentes autoalojadas, lockfile regenerado. | CI verde; `pnpm test` cubre puntuación, medallas, migración v3, campañas y economía. |
| **2. Three.js base** | `engine.ts`, `terrain.ts`, `sky.ts`, `models.ts`, `input.ts`; se borra Babylon. Dos escenas vacías: base y misión. | Ambas escenas cargan, no hay errores, el terreno coincide con `terrainHeight`. |
| **3. Rover y conducción** | `rover.ts` con el GLB validado y reserva procedural; control cinemático; cámara de persecución; polvo de ruedas. | Se conduce con teclado y táctil; el rover se apoya en el terreno; no atraviesa el suelo ni tiembla. |
| **4. Misión de superficie** | `mission.ts`: muestras, energía, cráteres peligrosos, tormenta, desafío opcional, éxito y agotamiento; HUD y telemetría en React. | Una misión completa de punta a punta; el HUD refleja el estado; el resultado se guarda. |
| **5. Dirección visual** | Iluminación, sombras, Tierra, polvo, paleta unificada, modelos de hitos y módulo de alunizaje. | Capturas comparables a la referencia; el rover se lee como vehículo; rendimiento estable. |
| **6. Integración con la base** | Resultado de misión → recursos y datos; desbloqueos; bitácora; expedición manual; `?demo` con piloto automático. | Una misión financia al menos un módulo; recargar conserva el progreso; el modo `?demo` avanza solo. |
| **7. Interfaz completa** | Título, selección de sector, briefing, pausa, resultado, base, archivo. | Flujo completo navegable por teclado; responsive en móvil; sin desbordes. |
| **8. Publicación** | GitHub Pages con `base`, assets locales, README con capturas, release inicial. | URL pública carga el juego; el repo se clona e instala desde cero. |

---

## 15. Decisiones del diseñador

Mías, tomadas para no bloquear el diseño. Se pueden revertir.

1. **Three.js en lugar de Babylon**, por peso, ecosistema de modelos y licencias.
2. **HUD dentro de React** con telemetría efímera (§8.6): una sola fuente de estado.
3. **Base y misión en escenas separadas** (§8.4): la base no es un recorrido de obstáculos.
4. **Cámara de persecución en misión, orbital en base.**
5. **Modelos CC0 descargados** para rover e hitos; procedural para terreno y módulos.
6. **Sin tramo de vuelta a la baliza** (§9.1.5): la misión cierra al llegar a la cuota.
7. **Una misión dura 60–150 s.**
8. **«Cerrar ciclo» se conserva** como acción de la base (§12).
9. **`?demo` se mantiene** con piloto automático.
10. **Fuentes autoalojadas** para cumplir O5 sin cambiar la tipografía.
11. **Sin audio en la primera entrega.**
12. **README bilingüe** en un solo archivo.
13. **GitHub Pages** como destino, por ser estático y gratuito.

---

## 16. Lo que queda abierto

| Pregunta | Por qué importa | Valor por defecto si no se responde |
|---|---|---|
| ¿El nombre sigue siendo "Lunar Science Base" o vuelve a "Lunar Rover Expedition"? | Afecta título, README, dominio y textos. | "Lunar Rover Expedition". |
| ¿Los tres sectores actuales alcanzan o hace falta uno nuevo? | Define el trabajo de contenido de la fase 4. | Alcanzan; se afina la dificultad. |
| ¿Se conserva la analítica? | Es dependencia externa y de privacidad. | Se elimina. |