/* GLAZE UI V1.2 Candidate — fixture-only visualization inspection; no transport, persistence, or producer-state computation. */
const ROOT_SELECTOR = '[data-glz-viz-root]';

function selectPoint(root, point, focus = false) {
  const points = [...root.querySelectorAll('[data-viz-point]')];
  for (const candidate of points) candidate.setAttribute('aria-pressed', String(candidate === point));
  const output = root.querySelector('[data-viz-inspection]');
  if (output) output.textContent = `${point.dataset.label || 'Fixture point'}: ${point.dataset.value || 'Unknown'}${point.dataset.unit ? ` ${point.dataset.unit}` : ''}. ${point.dataset.state || 'Measured fixture value'}.`;
  root.dataset.selectedPoint = point.dataset.pointId || '';
  if (focus) point.focus();
}

function initPoints(root) {
  const points = [...root.querySelectorAll('[data-viz-point]')];
  points.forEach((point, index) => {
    point.addEventListener('click', () => selectPoint(root, point));
    point.addEventListener('keydown', event => {
      let target = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % points.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + points.length) % points.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = points.length - 1;
      else return;
      event.preventDefault(); selectPoint(root, points[target], true);
    });
  });
  if (points.length && !points.some(point => point.getAttribute('aria-pressed') === 'true')) selectPoint(root, points[0]);
}

function initRanges(root) {
  const ranges = [...root.querySelectorAll('[data-viz-range]')];
  ranges.forEach(range => range.addEventListener('click', () => {
    for (const candidate of ranges) candidate.setAttribute('aria-pressed', String(candidate === range));
    root.dataset.range = range.dataset.vizRange || '';
    const status = root.querySelector('[data-viz-range-status]');
    if (status) status.textContent = `Reference range: ${range.textContent.trim()}. Fixture values remain unchanged by this presentation control.`;
  }));
}

function initLiveToggle(root) {
  const button = root.querySelector('[data-viz-live-toggle]');
  const status = root.querySelector('[data-viz-live-status]');
  if (!button || !status) return;
  root.dataset.visualUpdates = 'live';
  button.addEventListener('click', () => {
    const pausing = root.dataset.visualUpdates === 'live';
    root.dataset.visualUpdates = pausing ? 'paused' : 'live';
    button.setAttribute('aria-pressed', String(pausing));
    button.textContent = pausing ? 'Resume visual updates' : 'Pause visual updates';
    status.textContent = pausing
      ? 'Visual updates paused for fixture inspection. This does not imply producer collection stopped.'
      : 'Visual updates live for this static fixture presentation. No producer stream is connected.';
  });
}

function init(root) {
  initPoints(root);
  initRanges(root);
  initLiveToggle(root);
}

export function initializeDataVisualization(scope = document) {
  for (const root of scope.querySelectorAll(ROOT_SELECTOR)) init(root);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeDataVisualization(), { once: true });
else initializeDataVisualization();

window.GlazeV12DataVisualization = Object.freeze({ initializeDataVisualization });
