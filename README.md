# Lunar Rover Expedition

Juego web 3D de exploración y gestión lunar. Conduces un rover por la superficie,
recoges muestras científicas, administras la energía y usas lo que traes para levantar y
investigar una base en la Luna.

![estado](https://img.shields.io/badge/estado-en%20desarrollo-amber)
![licencia](https://img.shields.io/badge/licencia-MIT-4ABDC0)

---

## Español

### Qué es

Un juego de navegador, sin instalación y sin backend. Dos capas:

- **La superficie**: conduces un rover con inercia en baja gravedad, recoges muestras,
  esquivas cráteres y tormentas de polvo, y vuelves antes de quedarte sin energía.
- **La base**: con lo que traes construyes módulos, investigas tecnologías, diriges
  campañas científicas y desbloqueas sectores nuevos.

### Cómo ejecutarlo

Requisitos: Node.js 20 o superior y pnpm 10.

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Otros comandos:

```bash
pnpm build      # build de producción
pnpm preview    # sirve el build
pnpm check      # tipos
pnpm test       # tests
pnpm lint       # lint
```

### Controles

| Acción | Teclado |
|---|---|
| Acelerar / retroceder | `W` `S` o `↑` `↓` |
| Girar | `A` `D` o `←` `→` |
| Impulso | `Espacio` |
| Reiniciar misión | `R` |
| Pausa | `Esc` |

### Arquitectura

React monta una única superficie a pantalla completa. La simulación es TypeScript sin
React, separada del motor de render.

| Capa | Módulos | Responsabilidad |
|---|---|---|
| Interfaz | `components/`, `pages/` | Pantallas, HUD y controles. |
| Reglas | `TycoonState`, `EconomyManager`, `BuildingManager`, `ResearchManager`, `CampaignManager`, `DiscoveryManager`, `ExpeditionManager`, `SectorManager`, `Progression`, `DemoManager` | Estado serializable, economía, construcción, investigación, campañas, bitácora y progresión. Sin dependencias del motor. |
| Render | `three/engine.ts`, `three/base.ts`, `three/terrain.ts`, `three/sky.ts`, `three/models.ts`, `three/input.ts` | Escena 3D sobre Three.js: renderer, terreno, cielo, modelos y entrada. |

La persistencia vive en `localStorage` con estado versionado y migración no destructiva
(`lunar-science-base-tycoon-v1`).

### Cómo contribuir

1. Haz un fork y crea una rama.
2. `pnpm install` y `pnpm test` antes de abrir el PR.
3. Mantén las reglas de juego fuera de React: si una decisión de simulación aparece en un
   componente, va en un manager.
4. Describe qué verificaste.

### Estado del proyecto

La versión actual incluye misiones de conducción en Three.js, progresión entre
sectores y gestión de una base científica. El progreso se guarda localmente en
el navegador; no hay cuentas ni sincronización en la nube.

### Licencia

MIT. Ver [LICENSE](LICENSE).

### Créditos de recursos

Ver [ASSETS.md](ASSETS.md).

---

## English

### What it is

A browser game, no install and no backend. Two layers:

- **The surface**: you drive a rover with low-gravity inertia, collect samples, avoid
  craters and dust storms, and return before your energy runs out.
- **The base**: what you bring back funds modules, research, science campaigns and new
  sectors.

### Running it

Requirements: Node.js 20+ and pnpm 10.

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

### Controls

| Action | Keyboard |
|---|---|
| Accelerate / reverse | `W` `S` or `↑` `↓` |
| Steer | `A` `D` or `←` `→` |
| Boost | `Space` |
| Restart mission | `R` |
| Pause | `Esc` |

### Architecture

React mounts a single full-screen surface. The simulation is React-free TypeScript,
separated from the render engine.

| Layer | Modules | Responsibility |
|---|---|---|
| Interface | `components/`, `pages/` | Screens, HUD and controls. |
| Rules | `TycoonState`, `EconomyManager`, `BuildingManager`, `ResearchManager`, `CampaignManager`, `DiscoveryManager`, `ExpeditionManager`, `SectorManager`, `Progression`, `DemoManager` | Serializable state, economy, building, research, campaigns, discovery log and progression. No engine dependency. |
| Render | `three/engine.ts`, `three/base.ts`, `three/terrain.ts`, `three/sky.ts`, `three/models.ts`, `three/input.ts` | 3D scene on Three.js: renderer, terrain, sky, models and input. |

Persistence lives in `localStorage` with versioned state and non-destructive migration
(`lunar-science-base-tycoon-v1`).

### Contributing

1. Fork and create a branch.
2. Run `pnpm install` and `pnpm test` before opening a PR.
3. Keep game rules out of React: if a simulation decision shows up in a component, it
   belongs in a manager.
4. Say what you verified.

### License

MIT. See [LICENSE](LICENSE).

### Asset credits

See [ASSETS.md](ASSETS.md).