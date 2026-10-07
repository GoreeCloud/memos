/* GLAZE UI V1.2 Candidate — fixture-only responsive adaptation reference behavior. Capability selection remains platform-adapter owned. */
const ROOT_SELECTOR = '[data-glz-responsive-reference]';
const REFERENCE_LAYOUTS = new Set(['compact','medium','expanded','large','wearable','spatial']);

function recompose(root, nextLayout) {
  if (!REFERENCE_LAYOUTS.has(nextLayout)) return false;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const activeId = active?.id || '';
  root.dataset.glzLayoutClass = nextLayout;
  const status = root.querySelector('[data-recomposition-status]');
  if (status) status.textContent = `Reference composition: ${nextLayout}. Task data and selection remain unchanged.`;
  if (activeId) requestAnimationFrame(() => document.getElementById(activeId)?.focus({ preventScroll: true }));
  root.dispatchEvent(new CustomEvent('glz:reference-recomposition', { bubbles: true, detail: { layoutClass: nextLayout, fixtureOnly: true } }));
  return true;
}

function initNavigation(root) {
  for (const item of root.querySelectorAll('[data-adapt-destination]')) {
    item.addEventListener('click', () => {
      for (const other of root.querySelectorAll('[data-adapt-destination]')) other.removeAttribute('aria-current');
      item.setAttribute('aria-current','page');
      root.dataset.currentDestination = item.dataset.adaptDestination || '';
    });
  }
}

function initSelection(root) {
  for (const item of root.querySelectorAll('[data-adapt-select]')) {
    item.addEventListener('click', () => {
      for (const other of root.querySelectorAll('[data-adapt-select]')) other.setAttribute('aria-selected', String(other === item));
      root.dataset.selectedRecord = item.dataset.adaptSelect || '';
      const inspector = root.querySelector('[data-adapt-inspector-status]');
      if (inspector) inspector.textContent = `Selected fixture record: ${item.dataset.adaptSelect || 'unknown'}.`;
    });
  }
}

function initControls(root) {
  for (const button of root.querySelectorAll('[data-recompose-to]')) {
    button.addEventListener('click', () => recompose(root, button.dataset.recomposeTo || ''));
  }
}

export function initializeResponsiveAdaptationReference(scope = document) {
  for (const root of scope.querySelectorAll(ROOT_SELECTOR)) {
    initNavigation(root);
    initSelection(root);
    initControls(root);
  }
}

export function applyReferenceComposition(root, layoutClass) { return recompose(root, layoutClass); }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeResponsiveAdaptationReference(), { once: true });
else initializeResponsiveAdaptationReference();

window.GlazeV12ResponsiveAdaptation = Object.freeze({ initializeResponsiveAdaptationReference, applyReferenceComposition });
