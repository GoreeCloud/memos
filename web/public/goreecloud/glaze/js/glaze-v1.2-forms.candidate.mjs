/* GLAZE UI V1.2 Candidate — bounded form behavior; no persistence, authentication, or network transport. */
const FORM_SELECTOR = '[data-glz-form]';
const STATUS_SELECTOR = '[data-glz-form-status]';
const SUMMARY_SELECTOR = '[data-glz-error-summary]';

function statusNode(form) {
  return form.querySelector(STATUS_SELECTOR);
}

function setStatus(form, state, message) {
  form.dataset.glzFormState = state;
  const node = statusNode(form);
  if (!node) return;
  node.dataset.state = state;
  node.textContent = message;
}

function errorMessageNode(control) {
  const id = control.dataset.glzErrorTarget;
  return id ? document.getElementById(id) : null;
}

function fieldLabel(control) {
  const field = control.closest('.glz1-field');
  const label = field?.querySelector('.glz1-field-label');
  return label?.textContent?.trim() || control.getAttribute('aria-label') || control.name || control.id || 'Field';
}

function controlMessage(control) {
  return control.dataset.glzErrorMessage || control.validationMessage || 'Review this field.';
}

function markInvalid(control) {
  control.setAttribute('aria-invalid', 'true');
  control.dataset.glzRuntimeInvalid = 'true';
  const message = errorMessageNode(control);
  if (message) {
    message.hidden = false;
    const copy = message.querySelector('[data-glz-error-copy]');
    if (copy) copy.textContent = controlMessage(control);
  }
}

function clearInvalid(control) {
  if (control.dataset.glzRuntimeInvalid !== 'true') return;
  control.removeAttribute('aria-invalid');
  delete control.dataset.glzRuntimeInvalid;
  const message = errorMessageNode(control);
  if (message) message.hidden = true;
}

function validatedControls(form) {
  return [...form.querySelectorAll('[data-glz-validate]')];
}

function renderSummary(form, invalid) {
  const summary = form.querySelector(SUMMARY_SELECTOR);
  if (!summary) return;
  const list = summary.querySelector('[data-glz-error-list]');
  if (list) {
    list.replaceChildren(...invalid.map((control) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${control.id}`;
      link.textContent = `${fieldLabel(control)}: ${controlMessage(control)}`;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        control.focus();
      });
      item.append(link);
      return item;
    }));
  }
  const heading = summary.querySelector('[data-glz-error-heading]');
  if (heading) heading.textContent = `${invalid.length} ${invalid.length === 1 ? 'field needs' : 'fields need'} attention.`;
  summary.hidden = invalid.length === 0;
  if (invalid.length) summary.focus();
}

function validate(form) {
  const invalid = [];
  for (const control of validatedControls(form)) {
    if (control.checkValidity()) {
      clearInvalid(control);
    } else {
      markInvalid(control);
      invalid.push(control);
    }
  }
  renderSummary(form, invalid);
  return invalid;
}

function submitButton(form) {
  return form.querySelector('[type="submit"][data-glz-submit]');
}

function setPending(form, pending) {
  const button = submitButton(form);
  form.dataset.glzSubmissionPending = String(pending);
  form.setAttribute('aria-busy', String(pending));
  if (!button) return;
  button.disabled = pending;
  button.setAttribute('aria-busy', String(pending));
  button.dataset.loading = String(pending);
  const progress = button.querySelector('[data-glz-submit-progress]');
  if (progress) progress.hidden = !pending;
}

function beginDeferredSubmission(form) {
  if (form.dataset.glzSubmissionPending === 'true') return;
  const invalid = validate(form);
  if (invalid.length) {
    setStatus(form, 'invalid', 'Review the highlighted fields before committing changes.');
    form.dispatchEvent(new CustomEvent('glz:form-invalid', { bubbles: true, detail: { formId: form.id, invalidCount: invalid.length } }));
    return;
  }
  const count = Number(form.dataset.glzSubmissionCount || '0') + 1;
  form.dataset.glzSubmissionCount = String(count);
  setPending(form, true);
  setStatus(form, 'saving', 'Saving — awaiting authoritative producer result.');
  form.dispatchEvent(new CustomEvent('glz:form-submit-requested', {
    bubbles: true,
    detail: { formId: form.id, submissionId: count }
  }));
}

function finishDeferredSubmission(form, result) {
  if (form.dataset.glzSubmissionPending !== 'true') return;
  const status = result?.status;
  if (status !== 'saved' && status !== 'failed') return;
  setPending(form, false);
  if (status === 'saved') {
    form.dataset.glzDirty = 'false';
    setStatus(form, 'saved', result.message || 'Saved — authoritative producer acknowledgement received.');
  } else {
    form.dataset.glzDirty = 'true';
    setStatus(form, 'save-failed', result.message || 'Save failed — review the authoritative failure and try again only when appropriate.');
  }
}

function markDirty(form) {
  if (form.dataset.glzSubmissionPending === 'true') return;
  form.dataset.glzDirty = 'true';
  setStatus(form, 'unsaved', 'Unsaved changes');
}

function initDeferredForm(form) {
  form.dataset.glzDirty ||= 'false';
  form.dataset.glzSubmissionPending ||= 'false';
  form.dataset.glzSubmissionCount ||= '0';
  form.addEventListener('input', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLElement) || control.closest('[data-glz-commit="immediate"]')) return;
    if (control.matches('[data-glz-validate]') && typeof control.checkValidity === 'function' && control.checkValidity()) clearInvalid(control);
    markDirty(form);
  });
  form.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLElement) || control.closest('[data-glz-commit="immediate"]')) return;
    markDirty(form);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    beginDeferredSubmission(form);
  });
  form.addEventListener('reset', () => {
    queueMicrotask(() => {
      for (const control of validatedControls(form)) clearInvalid(control);
      renderSummary(form, []);
      form.dataset.glzDirty = 'false';
      setPending(form, false);
      setStatus(form, 'saved', 'Saved state restored to the reference baseline.');
    });
  });
  form.addEventListener('glz:form-submission-result', (event) => finishDeferredSubmission(form, event.detail));
}

function initImmediateForm(form) {
  form.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return;
    const status = form.querySelector('[data-glz-immediate-status]');
    const enabled = control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio') ? control.checked : Boolean(control.value);
    if (status) status.textContent = enabled ? (control.dataset.glzImmediateOn || 'Change requested immediately.') : (control.dataset.glzImmediateOff || 'Change requested immediately.');
    const count = Number(form.dataset.glzImmediateCount || '0') + 1;
    form.dataset.glzImmediateCount = String(count);
    form.dispatchEvent(new CustomEvent('glz:immediate-change-requested', {
      bubbles: true,
      detail: { formId: form.id, controlId: control.id, requestedState: enabled, requestId: count }
    }));
  });
}

function initHandoffForm(form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = statusNode(form);
    if (status) {
      status.dataset.state = 'pending';
      status.textContent = 'Native or producer authentication handoff requested; this reference does not authenticate.';
    }
    form.dispatchEvent(new CustomEvent('glz:authentication-handoff-requested', {
      bubbles: true,
      detail: { formId: form.id }
    }));
  });
}

function initPasswordReveal(button) {
  const id = button.getAttribute('aria-controls');
  const input = id ? document.getElementById(id) : null;
  if (!(input instanceof HTMLInputElement)) return;
  button.addEventListener('click', () => {
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    const label = button.querySelector('[data-glz-password-reveal-label]');
    if (label) label.textContent = reveal ? 'Hide password' : 'Show password';
  });
}

function initDestructiveConfirmation(container) {
  const input = container.querySelector('[data-glz-confirm-input]');
  const button = container.querySelector('[data-glz-confirm-button]');
  if (!(input instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement)) return;
  const expected = input.dataset.glzConfirmPhrase || '';
  const update = () => { button.disabled = input.value === expected ? false : true; };
  input.addEventListener('input', update);
  update();
  button.addEventListener('click', () => {
    if (button.disabled) return;
    const count = Number(container.dataset.glzDestructiveRequestCount || '0') + 1;
    container.dataset.glzDestructiveRequestCount = String(count);
    container.dispatchEvent(new CustomEvent('glz:destructive-action-requested', {
      bubbles: true,
      detail: { sceneId: container.id, action: container.dataset.glzDestructiveAction || 'destructive-action', requestId: count }
    }));
  });
}

function init() {
  for (const form of document.querySelectorAll(FORM_SELECTOR)) {
    if (!(form instanceof HTMLFormElement)) continue;
    const model = form.dataset.glzFormModel;
    if (model === 'deferred') initDeferredForm(form);
    else if (model === 'immediate') initImmediateForm(form);
    else if (model === 'authentication-handoff') initHandoffForm(form);
  }
  for (const button of document.querySelectorAll('[data-glz-password-reveal]')) {
    if (button instanceof HTMLButtonElement) initPasswordReveal(button);
  }
  for (const container of document.querySelectorAll('[data-glz-destructive-confirmation]')) initDestructiveConfirmation(container);
}

export function resolveSubmission(formOrId, result) {
  const form = typeof formOrId === 'string' ? document.getElementById(formOrId) : formOrId;
  if (form instanceof HTMLFormElement) finishDeferredSubmission(form, result);
}

export { init };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

window.GlazeV12Forms = Object.freeze({ resolveSubmission });
