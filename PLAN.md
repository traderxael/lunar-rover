# Plan de juego: Lunar Rover Expedition

## Tareas de riesgo

### 1. Movimiento con inercia en baja gravedad y cámara de persecución

- **Por qué se aísla:** La conducción debe sentirse flotante pero controlable sin depender de complementos de física externos ni producir deslizamientos imposibles de recuperar. A la vez, la cámara ha de conservar al rover dentro de una composición legible.
- **Enfoque:** Usar un modelo cinemático determinista: aceleración y frenado vectoriales sobre el plano XZ, fricción gradual, límite de velocidad y orientación interpolada hacia el vector de marcha. La cámara ArcRotate seguirá un objetivo suavizado y tendrá una vista cenital-oblicua fija, evitando colisiones complejas.
- **Verificar:** Al mantener y soltar adelante/atrás/izquierda/derecha, el rover acelera, gira y desacelera con transición continua; no tiembla, no rota de forma brusca y siempre queda visible en la cámara.

### 2. Terreno lunar y objetivo de exploración procedurales

- **Por qué se aísla:** Los cráteres, las rocas y las muestras deben dar un paisaje convincente sin que el rover atraviese el suelo ni que los objetivos aparezcan inaccesibles.
- **Enfoque:** Aplicar una malla de terreno con altura matemática suave y colocar cráteres decorativos, rocas, balizas y muestras en posiciones fijas reproducibles sobre la altura evaluada. Las muestras se recogen por radio de proximidad y actualizan un objetivo secuencial.
- **Verificar:** El rover se apoya visualmente sobre el terreno, las rocas no cubren los coleccionables, cada muestra puede alcanzarse y el contador se incrementa exactamente una vez al recogerla.

## Construcción principal

Se creará un juego 3D de navegador de pantalla completa donde el jugador conduce un rover lunar para recolectar cinco muestras científicas antes de agotar su energía. Los controles de flechas o WASD gestionan avance, reversa y dirección; Espacio activa un breve impulso de reserva; R reinicia la misión. Las decisiones de ruta importan porque el desplazamiento y el impulso consumen energía. La interfaz muestra energía, muestras, distancia al objetivo, cronómetro, estado de misión y una explicación accesible de los controles.

- **Recursos necesarios:** Una imagen de referencia de la escena, textura de regolito para el terreno, una calcomanía técnica para el rover y paneles, y un emblema transparente de la misión para la cabecera y el favicon.
- **Verificar:**
  - Las flechas y WASD mueven el rover en la dirección indicada; Espacio activa el impulso y R reinicia.
  - Las transiciones de aceleración, giro, inercia y frenado son suaves y responden a la entrada.
  - La energía baja al conducir y al usar el impulso; llegar a cero concluye la misión; recolectar cinco muestras muestra una victoria.
  - El HUD permanece legible, no se superpone en pantallas de escritorio ni móvil y describe controles y objetivo.
  - El terreno, las muestras, el rover y la baliza se ven con materiales intencionales, sin recursos ausentes ni colores de reserva.
  - La escena coincide con la referencia: cámara elevada oblicua, paleta grafito/marfil, acentos cian y ámbar, y densidad de objetos moderada.
  - No hay errores en la consola durante una partida y la captura muestra jugabilidad real mediante el modo `?demo`.

## Expansión de mapas — agosto de 2026

| Mapa | Carácter de exploración | Riesgo principal | Requisito de verificación |
|---|---|---|---|
| **Mare Tranquillitatis** | Ruta introductoria, amplia y estable, con cráteres suaves y visibilidad clara. | Navegación entre rocas y pequeños desniveles. | El jugador puede iniciar, recoger muestras y aprender los controles sin penalización ambiental. |
| **Fosa de Tycho** | Cuenca de roca pálida interrumpida por tres cráteres profundos de bordes muy empinados. | Entrar en una zona de cráter profundo reduce velocidad y drena la energía; la ruta segura bordea los anillos ámbar. | Las áreas de riesgo se ven antes de entrar, modifican el manejo y pueden evitarse por completo. |
| **Cuenca de Selenita** | Paisaje oscuro, compacto y con una tormenta de polvo transversal que avanza en oleadas. | La tormenta reduce parcialmente la visibilidad, atenúa la telemetría y aumenta el consumo en los tramos expuestos. | Las partículas cruzan el campo de juego de forma continua, no bloquean los controles y el estado de tormenta se lee en HUD. |

La selección de mapa estará disponible antes de iniciar la misión. Cada mapa redefine el punto de partida, las muestras, las rocas, las cavidades y el tono de iluminación; no será un mero cambio cosmético.

## Progresión de sectores

| Sector | Estado inicial | Condición de acceso | Evaluación de desempeño |
|---|---|---|---|
| **Mare Tranquillitatis** | Disponible. | Ninguna. | La misión registra tiempo, energía restante y grado. |
| **Fosa de Tycho** | Bloqueado. | Obtener **grado B o superior** en Mare Tranquillitatis. | B exige completar las cinco muestras con al menos 30 % de energía y dentro de 2:30 min; A y S exigen mayor reserva y menor tiempo. |
| **Cuenca de Selenita** | Bloqueado. | Obtener **grado B o superior** en Fosa de Tycho. | La misma escala premia ruta eficiente y energía, con el riesgo adicional de los cráteres. |

El progreso se guarda en el navegador. Al completar una misión se conservará el mejor grado, la mayor energía de llegada y el mejor tiempo, de modo que una recarga no elimina los sectores ya desbloqueados. La interfaz debe describir con precisión qué falta para habilitar cada sector y anunciar inmediatamente un nuevo desbloqueo.

## Tycoon de Base Científica Lunar — vertical slice

La expansión cambia el bucle central a construir, abastecer, investigar y explorar. El alcance inicial incluye cinco módulos (plataforma solar, hábitat, laboratorio, extractora y antena), cuatro recursos (energía, oxígeno, agua, regolito), una expedición de rover y cuatro nodos tecnológicos. Los mapas existentes pasan a ser sectores de asentamiento con requisitos de infraestructura y resistencia ambiental.

### Riesgos y prueba

| Riesgo | Enfoque | Verificación |
|---|---|---|
| Simulación y persistencia | Estado serializable versionado con migración no destructiva de progresión actual. | Recarga conserva base, récords y medallas sin estados inválidos. |
| Colocación y economía | Nodos finitos, producción por ciclo y consumo explícito por edificio. | La colocación valida coste y nodo; energía visible cambia según la red. |
| Integración rover–base | La expedición entrega materiales y datos al estado de base. | Una expedición completada desbloquea o financia al menos una investigación. |

**Activos asignados:** referencia visual del tycoon, hábitat, laboratorio, extractora y campo solar documentados en `ASSETS.md`. Los módulos físicos se construirán con geometría procedural y las imágenes aparecerán en las tarjetas de catálogo y bitácora.

## Desafíos secundarios de exploración

| Mapa | Desafío opcional | Acción | Reconocimiento |
|---|---|---|---|
| **Mare Tranquillitatis** | **Balizas de calibración** | Registrar tres balizas de trayectoria alejadas de la ruta principal. | *Cartógrafo de superficie*. |
| **Fosa de Tycho** | **Lectura de bordes** | Inspeccionar tres estaciones junto a los perímetros de cráter profundo sin cruzar sus zonas de riesgo. | *Topógrafo de Tycho*. |
| **Cuenca de Selenita** | **Muestreo eólico** | Recuperar tres sondas anemométricas mientras la tormenta de polvo está activa. | *Analista de selenita*. |

Estos objetivos no condicionan el grado ni el desbloqueo de sectores. Cada uno se puede recoger en cualquier orden y queda registrado de forma local como el mejor avance del sector, con un reconocimiento en el informe final para estimular rutas alternativas.

## Clasificación local de expediciones

Cada finalización exitosa genera una entrada local con sector, grado, puntuación, tiempo, energía y desafío auxiliar. La puntuación se calcula como **(1.000 + energía restante × 10 + hitos auxiliares × 300 + bonificación de grado − segundos de misión × 3) × dificultad del sector**, limitada a cero. Las bonificaciones son S = 900, A = 600, B = 350 y C = 100; los multiplicadores de dificultad son 1,00 para Tranquillitatis, 1,25 para Tycho y 1,50 para Selenita.

La tabla mantiene las 15 mejores expediciones locales y ordena por puntuación descendente, menor tiempo y mayor energía. Puede filtrarse por sector y no contiene datos simulados: antes de completar una expedición presentará un estado vacío claro.

## Medallas de récord de sector

La clasificación añade medallas calculadas a partir de los registros existentes, sin modificar ni inventar datos. Para cada sector, el primer, segundo y tercer mejor resultado reciben respectivamente **Insignia de Órbita I**, **Insignia de Órbita II** e **Insignia de Órbita III**. La prioridad sigue el mismo orden de la tabla: puntuación más alta, menor tiempo, mayor energía y, finalmente, registro más reciente.

Las insignias se representan como sellos instrumentales de tres metales (ámbar mineral, cian plateado y cobre lunar) con números romanos y etiqueta accesible. En la vista general, cada entrada compite solo contra expediciones del mismo sector; al filtrar un sector, se mantienen las mismas medallas y su explicación visible.

## Campañas científicas de largo plazo

La base añade tres programas de investigación persistentes y secuenciales. **Pioneros de superficie** requiere Autonomía de rover y convierte retornos, regolito y datos en una mejora de carga; **Protocolo de cooperación** exige laboratorio conjunto, laboratorio y antena para estabilizar datos y ampliar reserva; **Ciclo de recursos lunares** requiere Circuito de agua, dos solares y Selenita para validar agua y resistencia al polvo. Sólo un programa puede permanecer activo, sus hitos cuentan desde la activación y sus recompensas se aplican una única vez.

| Riesgo | Enfoque | Verificación |
|---|---|---|
| Duplicación de recompensas | Línea base de métricas al iniciar y marca persistente de recompensa reclamada. | Recargar o cerrar ciclos consecutivos no aumenta dos veces bonos ni capacidad. |
| Compatibilidad de partidas | Evolución del estado de base desde v1 a v2 bajo la misma clave local. | Módulos, recursos, sector, tecnologías y expediciones existentes se conservan. |
| Lectura de objetivos | Archivo con pestañas de tecnologías/campañas y monitor breve en operaciones. | Cada programa muestra requisito, hito actual, progreso y efecto antes de iniciarse. |

La implementación mantiene la cronología internacional como contexto educativo y utiliza sellos abstractos propios, documentados en `ASSETS.md`, sin emblemas institucionales ni referencias de patrocinio. El modo `?demo` activa el programa de Selenita para que una captura muestre el avance por ciclos, el rover y una recompensa concluida.

## Historial visual de descubrimientos

El Archivo científico incorpora una tercera vista para la historia propia de cada base. El registro conserva instalaciones, reparaciones, investigaciones, accesos a sector, retornos del rover, inicio e hitos de campañas, y recompensas permanentes. Cada entrada tiene un identificador estable, tipo, ciclo, marca temporal, descripción y recompensa opcional; se ordena de lo más reciente a lo más antiguo y se limita a 80 eventos para no degradar el guardado local.

| Riesgo | Enfoque | Verificación |
|---|---|---|
| Eventos repetidos | Un gestor puro descarta entradas con el mismo identificador antes de persistirlas. | Reabrir, recargar o cerrar ciclos no duplica una recompensa ni un hito. |
| Partidas existentes | El estado v3 normaliza un historial previo o lo reconstruye desde infraestructura, investigación y campañas completadas. | Una partida v1/v2 conserva sus recursos y recibe una bitácora legible al primer inicio. |
| Lectura visual | Filtros por tipo, una ruta cronológica y un panel de detalle separan listas densas de la recompensa seleccionada. | El historial es navegable con teclado y conserva legibilidad tanto en escritorio como en móvil. |

El modo `?demo` siembra una bitácora de Selenita con módulos, ciencia, sector, hitos, retornos y dos recompensas. Al avanzar, agrega eventos deterministas para presentar el historial en una captura sin tocar partidas reales.

### Marcadores de rareza

La bitácora añade cuatro escalas de relevancia: **Señal**, **Notable**, **Raro** e **Hito mayor**. La regla se deriva centralmente del tipo de evento y puede guardarse en la entrada nueva; los eventos previos sin este campo reciben la misma clasificación al leerse. Cada escala se representa con texto, un glifo y contraste propio para que la importancia siga siendo perceptible sin depender del color.

#### Filtro de rareza

El historial añade un segundo selector para **Todas**, **Señal**, **Notable**, **Raro** e **Hito mayor**. Este selector se combina con el filtro de tipo existente, no lo reemplaza. Si una intersección no tiene eventos, la interfaz conserva los controles y ofrece una instrucción para modificar cualquiera de los dos criterios.
