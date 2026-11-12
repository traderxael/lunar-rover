# Fase 1 — Cimientos del repositorio · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repositorio con tests de las reglas existentes, CI, licencia, README, assets locales y sin andamiaje de Manus, sin cambiar el comportamiento del juego.

**Architecture:** El proyecto sigue siendo React + Vite + TypeScript. Esta fase no toca la lógica de juego: añade una red de tests alrededor de las reglas puras (`Progression`, `TycoonState`, `EconomyManager`, `BuildingManager`, `DiscoveryManager`), quita código muerto y dependencias de la infraestructura de Manus, y deja el árbol listo para la migración a Three.js de la fase 2.

**Tech Stack:** TypeScript 5.6, Vite 7, React 19, Vitest 2, pnpm 10.

**Spec:** `docs/superpowers/specs/2026-11-11-threejs-rewrite-design.md`

## Global Constraints

- TypeScript en modo estricto. Sin `any` nuevo. Sin `@ts-ignore`.
- Los tests corren en Node, sin navegador: `environment: "node"`.
- Ningún módulo puede leer `window` sin protección: el acceso a `localStorage` va dentro de `try/catch` (ya es así; no se regresa).
- No se añaden dependencias nuevas salvo `vitest` (ya presente), `eslint` y `typescript-eslint`.
- Los tests no tocan el DOM ni montan React.
- Se conserva el comportamiento observable: si un test falla, es un hallazgo, no un ajuste de expectativa.
- Commit por tarea, con mensaje `test:` / `chore:` / `docs:` según corresponda.

## Review Focus

| Clase de entrada que el spec implica | Comportamiento esperado | Test que lo fija |
|---|---|---|
| `localStorage` con JSON corrupto | `loadTycoonState` devuelve el estado inicial, no lanza | Task 2, Step 1 |
| `localStorage` no disponible (pestaña privada) | Toda función de persistencia falla en silencio | Task 2, Step 5 |
| Guardado de versión 1 sin campañas ni bitácora | Migra a v3 conservando recursos y edificios | Task 2, Step 2 |
| Dos descubrimientos con el mismo id | El segundo no duplica la entrada | Task 3, Step 7 |
| Filtro compuesto sin coincidencias | Devuelve lista vacía, no excepción | Task 3, Step 8 |
| Búsqueda con acentos y mayúsculas distintas | Coincide igual | Task 3, Step 9 |
| Reparación sin regolito suficiente | Rechaza sin mutar el estado | Task 3, Step 6 |

---

## Task 1: Configuración de tests y reglas de progresión

**Files:**
- Modify: `package.json` (scripts `test`, `test:watch`)
- Create: `vitest.config.ts`
- Modify: `tsconfig.json` (quitar la exclusión de tests)
- Create: `test/progression.test.ts`

**Interfaces:**
- Consumes: `gradeMission(elapsed: number, energy: number): Grade`, `calculateScore(mapId, grade, elapsed, energy, optionalCollected): number`, `isMapUnlocked(mapId, progress?): boolean`, `recordMission(mapId, mapName, elapsed, energy, optionalCollected, optionalTotal): CompletionReport`, `getSectorMedal(entry, source?): SectorMedal | null`, `createProgress(): CampaignProgress` — todas de `client/src/game/Progression.ts`.
- Produces: `vitest.config.ts` con alias `@` → `client/src`, y `test/` incluido en el tipado.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { calculateScore, createProgress, getSectorMedal, gradeMission, isMapUnlocked, recordMission } from "@/game/Progression";

describe("gradeMission", () => {
  it("da S con energía alta y tiempo corto", () => {
    expect(gradeMission(80, 75)).toBe("S");
  });
  it("da A cuando falta energía para S", () => {
    expect(gradeMission(100, 60)).toBe("A");
  });
  it("da B cuando falta energía para A", () => {
    expect(gradeMission(140, 40)).toBe("B");
  });
  it("da C fuera de los umbrales", () => {
    expect(gradeMission(200, 20)).toBe("C");
  });
});

describe("calculateScore", () => {
  it("aplica bonus de grado y multiplicador de sector", () => {
    expect(calculateScore("tranquility", "S", 80, 75, 1)).toBe(2710);
    expect(calculateScore("tycho", "S", 80, 75, 1)).toBe(3388);
  });
  it("nunca devuelve un puntaje negativo", () => {
    expect(calculateScore("selenite", "C", 600, 0, 0)).toBe(0);
  });
});

describe("isMapUnlocked", () => {
  it("deja Tranquillitatis abierto y bloquea Tycho al inicio", () => {
    const progress = createProgress();
    expect(isMapUnlocked("tranquility", progress)).toBe(true);
    expect(isMapUnlocked("tycho", progress)).toBe(false);
  });
});

describe("recordMission", () => {
  it("registra la primera expedición y anuncia el desbloqueo de Tycho con grado A", () => {
    const report = recordMission("tranquility", "Mare Tranquillitatis", 100, 60, 1, 3);
    expect(report.grade).toBe("A");
    expect(report.rank).toBe(1);
    expect(report.record.completed).toBe(true);
    expect(report.newUnlock).toBe("tycho");
  });
});

describe("getSectorMedal", () => {
  it("otorga Órbita I al primer récord del sector", () => {
    const report = recordMission("tranquility", "Mare Tranquillitatis", 100, 60, 1, 3);
    const entry = { id: "x", mapId: "tranquility" as const, mapName: "Mare Tranquillitatis", grade: report.grade, score: report.score, elapsed: 100, energy: 60, optionalCollected: 1, optionalTotal: 3, createdAt: 1 };
    expect(getSectorMedal(entry, [entry])?.code).toBe("I");
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `pnpm vitest run test/progression.test.ts`
Expected: FAIL con "Cannot find module '@/game/Progression'" o "vitest: command not found".

- [ ] **Step 3: Crear `vitest.config.ts` y ajustar `tsconfig.json`**

`vitest.config.ts` resuelve el alias `@` con `path.resolve(import.meta.dirname, "client", "src")` y fija `test.environment: "node"`, `test.include: ["test/**/*.test.ts"]`.

En `tsconfig.json`, quitar `"**/*.test.ts"` de `exclude`.

- [ ] **Step 4: Añadir los scripts a `package.json`**

`"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `pnpm vitest run test/progression.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts test/progression.test.ts
git commit -m "test: cubre puntuación, desempate y desbloqueo de sectores"
```

---

## Task 2: Migración y persistencia del estado de base

**Files:**
- Create: `test/helpers/storage.ts`
- Create: `test/tycoon-state.test.ts`

**Interfaces:**
- Consumes: `createInitialTycoonState()`, `loadTycoonState()`, `saveTycoonState()`, `TYCOON_STORAGE_KEY`, tipos `TycoonState`, de `client/src/game/TycoonState.ts`.
- Produces: `installMemoryStorage(): { store: Map<string, string>; restore(): void }` en `test/helpers/storage.ts`, que define `globalThis.window` con un `localStorage` en memoria y devuelve una función para deshacerlo.

- [ ] **Step 1: Escribir el helper de almacenamiento y el test que falla**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { installMemoryStorage } from "./helpers/storage";
import { TYCOON_STORAGE_KEY, createInitialTycoonState, loadTycoonState, saveTycoonState } from "@/game/TycoonState";

const v1Snapshot = {
  version: 1,
  sector: "tycho",
  cycle: 5,
  resources: { energy: 40, oxygen: 50, water: 60, regolith: 70, data: 8 },
  capacity: { energy: 100, oxygen: 100, water: 100, regolith: 120, data: 160 },
  crew: { engineers: 2, scientists: 1, explorers: 1 },
  buildings: [{ id: "solar-1", kind: "solar", nodeId: "n-01", level: 1, integrity: 100, status: "online" }],
  research: ["water-loop"],
  alerts: [],
  expeditions: [],
  startedAt: 1,
  lastSavedAt: 1,
  legacyBonusData: 0,
};

afterEach(() => installMemoryStorage().restore());

describe("loadTycoonState", () => {
  it("migra un guardado v1 a v3 sin perder recursos ni edificios", () => {
    const storage = installMemoryStorage();
    storage.store.set(TYCOON_STORAGE_KEY, JSON.stringify(v1Snapshot));
    const state = loadTycoonState();
    expect(state.version).toBe(3);
    expect(state.sector).toBe("tycho");
    expect(state.resources.regolith).toBe(70);
    expect(state.buildings).toHaveLength(1);
    expect(state.research).toContain("water-loop");
    expect(state.campaigns["surface-pioneers"]).toBeDefined();
    expect(state.discoveries.length).toBeGreaterThan(0);
  });

  it("reconstruye la bitácora desde edificios e investigación cuando falta", () => {
    const storage = installMemoryStorage();
    storage.store.set(TYCOON_STORAGE_KEY, JSON.stringify({ ...v1Snapshot, version: 2 }));
    const state = loadTycoonState();
    expect(state.discoveries.some((entry) => entry.id === "legacy:module:solar-1")).toBe(true);
    expect(state.discoveries.some((entry) => entry.id === "legacy:research:water-loop")).toBe(true);
  });

  it("devuelve el estado inicial ante un JSON corrupto", () => {
    const storage = installMemoryStorage();
    storage.store.set(TYCOON_STORAGE_KEY, "{ esto no es json");
    expect(loadTycoonState()).toEqual(createInitialTycoonState());
  });

  it("conserva un guardado v3 con descubrimientos", () => {
    const storage = installMemoryStorage();
    const initial = createInitialTycoonState();
    const saved = saveTycoonState(initial);
    storage.store.set(TYCOON_STORAGE_KEY, JSON.stringify(saved));
    const state = loadTycoonState();
    expect(state.discoveries).toEqual(initial.discoveries);
  });
});

describe("saveTycoonState", () => {
  it("no lanza cuando localStorage no está disponible", () => {
    installMemoryStorage().restore();
    expect(() => saveTycoonState(createInitialTycoonState())).not.toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm vitest run test/tycoon-state.test.ts`
Expected: FAIL con "Cannot find module './helpers/storage'".

- [ ] **Step 3: Implementar `test/helpers/storage.ts`**

Exporta `installMemoryStorage()`: construye un `Map`, un objeto `localStorage` con `getItem`, `setItem`, `removeItem` y `clear`, lo asigna a `(globalThis as { window?: unknown }).window = { localStorage }`, y devuelve `{ store, restore }`. `restore()` borra la clave `window` del globalThis. Es idempotente.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm vitest run test/tycoon-state.test.ts`
Expected: PASS, 5 tests.

Si el test de "conserva un guardado v3" falla porque `initialDiscoveries` usa `Date.now()`, comparar sólo `id`, `kind` y `title` en lugar del arreglo completo.

- [ ] **Step 5: Commit**

```bash
git add test/helpers/storage.ts test/tycoon-state.test.ts
git commit -m "test: cubre migración v1/v2/v3 y corrupción de guardado"
```

---

## Task 3: Economía, construcción y bitácora

**Files:**
- Create: `test/economy.test.ts`
- Create: `test/building.test.ts`
- Create: `test/discovery.test.ts`

**Interfaces:**
- Consumes: `resourceRate(state)`, `advanceEconomy(state)` de `EconomyManager.ts`; `BUILDINGS`, `canBuild`, `constructBuilding`, `repairBuilding` de `BuildingManager.ts`; `recordDiscovery`, `recordDiscoveries`, `visibleDiscoveries`, `rarityForDiscovery`, `discoveryMatchesQuery` de `DiscoveryManager.ts`; `createInitialTycoonState` de `TycoonState.ts`.
- Produces: nada nuevo; sólo tests.

- [ ] **Step 1: Escribir los tres tests que fallan**

```ts
import { describe, expect, it } from "vitest";
import { advanceEconomy, resourceRate } from "@/game/EconomyManager";
import { constructBuilding, repairBuilding } from "@/game/BuildingManager";
import { recordDiscovery, visibleDiscoveries } from "@/game/DiscoveryManager";
import { createInitialTycoonState } from "@/game/TycoonState";

const base = () => createInitialTycoonState();

describe("advanceEconomy", () => {
  it("cierra el ciclo y suma la producción neta de energía", () => {
    const next = advanceEconomy(base());
    expect(next.cycle).toBe(2);
    expect(next.resources.energy).toBeCloseTo(63.2, 5);
  });
  it("no pasa del techo de capacidad", () => {
    const state = { ...base(), resources: { energy: 100, oxygen: 100, water: 100, regolith: 120, data: 160 } };
    expect(advanceEconomy(state).resources.regolith).toBe(120);
  });
  it("genera alerta de déficit cuando la red es negativa", () => {
    const state = { ...base(), buildings: base().buildings.filter((b) => b.kind !== "solar") };
    expect(resourceRate(state).energy).toBeLessThan(0);
  });
});

describe("constructBuilding", () => {
  it("descuenta el regolito y agrega el módulo", () => {
    const result = constructBuilding(base(), "solar", "n-03");
    expect(result.ok).toBe(true);
    expect(result.state.resources.regolith).toBe(32);
    expect(result.state.buildings).toHaveLength(3);
  });
  it("rechaza un nodo ocupado", () => {
    expect(constructBuilding(base(), "solar", "n-01").ok).toBe(false);
  });
  it("rechaza cuando falta regolito", () => {
    const state = { ...base(), resources: { ...base().resources, regolith: 4 } };
    const result = constructBuilding(state, "solar", "n-03");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Recursos insuficientes.");
  });
});

describe("repairBuilding", () => {
  it("restaura la integridad y cobra regolito", () => {
    const state = { ...base(), resources: { ...base().resources, regolith: 50 }, buildings: base().buildings.map((b) => ({ ...b, integrity: 55, status: "damaged" as const })) };
    const target = state.buildings[0];
    const result = repairBuilding(state, target.id);
    expect(result.ok).toBe(true);
    expect(result.state.resources.regolith).toBe(47);
    expect(result.state.buildings[0].integrity).toBe(100);
  });
  it("rechaza la reparación sin regolito suficiente", () => {
    const state = { ...base(), resources: { ...base().resources, regolith: 1 }, buildings: base().buildings.map((b) => ({ ...b, integrity: 55, status: "damaged" as const })) };
    expect(repairBuilding(state, state.buildings[0].id).ok).toBe(false);
  });
});

describe("visibleDiscoveries", () => {
  const seeded = () => {
    let state = base();
    state = recordDiscovery(state, { id: "a", kind: "research", title: "Circuito de agua", detail: "Agua regenerada.", reward: "Agua" });
    state = recordDiscovery(state, { id: "b", kind: "sector", title: "Cuenca de Selenita", detail: "Sector habilitado." });
    return state;
  };

  it("no duplica una entrada con el mismo id", () => {
    const once = recordDiscovery(base(), { id: "a", kind: "research", title: "X", detail: "Y" });
    const twice = recordDiscovery(once, { id: "a", kind: "research", title: "X", detail: "Y" });
    expect(twice.discoveries).toHaveLength(2);
  });
  it("combina filtro de tipo y de rareza", () => {
    const state = seeded();
    const result = visibleDiscoveries(state, "sector", "rare");
    expect(result.map((entry) => entry.id)).toEqual(["b"]);
  });
  it("devuelve vacío cuando el cruce no tiene coincidencias", () => {
    expect(visibleDiscoveries(seeded(), "milestone", "rare")).toEqual([]);
  });
  it("ordena por ciclo ascendente", () => {
    const state = recordDiscovery(recordDiscovery(base(), { id: "a", kind: "research", title: "A", detail: "a", cycle: 2 }), { id: "b", kind: "research", title: "B", detail: "b", cycle: 1 });
    expect(visibleDiscoveries(state, "all", "all", "cycle-asc").map((e) => e.id)).toEqual(["foundation:landing", "b", "a"]);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm vitest run test/economy.test.ts test/building.test.ts test/discovery.test.ts`
Expected: FAIL si alguna expectativa no coincide con el código real. **Importante:** estas expectativas describen el comportamiento actual; si una falla, verificar el código antes de tocar el test.

- [ ] **Step 3: Corregir las expectativas que el código real contradiga, documentando por qué**

Cada ajuste se anota en el commit. No se cambia código de producción en esta tarea.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm vitest run`
Expected: PASS, los tres archivos.

- [ ] **Step 5: Commit**

```bash
git add test/economy.test.ts test/building.test.ts test/discovery.test.ts
git commit -m "test: cubre economía, construcción y filtros de la bitácora"
```

---

## Task 4: Limpieza de código muerto y desacople de Manus

**Files:**
- Delete: `client/src/pages/Home.tsx`, `client/src/pages/NotFound.tsx`, `client/src/components/LeaderboardPanel.tsx`, `client/src/components/Map.tsx`, `client/src/components/ManusDialog.tsx`, `client/public/__manus__/`
- Delete: componentes de `client/src/components/ui/` sin importadores (se determina con el comando del Step 1)
- Modify: `vite.config.ts` (quitar `vitePluginManusRuntime`, `vitePluginManusDebugCollector`, `vitePluginManusStorageProxy`, el plugin `jsxLocPlugin` si sólo lo usa la plantilla, y `allowedHosts` de Manus)
- Modify: `client/index.html` (quitar analítica y favicon remoto; dejar título y fuentes locales)
- Modify: `client/src/game/assets.ts` (rutas locales bajo `/media/`)
- Modify: `client/src/game/BuildingManager.ts` (quitar las cinco rutas `/manus-storage` de `image`)
- Modify: `package.json` (quitar `vite-plugin-manus-runtime`, `@builder.io/vite-plugin-jsx-loc` si queda sin uso)
- Create: `client/public/media/` con marcadores locales

**Interfaces:**
- Consumes: `ASSET_URLS` existente.
- Produces: `ASSET_URLS` con claves locales; `BuildingDefinition.image` con rutas `/media/...`.

- [ ] **Step 1: Determinar qué componentes `ui/` no se usan**

Run: `rg -o 'components/ui/[a-z-]+' client/src --glob '!client/src/components/ui/**' | Sort-Object -Unique`
y para cada archivo de `ui/`, buscar su importador:
Run: `rg -l "components/ui/<nombre>" client/src`

Todo componente sin importadores se borra. Anotar la lista en el commit.

- [ ] **Step 2: Ejecutar `pnpm check` para fijar la línea base**

Run: `pnpm check`
Expected: sin errores. Si los hay, se corrigen antes de borrar nada.

- [ ] **Step 3: Borrar los archivos sin uso y verificar**

Run: `pnpm check && pnpm build`
Expected: ambos pasan.

- [ ] **Step 4: Sacar Manus de `vite.config.ts` y `index.html`**

Quitar los tres plugins de Manus y los `allowedHosts` de dominios Manus. En `index.html`, quitar el `<script>` de analítica y el `<link rel="icon">` remoto. `pnpm build` debe seguir funcionando.

- [ ] **Step 5: Localizar los recursos en `client/public/media/`**

Crear marcadores lícitos y ligeros: un PNG de 1×1 o un SVG por cada entrada de `ASSET_URLS` y por cada `image` de `BUILDINGS`. Reescribir `assets.ts` y `BuildingManager.ts` para apuntar a `/media/<nombre>`.

Run: `rg -n "manus-storage" client server vite.config.ts`
Expected: sin resultados.

- [ ] **Step 6: Autoalojar las dos familias tipográficas**

Descargar los `woff2` de Barlow Condensed (400 y 600) y Space Grotesk (400 y 600) desde `fonts.gstatic.com`, guardarlos en `client/public/fonts/` con su licencia OFL al lado, declarar `@font-face` en `client/src/index.css` y quitar los `<link>` a `fonts.googleapis.com` de `index.html`.

Run: `rg -n "fonts.googleapis|fonts.gstatic" client`
Expected: sin resultados.

- [ ] **Step 7: Verificar que el juego arranca sin 404**

Run: `pnpm dev` y abrir `http://localhost:3000`
Expected: la base carga, no hay errores de consola y la pestaña de red no muestra 404.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: retira plantilla, código muerto y dependencia de Manus"
```

---

## Task 5: README, LICENSE y créditos de recursos

**Files:**
- Create: `LICENSE`
- Create: `README.md`
- Modify: `ASSETS.md`
- Modify: `package.json` (confirmar `license: "MIT"`)

**Interfaces:** ninguno; sólo documentación.

- [ ] **Step 1: Crear `LICENSE`**

MIT, año 2026, titular `traderxael`.

- [ ] **Step 2: Escribir `README.md`**

Secciones, en este orden: título y una línea de qué es; estado actual del proyecto; cómo ejecutarlo (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`); controles; arquitectura (tabla de módulos y límite React/Babylon); cómo contribuir; licencia; créditos de recursos. Versión en español y versión en inglés en secciones separadas.

- [ ] **Step 3: Actualizar `ASSETS.md`**

Añadir una tabla con: archivo, tipo, origen, licencia y si es provisional. Los marcadores de la fase 1 quedan marcados como **provisional, se reemplaza en la fase 5**.

- [ ] **Step 4: Verificar los enlaces internos del README**

Run: `rg -o '\]\(([^)]+)\)' README.md`
Expected: cada ruta existe en el repositorio.

- [ ] **Step 5: Commit**

```bash
git add LICENSE README.md ASSETS.md package.json
git commit -m "docs: README, licencia y créditos de recursos"
```

---

## Task 6: ESLint y CI

**Files:**
- Create: `eslint.config.js`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (script `lint`, devDependencies `eslint`, `typescript-eslint`)
- Create: `.github/pull_request_template.md`

**Interfaces:** ninguno.

- [ ] **Step 1: Instalar ESLint plano**

Run: `pnpm add -D eslint typescript-eslint`
Expected: `eslint.config.js` es el formato soportado por ESLint 9.

- [ ] **Step 2: Escribir `eslint.config.js`**

Config plana con `typescript-eslint` recomendado, ignores para `dist/`, `node_modules/` y `client/src/components/ui/`, y la regla `no-restricted-imports` que prohíbe `@babylonjs/*` en `client/src` a partir de esta fase. El error debe ser visible antes de la migración.

- [ ] **Step 3: Correr el linter y resolver lo que aparezca**

Run: `pnpm lint`
Expected: exit 0. Los hallazgos se corrigen o se justifican en el commit.

- [ ] **Step 4: Escribir `.github/workflows/ci.yml`**

En `push` y `pull_request`: `pnpm/action-setup` con la versión de `packageManager`, `actions/setup-node` con caché de pnpm, y luego `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build`.

- [ ] **Step 5: Verificar la sintaxis del workflow**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!y.includes('pnpm test')) process.exit(1)"`
Expected: exit 0. (No hay runner local; la validación real ocurre en el primer push.)

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js .github package.json pnpm-lock.yaml
git commit -m "ci: lint, tests y build en cada push y PR"
```

---

## Notas para el ejecutor

- **Orden obligatorio:** las tareas 1–3 crean la red de tests; la tarea 4 borra código. Si se invierte, se pierde la capacidad de detectar una regresión al borrar.
- **Vitest y `tsconfig`:** el `exclude` actual deja los tests fuera del tipado. La tarea 1 lo corrige; sin eso, `pnpm check` no ve los tests y un error de tipos pasa a producción.
- **Recursos provisionales:** la fase 1 no trae los modelos reales. Los marcadores evitan el 404, que es un anti-objetivo del spec, y quedan documentados como provisionales.
- **Sin audio ni Three.js en esta fase.** Cualquier dependencia nueva fuera de ESLint se consulta antes.