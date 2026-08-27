# Memoria de desarrollo — Lunar Rover Expedition

La versión inicial se desarrolla como un juego web estático con React, Vite y Babylon.js. No requiere datos externos, autenticación, servidores ni física de terceros. La conducción se resolverá mediante cinemática propia para evitar dependencias de motores físicos e inconsistencias entre navegadores.

La estética elegida es **Bitácora de Exploración Analógica**. La cámara principal es oblicua elevada, con superficie lunar de grises cálidos, vacío azul-negro, navegación cian y el ámbar selenita `#F3A533` para objetivos y estados de motor. El juego debe preservar esa sobriedad científica: interfaces periféricas, contraste alto y ornamentos limitados.

La verificación visual se realizará desde el navegador mediante `?demo`, que debe mover el rover de forma determinista entre muestras para demostrar la escena sin requerir entrada manual. La comprobación técnica final debe incluir el tipo estático y la ausencia de errores de consola durante una sesión de prueba.

La ampliación de mapas incorpora `?map=tranquility`, `?map=tycho` y `?map=selenite`. Cada sector cambia el punto de partida, las muestras, los cráteres, rocas, colores de superficie y condiciones de entorno. Fosa de Tycho usa cavidades profundas señalizadas con perímetros ámbar que penalizan una entrada; Cuenca de Selenita incorpora partículas de polvo, una veladura ambiental y consumo adicional durante el desplazamiento.

## Lunar Science Base — cierre del vertical slice

La experiencia de base se guarda de forma aislada bajo `lunar-science-base-tycoon-v1`; el progreso anterior del rover permanece bajo su propia clave y sólo aporta un bono de datos acotado durante el primer arranque. Se validó la migración con dos sectores de récord heredado, tres objetivos opcionales y dos entradas de clasificación: el nuevo estado inició con 23 datos y el objeto heredado no fue modificado.

Las expediciones ya no dependen de temporizadores del navegador. El rover utiliza una cuenta de tres ciclos operativos y `advanceExpeditions` devuelve el snapshot con cada decremento; al finalizar acredita la carga y permite relanzar la expedición. Esto evita que pestañas en segundo plano o capturas pausadas dejen la simulación bloqueada.

`?demo` crea un snapshot no persistente de Selenita con dos solares, laboratorio, extractora, antena, investigaciones terminadas y una expedición activa. Su piloto automático alterna de forma determinista entre ciclos y nuevos lanzamientos para mostrar el terreno, los módulos, la economía, el daño reparable y el rover sin tocar partidas reales.

La comprobación final cubrió construcción y costes, retorno de expedición de 9 regolito y 7 datos, migración de guardado, acceso a Tycho y Selenita, daño periódico y reparación, archivo científico, escritorio y móvil. `pnpm check` y `pnpm build` completaron correctamente; el paquete de Babylon continúa mostrando una advertencia no bloqueante por un chunk de aproximadamente 1,85 MB.
