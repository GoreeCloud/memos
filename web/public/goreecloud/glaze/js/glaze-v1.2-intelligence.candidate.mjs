const frozen = (value) => Object.freeze({ ...value });

export function bindV12AIAction({ button, status = null, onExecute = null } = {}) {
  if (!button) throw new TypeError("V1.2 AI Action requires button");
  let confirming = false;
  const confirmationRequired = button.dataset.confirmationRequired === "true";
  const sync = () => {
    button.dataset.confirming = confirming ? "true" : "false";
    button.setAttribute("aria-pressed", confirming ? "true" : "false");
  };
  sync();
  const onClick = () => {
    if (button.disabled || button.getAttribute("aria-disabled") === "true") return;
    if (confirmationRequired && !confirming) {
      confirming = true;
      sync();
      if (status) status.textContent = `Confirm ${button.dataset.actionLabel || button.textContent.trim()}`;
      return;
    }
    confirming = false;
    sync();
    if (status) status.textContent = `Executed ${button.dataset.actionLabel || button.textContent.trim()}`;
    onExecute?.({
      userData: button.dataset.userData === "true",
      changesState: button.dataset.stateChange === "true",
      confirmationRequired,
    });
  };
  button.addEventListener("click", onClick);
  return frozen({
    cancel: () => { confirming = false; sync(); },
    getState: () => frozen({ confirming, confirmationRequired }),
    destroy: () => button.removeEventListener("click", onClick),
  });
}

export function bindV12AISuggestion({ root, dismissButton, status = null } = {}) {
  if (!root || !dismissButton) throw new TypeError("V1.2 AI Suggestion requires root and dismissButton");
  const dismiss = () => {
    root.dataset.dismissed = "true";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    dismissButton.disabled = true;
    if (status) status.textContent = "AI suggestion dismissed";
  };
  dismissButton.addEventListener("click", dismiss);
  return frozen({ dismiss, destroy: () => dismissButton.removeEventListener("click", dismiss) });
}

export function bindV12SmartSummary({ root, toggle, detail } = {}) {
  if (!root || !toggle || !detail) throw new TypeError("V1.2 Smart Summary requires root, toggle, and detail");
  const setExpanded = (expanded) => {
    const value = Boolean(expanded);
    root.dataset.expanded = value ? "true" : "false";
    toggle.setAttribute("aria-expanded", value ? "true" : "false");
    detail.hidden = !value;
    return value;
  };
  setExpanded(toggle.getAttribute("aria-expanded") === "true");
  const onClick = () => setExpanded(toggle.getAttribute("aria-expanded") !== "true");
  toggle.addEventListener("click", onClick);
  return frozen({
    setExpanded,
    getExpanded: () => toggle.getAttribute("aria-expanded") === "true",
    destroy: () => toggle.removeEventListener("click", onClick),
  });
}
