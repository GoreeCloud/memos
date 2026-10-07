/* GLAZE UI V1.4.1 — Stable runtime entrypoint. */
export * from './glaze-v1.4.0.mjs';
export * from './glaze-v1.4.1-optical-engine.mjs';

import {
  createGlazeOpticalEngineV141Candidate,
  glazeOpticalEngineV141Candidate
} from './glaze-v1.4.1-optical-engine.mjs';

export const createGlazeOpticalEngineV141 = createGlazeOpticalEngineV141Candidate;

export const glazeOpticalEngineV141 = Object.freeze({
  ...glazeOpticalEngineV141Candidate,
  version: '1.4.1',
  lifecycle: 'stable',
  stableBaseline: '1.4.0',
  qualifiedImplementationAnchor: '66478aed461b83c49b2ed027c3e4afc26520e98c',
  humanAcceptanceAutomatic: false,
  patchPromotionAutomatic: false
});
