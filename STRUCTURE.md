# Arquitectura — Lunar Rover Expedition

El proyecto conserva una separación estricta entre el marco de React y la simulación de Babylon. React monta una única superficie de juego a pantalla completa. `GameCanvas` sólo administra el ciclo de vida del motor: crear una vez, responder a cambios de tamaño y liberar listeners y escenas al desmontarse. Toda la mecánica permanece como TypeScript sin React en `client/src/game/`.

| Módulo | Responsabilidad | Elementos Babylon que posee |
|---|---|---|
| `scene.ts` | Construye la escena, conecta actualizaciones, expone `GameHandle` y garantiza limpieza. | Escena, cámara, luces, cielo y observables. |
| `GameWorld.ts` | Mantiene el estado de misión, energía, cronómetro, muestras y condiciones de éxito o fallo. | Terreno, baliza, decoraciones, instancias de muestras. |
| `Rover.ts` | Procesa acciones semánticas y aplica aceleración, inercia, orientación y propulsión. | Chasis, ruedas, antena, luces, estela de polvo. |
| `InputManager.ts` | Traduce teclado y botones táctiles a acciones como avanzar, girar, impulso y reiniciar. | Ninguno; se conecta al `window`. |
| `Hud.ts` | Renderiza telemetría HTML, estados de misión y señales de recolección, separado de las reglas del juego. | Ninguno; usa un contenedor HTML superpuesto. |
| `terrain.ts` | Calcula la altura del suelo y genera una malla con cráteres suaves. | Malla de terreno y materiales. |

## Flujo de actualización

En cada fotograma, la escena consulta `InputManager`, `Rover` integra posición y rotación con un delta limitado, `GameWorld` comprueba radio de recolección y consumo de energía, y `Hud` refleja el estado resultante. Los objetos decorativos no participan en física; están anclados a una altura calculada y su finalidad es aportar lectura espacial. La escena tiene estados explícitos: `briefing`, `active`, `success` y `depleted`.

## Sugerencias de recursos

El terreno será una malla procedural de 140 × 140 m con repetición UV de la textura de regolito cada 24 m. El rover se construirá con primitivas compuestas para mantener claridad y rendimiento; la calcomanía técnica se coloca en sus paneles. Las muestras y la baliza se distinguen con materiales emisivos programáticos ámbar/cian, que siguen la misma guía visual sin exigir modelos externos.

