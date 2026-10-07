/* GLAZE UI V1.2 Candidate — bounded fixture-only States, Feedback, and Recovery behavior. No transport, persistence, or producer-truth computation. */
const ROOT_SELECTOR = '[data-glz-states-root]';

function setTransition(scene, next) {
  const status = scene.querySelector('[data-transition-status]');
  const from = scene.dataset.currentState || '';
  scene.dataset.currentState = next;
  if (status) status.textContent = next;
  scene.dispatchEvent(new CustomEvent('glz:state-transition-requested', {
    bubbles: true,
    detail: { from, to: next, fixtureOnly: true }
  }));
}

function initSequences(root) {
  for (const scene of root.querySelectorAll('[data-transition-sequence]')) {
    const sequence = (scene.dataset.transitionSequence || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!sequence.length) continue;
    scene.dataset.transitionIndex = '0';
    scene.dataset.currentState = sequence[0];
    const status = scene.querySelector('[data-transition-status]');
    if (status) status.textContent = sequence[0];
    const advance = scene.querySelector('[data-transition-advance]');
    if (!advance) continue;
    advance.addEventListener('click', () => {
      const index = Number(scene.dataset.transitionIndex || '0');
      const nextIndex = Math.min(index + 1, sequence.length - 1);
      scene.dataset.transitionIndex = String(nextIndex);
      setTransition(scene, sequence[nextIndex]);
      if (nextIndex === sequence.length - 1) advance.disabled = true;
    });
  }
}

function initRecovery(root) {
  const scene = root.querySelector('[data-recovery-root]');
  if (!scene) return;
  const request = scene.querySelector('[data-recovery-request]');
  const status = scene.querySelector('[data-recovery-status]');
  const verification = scene.querySelector('[data-recovery-verification]');
  const announce = scene.querySelector('[data-recovery-announcement]');

  function show(state, message, verificationText) {
    scene.dataset.recoveryState = state;
    if (status) status.textContent = message;
    if (verification) verification.textContent = verificationText;
    if (announce) announce.textContent = `${message} ${verificationText}`;
  }

  if (request) request.addEventListener('click', () => {
    request.disabled = true;
    show('verifying', 'Recovery requested; awaiting producer acknowledgement.', 'Verification: pending.');
    scene.dispatchEvent(new CustomEvent('glz:recovery-requested', { bubbles: true, detail: { fixtureOnly: true } }));
  });

  scene.addEventListener('glz:recovery-producer-state', event => {
    const detail = event.detail || {};
    if (detail.status === 'completed' && detail.verified === true) {
      show('complete', 'Recovery complete by producer acknowledgement.', 'Verification: confirmed by producer fixture.');
    } else if (detail.status === 'failed') {
      show('failed', 'Recovery failed by producer acknowledgement.', 'Verification: failed. Review retained fixture details.');
    } else {
      show('verifying', 'Recovery is not complete.', 'Verification: awaiting authoritative confirmation.');
    }
  });
}

function initNoResults(root) {
  for (const button of root.querySelectorAll('[data-clear-query]')) {
    button.addEventListener('click', () => {
      const scene = button.closest('[data-state-scene]');
      const query = scene?.querySelector('[data-query-context]');
      const status = scene?.querySelector('[data-query-status]');
      if (query) query.textContent = 'Query: (cleared)';
      if (status) status.textContent = 'Fixture records are visible again; clearing search does not change producer data.';
    });
  }
}

export function initializeStatesFeedbackRecovery(scope = document) {
  for (const root of scope.querySelectorAll(ROOT_SELECTOR)) {
    initSequences(root);
    initRecovery(root);
    initNoResults(root);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeStatesFeedbackRecovery(), { once: true });
} else {
  initializeStatesFeedbackRecovery();
}

window.GlazeV12StatesFeedbackRecovery = Object.freeze({ initializeStatesFeedbackRecovery });
