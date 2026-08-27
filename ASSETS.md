# Recursos — Lunar Rover Expedition

**Dirección artística:** Una misión lunar de instrumentalismo analógico y cartografía científica. El vacío azul-negro rodea regolito de grises minerales; el ámbar selenita marca objetivos y propulsión, mientras que el cian indica navegación estable. Los materiales deben sentirse como aluminio, polvo y paneles técnicos, no como ciencia ficción brillante.

| Recurso | Función | Tamaño de uso | Origen y ruta de uso |
|---|---|---|---|
| Referencia visual de misión | Fija cámara, composición, densidad y estilo del juego. Puede aparecer de forma atenuada tras la pantalla de inicio. | 1,920 × 1,080 px, plano de bienvenida | `/manus-storage/lunar-rover-visual-target_5538c836.png` |
| Textura de regolito lunar | Material del terreno y pequeñas tarjetas de interfaz. | Tile de 24 × 24 m en el terreno | `/manus-storage/lunar-regolith-tile_b1cfd882.png` |
| Calcomanía de instrumentación | Detalle aplicado al chasis del rover y a paneles, y a placas de interfaz. | Placa de 1.8 × 0.7 m y 320 × 160 px en interfaz | `/manus-storage/rover-instrument-decal_a8453884.png` |
| Emblema orbital del rover | Marca visual en cabecera, tarjeta de misión y favicon. | 64 × 64 px en HUD; 32 × 32 px para icono | `/manus-storage/lunar-rover-mark_4f238dab.png` |
| Partículas de tormenta de polvo | Nubes de polvo en planos orientados a cámara para la Cuenca de Selenita. | 4–11 m por partícula, 66 instancias | `/manus-storage/lunar-dust-storm-particles_949628da.png` |
| Regolito de cráter profundo | Material de superficie para Fosa de Tycho y sus anillos de riesgo. | Tile de 20 × 20 m | `/manus-storage/deep-crater-regolith-tile_d844fa40.png` |

## Notas de implementación

Los recursos se generan fuera del árbol del proyecto y se consumen desde almacenamiento gestionado. La mayor parte de la escena se resuelve mediante geometría procedural para conservar una carga rápida y una silueta de juego limpia. La imagen de referencia se usa como guía principal de control de calidad y se mostrará en la superficie de presentación inicial de la misión.

## Expansión — Lunar Science Base Tycoon

**Dirección artística de la base:** Bitácora científica lunar de perspectiva isométrica. La base es un conjunto asimétrico de módulos presurizados, paneles solares y laboratorios sobre regolito mineral. El vacío azul-negro conserva el silencio de la misión; el ámbar selenita identifica construcción, energía y rutas, mientras el cian representa soporte vital, ciencia y comunicaciones. Las estructuras deben leerse como hardware plausible de aluminio cepillado, no como arquitectura futurista genérica.

| Recurso | Función | Tamaño de uso | Origen y ruta de uso |
|---|---|---|---|
| Referencia visual del tycoon | Fija la composición isométrica, la jerarquía de paneles y la densidad de módulos en la base. | 1,920 × 1,080 px; portada y control de calidad | `/manus-storage/lunar-scientific-base-tycoon-visual-target_d1e54007.png` |
| Módulo de hábitat | Ilustración para tarjeta de construcción y placa de información del hábitat presurizado. | 320 × 210 px; módulo físico de 8 × 5 m construido con geometría procedural | `/manus-storage/lunar-habitat-module_15f2dc65.png` |
| Módulo de laboratorio | Ilustración para tarjeta de investigación y módulo geológico de la base. | 320 × 210 px; módulo físico de 7 × 4 m | `/manus-storage/lunar-science-laboratory-module_f7492492.png` |
| Extractora de regolito | Ilustración de catálogo y placa de la extractora, con perforación ámbar. | 320 × 210 px; módulo físico de 5 × 4 m | `/manus-storage/lunar-regolith-extractor-module_37cb8532.png` |
| Campo solar | Ilustración de catálogo para el módulo generador inicial. | 320 × 210 px; módulo físico de 9 × 5 m | `/manus-storage/lunar-solar-array-module_7a5777b1.png` |
| Sellos de programas científicos | Lámina generada de tres emblemas abstractos para identificar Pioneros, Cooperación y Sostenibilidad en las tarjetas de campaña. No contiene nombres, banderas ni logotipos oficiales. | Franja 3:2, recortada por CSS en distintivos de 62 × 48 px | `/manus-storage/lunar-science-campaign-seals_77106e63.png` |
