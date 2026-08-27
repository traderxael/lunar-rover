# Dirección de diseño — Lunar Rover Expedition

## Tres enfoques explorados

### Theme Name: Bitácora de Exploración Analógica

**Very Brief Intro:** Una travesía lunar con la presencia gráfica de una misión científica de campo: tonos minerales, cartografía y telemetría precisa. La atmósfera debe sentirse silenciosa, tangible y deliberada.

**Probability:** 0.07

### Theme Name: Archivo Orbital Modernista

**Very Brief Intro:** Un lenguaje editorial inspirado en archivos aeroespaciales y señalética técnica, con composición tipográfica grande y bloques informativos sobrios. Convierte la exploración en una pieza visual de museo contemporáneo.

**Probability:** 0.03

### Theme Name: Maqueta de Misión en Color

**Very Brief Intro:** Un mundo de formas suavemente modeladas, contraste de colores cálidos y movimientos juguetones, como una maqueta de ingeniería animada. Prioriza accesibilidad, legibilidad y una energía optimista.

**Probability:** 0.08

## Enfoque seleccionado: Bitácora de Exploración Analógica

### Design Movement

La dirección se inspira en **la visualización científica de la era Apolo, la cartografía de relieve y el instrumentalismo técnico contemporáneo**. En lugar de ciencia ficción brillante, el juego se presenta como una misión de terreno: un mundo nocturno de carbón y mineral, iluminado por indicadores ámbar, cian y marfil.

### Core Principles

1. **Exploración legible:** Cada roca, baliza, cráter y ruta debe dar información útil y tener una silueta inequívoca desde la cámara isométrica.
2. **Tecnología con materia:** Las superficies combinan polvo, aluminio cepillado y retículas cartográficas; los paneles flotantes evocan una bitácora de misión, nunca un tablero corporativo genérico.
3. **Ritmo de expedición:** El espacio vacío lunar, la lenta inercia y las pausas al recolectar muestras hacen que avanzar tenga peso.
4. **Información antes que ornamento:** La telemetría guía, confirma decisiones y comunica riesgo con señales pequeñas y de alto contraste.

### Color Philosophy

La oscuridad azul-negra representa el vacío y permite que el terreno gris cálido conserve volumen. El **ámbar de señal** comunica propulsión, objetivos y estado crítico sin recurrir a efectos de neón; el cian frío se reserva para navegación y energía estable. El marfil de los textos se usa con moderación, como tinta sobre un cuaderno técnico. La firma cromática propia es **ámbar selenita (`#F3A533`)**, un color mineral y reconocible que nombra la misión sin parecer una alerta permanente.

### Layout Paradigm

La pantalla se organiza como una **vista de misión enmarcada por instrumentos**, no como una página web. El juego ocupa el lienzo completo; una barra de telemetría corre verticalmente a la izquierda, los controles y objetivo aparecen en una tarjeta baja a la derecha y las alertas se sitúan cerca del horizonte del juego. La jerarquía fluye desde el paisaje y la ruta hacia las mediciones periféricas.

### Signature Elements

1. **Arcos de exploración** en ámbar, dibujados sobre los objetivos y balizas para revelar la ruta hacia la siguiente muestra.
2. **Retícula de bitácora** muy sutil sobre la interfaz, similar a papel técnico y curvas de nivel.
3. **Puntos de polvo suspendido** y trazas de las ruedas que materializan la gravedad reducida sin ocultar el terreno.

### Interaction Philosophy

Las acciones deben sentirse mecánicas y claras: acelerar genera respuesta inmediata y una pequeña estela de polvo; soltar el control permite una desaceleración larga por la inercia lunar; recolectar una muestra activa un breve pulso en el HUD y un cambio visible en el contador. La pantalla de inicio introduce la misión sin bloquear al jugador: un solo botón inicia y los controles se muestran en contexto.

### Animation

El paisaje tiene movimiento mínimo: parpadeo lento de estrellas, polvo discreto en los giros y antena oscilando suavemente. Los elementos de interfaz aparecen en 180–240 ms usando desplazamiento corto y opacidad, con curvas nítidas. Las lecturas numéricas actualizan sin sacudidas; únicamente los estados críticos usan pulsos lentos. Se respetará `prefers-reduced-motion`.

### Typography System

**Barlow Condensed** construye los números y títulos de telemetría, con pesos 600–800 y tracking visible. **Space Grotesk** es la fuente de lectura y microcopy, en pesos 400–600. Los objetivos van en mayúsculas compactas; las etiquetas usan tamaño pequeño y espaciado amplio; los valores se muestran grandes, monoespaciados visualmente y con unidades alineadas.

### Brand Essence

**Lunar Rover Expedition es una misión de conducción científica para personas que quieren convertir la exploración lunar en una secuencia de decisiones físicas y visibles.** Sus adjetivos de personalidad son **metódica**, **silenciosa** y **resuelta**.

### Brand Voice

La voz es precisa, escueta y orientada a la acción; usa verbos operativos y datos concretos, no promesas genéricas. Ejemplos: “**Cartografía activa. La próxima muestra está al este.**” y “**La energía cae: elige la ruta con cuidado.**”

### Wordmark & Logo

El logotipo se construye con un **cráter orbital discontinuo** que envuelve una pequeña silueta de rover y deja una apertura orientada hacia la ruta. El símbolo no incluye texto y funciona como emblema en la cabecera y como favicon. El wordmark usa Barlow Condensed con una separación amplia entre “LUNAR” y “ROVER”, más el subtítulo pequeño “EXPEDITION”.

### Signature Brand Color

**Ámbar selenita — `#F3A533`.**

## Style Decisions

La primera vista siempre debe mostrar artefactos inequívocos de misión, entre ellos la silueta del rover, el terreno, un panel de telemetría, el marcador de objetivo o el emblema de cráter orbital; el vacío puro no constituye una pantalla completa. La jerarquía fija es paisaje y ruta primero, telemetría después y controles al final. Barlow Condensed se reserva para títulos y valores, mientras Space Grotesk mantiene la microcopy operativa. El ámbar selenita se utiliza exclusivamente para arcos de ruta, objetivos, acción principal y énfasis de misión crítico; no debe ser un brillo decorativo genérico.
