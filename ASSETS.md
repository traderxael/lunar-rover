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
