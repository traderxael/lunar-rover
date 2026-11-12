/**
 * Recursos visuales del juego.
 *
 * Todo vive en `client/public/media/`. Ninguna ruta apunta a un host externo:
 * el repo tiene que funcionar clonado, sin credenciales ni proxy.
 *
 * Los archivos marcados como provisionales son marcadores locales que
 * reemplazan los recursos que antes se servían desde Manus. La fase 5
 * (dirección visual) los sustituye por modelos y texturas reales, con su
 * procedencia y licencia documentadas en `ASSETS.md`.
 */
const publicMedia = (file: string) => `${import.meta.env.BASE_URL}media/${file}`;

export const ASSET_URLS = {
  visualTarget: publicMedia("visual-target.svg"),
  regolith: publicMedia("regolith.svg"),
  instrumentDecal: publicMedia("instrument-decal.svg"),
  logo: publicMedia("logo.svg"),
  dustStorm: publicMedia("dust-storm.svg"),
  deepCraterRegolith: publicMedia("deep-crater-regolith.svg"),
  baseVisualTarget: publicMedia("base-visual-target.svg"),
  habitat: publicMedia("module-habitat.svg"),
  laboratory: publicMedia("module-laboratory.svg"),
  extractor: publicMedia("module-extractor.svg"),
  solar: publicMedia("module-solar.svg"),
  antenna: publicMedia("module-antenna.svg"),
  campaignSeals: publicMedia("campaign-seals.svg"),
} as const;
