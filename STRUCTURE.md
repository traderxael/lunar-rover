# Arquitectura — Lunar Rover Expedition

El proyecto conserva una separación estricta entre el marco de React y la simulación de Babylon. React monta una única superficie de juego a pantalla completa. `GameCanvas` sólo administra el ciclo de vida del motor: crear una vez, responder a cambios de tamaño y liberar listeners y escenas al desmontarse. Toda la mecánica permanece como TypeScript sin React en `client/src/game/`.

| Módulo | Responsabilidad | Elementos Babylon que posee |
|---|---|---|
| `scene.ts` | Construye la escena, conecta actualizaciones, expone `GameHandle` y garantiza limpieza. | Escena, cámara, luces, cielo y observables. |
| `GameWorld.ts` | Mantiene el estado de misión, energía, cronómetro, muestras y condiciones de éxito o fallo. | Terreno, baliza, decoraciones, instancias de muestras. |
| `MissionMap.ts` | Declara las configuraciones reproducibles de Mare Tranquillitatis, Fosa de Tycho y Cuenca de Selenita. | Ninguno; provee semilla de terreno, ruta, obstáculos y estado climático. |
| `Rover.ts` | Procesa acciones semánticas y aplica aceleración, inercia, orientación y propulsión. | Chasis, ruedas, antena, luces, estela de polvo. |
| `DustStorm.ts` | Anima planos de polvo orientados a la cámara y ajusta la atmósfera de los mapas con tormenta. | Nubes de polvo y sus materiales. |
| `InputManager.ts` | Traduce teclado y botones táctiles a acciones como avanzar, girar, impulso y reiniciar. | Ninguno; se conecta al `window`. |
| `Hud.ts` | Renderiza telemetría HTML, estados de misión y señales de recolección, separado de las reglas del juego. | Ninguno; usa un contenedor HTML superpuesto. |
| `terrain.ts` | Calcula la altura del suelo y genera una malla con cráteres suaves. | Malla de terreno y materiales. |

## Flujo de actualización

En cada fotograma, la escena consulta `InputManager`, `Rover` integra posición y rotación con un delta limitado, `GameWorld` comprueba radio de recolección, consumo de energía y perímetros de cráter profundo, y `Hud` refleja el estado resultante. En Fosa de Tycho, penetrar el perímetro de un cráter profundo reposiciona al rover sobre el borde seguro, reduce velocidad y aplica drenaje temporal. En Cuenca de Selenita, `DustStorm` actualiza partículas y añade drenaje de energía por desplazamiento. Los objetos decorativos no participan en física; están anclados a una altura calculada y su finalidad es aportar lectura espacial. La escena tiene estados explícitos: `briefing`, `active`, `success` y `depleted`.

## Sugerencias de recursos

El terreno será una malla procedural de 140 × 140 m con repetición UV de la textura de regolito cada 24 m. El rover se construirá con primitivas compuestas para mantener claridad y rendimiento; la calcomanía técnica se coloca en sus paneles. Las muestras y la baliza se distinguen con materiales emisivos programáticos ámbar/cian, que siguen la misma guía visual sin exigir modelos externos.

## Arquitectura de expansión — Lunar Science Base Tycoon

El juego evoluciona de un flujo de misión lineal a una simulación de base persistente. La interfaz de React será el marco de control (recursos, construcción, investigación, bitácora e historial); Babylon continuará siendo el lienzo de la base y del rover. Las reglas siguen siendo clases TypeScript sin React, comunicadas por snapshots serializables.

| Módulo nuevo o ampliado | Responsabilidad | Persistencia |
|---|---|---|
| `TycoonState` | Fuente de verdad para ciclo, sector, recursos, módulos, tripulación, investigación y expediciones. | Guardado versionado `lunar-science-base-tycoon-v1`. |
| `EconomyManager` | Produce/consume recursos por ciclo, calcula alertas y evita valores negativos. | Recursos, estado de red y alertas. |
| `BuildingManager` | Valida nodos, coste, conexión energética, colocación, mejoras y reparación de módulos. | Instancias de construcción, nivel, integridad y nodo. |
| `ResearchManager` | Controla las cuatro ramas tecnológicas, requisitos, efectos y las referencias históricas del codex. | Tecnologías desbloqueadas y datos científicos. |
| `ExpeditionManager` | Coordina el rover manual/automático con los recursos entregados al asentamiento. | Estado, duración, resultados y carga de expedición. |
| `BaseWorld` | Propietario Babylon de las mallas de edificios, conectores, nodos y alertas del mapa. | Reconstruye mallas a partir de `TycoonState`, no almacena reglas. |
| `DemoManager` | Crea un snapshot de exhibición válido y avanza ciclos/expediciones de forma determinista para `?demo`. | No escribe almacenamiento local. |
| `TycoonHud` | Contrato de lectura para recursos, selección, construcción, investigación, alertas y bitácora. | No persiste: recibe snapshots del estado. |

### Riesgos aislados y verificación

1. **Migración de partidas:** los récords, medallas y desbloqueos actuales no se eliminan. El primer arranque crea el guardado de base por separado y migra los logros disponibles como bonificaciones de datos. **Verificación:** un progreso previo sigue disponible tras recargar y no aparecen valores `NaN` o estructuras corruptas.
2. **Colocación por nodos y red de energía:** cada módulo se debe colocar sólo en nodos libres y la energía debe actualizarse sin crear un bucle de recursos negativo. **Verificación:** construir solar antes de laboratorio habilita el laboratorio; desactivar la red muestra alerta y limita la producción sin bloquear la partida.
3. **Sincronía escena–interfaz:** Babylon y los paneles de React deben reflejar la misma base persistente. **Verificación:** colocar, mejorar o reparar un módulo cambia el inventario, su malla y la barra de recursos en un ciclo de simulación.
4. **Progreso del rover:** las expediciones se consumen y resuelven mediante ciclos operativos, no por un intervalo de pared. **Verificación:** cada cierre reduce el contador de tres ciclos y la carga se acredita una sola vez al llegar a cero.
5. **Modo de verificación:** `?demo` parte de un estado rico no persistente y alterna pasos deterministas. **Verificación:** una captura sin interacción muestra terreno, módulos, instrumentos, sectores desbloqueados y rover en ruta o carga recibida.

El sistema evita física compleja, navegación de multitudes, modelos GLB e IA opaca. Los edificios se representarán con primitivas de Babylon y texturas generadas para mantener rendimiento y control visual.
