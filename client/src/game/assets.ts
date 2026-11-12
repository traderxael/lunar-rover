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
export const ASSET_URLS = {
  visualTarget: "/media/visual-target.svg",
  regolith: "/media/regolith.svg",
  instrumentDecal: "/media/instrument-decal.svg",
  logo: "/media/logo.svg",
  dustStorm: "/media/dust-storm.svg",
  deepCraterRegolith: "/media/deep-crater-regolith.svg",
  baseVisualTarget: "/media/base-visual-target.svg",
  habitat: "/media/module-habitat.svg",
  laboratory: "/media/module-laboratory.svg",
  extractor: "/media/module-extractor.svg",
  solar: "/media/module-solar.svg",
  campaignSeals: "/media/campaign-seals.svg",
} as const;