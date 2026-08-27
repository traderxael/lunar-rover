# Memoria de desarrollo — Lunar Rover Expedition

La versión inicial se desarrolla como un juego web estático con React, Vite y Babylon.js. No requiere datos externos, autenticación, servidores ni física de terceros. La conducción se resolverá mediante cinemática propia para evitar dependencias de motores físicos e inconsistencias entre navegadores.

La estética elegida es **Bitácora de Exploración Analógica**. La cámara principal es oblicua elevada, con superficie lunar de grises cálidos, vacío azul-negro, navegación cian y el ámbar selenita `#F3A533` para objetivos y estados de motor. El juego debe preservar esa sobriedad científica: interfaces periféricas, contraste alto y ornamentos limitados.

La verificación visual se realizará desde el navegador mediante `?demo`, que debe mover el rover de forma determinista entre muestras para demostrar la escena sin requerir entrada manual. La comprobación técnica final debe incluir el tipo estático y la ausencia de errores de consola durante una sesión de prueba.

La ampliación de mapas incorpora `?map=tranquility`, `?map=tycho` y `?map=selenite`. Cada sector cambia el punto de partida, las muestras, los cráteres, rocas, colores de superficie y condiciones de entorno. Fosa de Tycho usa cavidades profundas señalizadas con perímetros ámbar que penalizan una entrada; Cuenca de Selenita incorpora partículas de polvo, una veladura ambiental y consumo adicional durante el desplazamiento.
