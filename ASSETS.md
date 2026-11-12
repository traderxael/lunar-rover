# Recursos — Lunar Rover Expedition

**Dirección artística:** una misión lunar de instrumentalismo analógico y cartografía científica. El vacío azul-negro rodea regolito de grises minerales; el ámbar selenita marca objetivos y propulsión, mientras que el cian indica navegación estable. Los materiales deben sentirse como aluminio, polvo y paneles técnicos, no como ciencia ficción brillante.

**Regla del repositorio:** ningún recurso se carga desde un host externo en tiempo de ejecución. Todo vive en `client/public/` y el juego funciona clonado, sin credenciales ni proxy.

## Estado actual

Los recursos que la escena consumía antes se servían desde un almacenamiento externo que no forma parte del repositorio. Mientras se reconstruyen, el proyecto usa **marcadores provisionales**: archivos locales y lícitos que mantienen la interfaz y el terreno legibles y evitan peticiones fallidas.

| Archivo | Función | Estado |
|---|---|---|
| `media/visual-target.svg` | Referencia visual de la misión. | Provisional |
| `media/regolith.svg` | Textura de regolito del terreno. | Provisional |
| `media/deep-crater-regolith.svg` | Regolito de cráter profundo (Fosa de Tycho). | Provisional |
| `media/instrument-decal.svg` | Calcomanía de instrumentación del rover. | Provisional |
| `media/logo.svg` | Emblema de la misión, cabecera y favicon. | Provisional |
| `media/dust-storm.svg` | Partículas de tormenta de polvo. | Provisional |
| `media/base-visual-target.svg` | Referencia visual de la base. | Provisional |
| `media/module-solar.svg` | Tarjeta del campo solar. | Provisional |
| `media/module-habitat.svg` | Tarjeta del hábitat presurizado. | Provisional |
| `media/module-laboratory.svg` | Tarjeta del laboratorio geológico. | Provisional |
| `media/module-extractor.svg` | Tarjeta de la extractora de regolito. | Provisional |
| `media/module-antenna.svg` | Tarjeta de la antena de largo alcance. | Provisional |
| `media/campaign-seals.svg` | Lámina de sellos abstractos de programas científicos. | Provisional |
| `fonts/barlow-condensed-400.woff2` | Tipografía condensada de cifras y títulos. | Definitivo |
| `fonts/barlow-condensed-600.woff2` | Variante seminegrita de la anterior. | Definitivo |
| `fonts/space-grotesk.woff2` | Tipografía sans de lectura. | Definitivo |

### Tipografías

Barlow Condensed y Space Grotesk, ambas distribuidas por Google Fonts bajo la **SIL Open Font License 1.1**. Los archivos se autoalojan para no depender de una petición a un tercero; la licencia se conserva junto a los archivos.

## Pendiente

La fase de dirección visual reemplaza los marcadores por material real: textura de regolito, modelos CC0 del rover y del módulo de alunizaje, y arte de tarjetas. Cada incorporación se añade a la tabla con archivo, tipo, origen, URL, autor y licencia, y el texto de licencia cuando la licencia lo exige (CC-BY).

## Notas de implementación

La mayor parte de la escena se resuelve con geometría procedural para conservar carga rápida y una silueta limpia. Los marcadores actuales son deliberadamente neutros: no simulan detalle que después habría que deshacer.