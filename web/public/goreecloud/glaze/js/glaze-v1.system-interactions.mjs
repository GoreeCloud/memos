const PANEL_IDS = Object.freeze(['search', 'control-center']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const freezeState = (value) => Object.freeze({ ...value });

export function createUniversalSearchState({ resultCount = 0, query = '' } = {}) {
  return freezeState({
    open: false,
    query: String(query),
    resultCount: Math.max(0, Number(resultCount) || 0),
    selectedIndex: -1,
    confirmationIndex: null,
    lastExecutedIndex: null,
  });
}

export function reduceUniversalSearch(state, event = {}) {
  if (!state || typeof state !== 'object') throw new TypeError('Universal Search state is required');
  const type = event.type;
  const count = Math.max(0, Number(event.resultCount ?? state.resultCount) || 0);
  const next = { ...state, resultCount: count };
  let effect = null;

  if (type === 'open') {
    next.open = true;
    next.selectedIndex = -1;
    next.confirmationIndex = null;
  } else if (type === 'close') {
    next.open = false;
    next.selectedIndex = -1;
    next.confirmationIndex = null;
  } else if (type === 'query') {
    next.query = String(event.query ?? '');
    next.selectedIndex = -1;
    next.confirmationIndex = null;
  } else if (type === 'move') {
    if (!next.open || count === 0) return { state: freezeState(next), effect };
    const delta = event.direction === 'previous' ? -1 : 1;
    if (next.selectedIndex < 0) next.selectedIndex = delta > 0 ? 0 : count - 1;
    else next.selectedIndex = (next.selectedIndex + delta + count) % count;
    next.confirmationIndex = null;
  } else if (type === 'select') {
    const index = Number(event.index);
    if (Number.isInteger(index) && index >= 0 && index < count) {
      next.selectedIndex = index;
      next.confirmationIndex = null;
    }
  } else if (type === 'execute') {
    const index = Number.isInteger(Number(event.index)) ? Number(event.index) : next.selectedIndex;
    if (!next.open || index < 0 || index >= count) return { state: freezeState(next), effect };
    next.selectedIndex = index;
    if (Boolean(event.destructive) && next.confirmationIndex !== index) {
      next.confirmationIndex = index;
      effect = freezeState({ type: 'confirm', index });
    } else {
      next.confirmationIndex = null;
      next.lastExecutedIndex = index;
      effect = freezeState({ type: 'execute', index });
    }
  } else if (type === 'escape') {
    if (next.confirmationIndex !== null) {
      next.confirmationIndex = null;
      effect = freezeState({ type: 'cancel-confirmation' });
    } else if (next.open) {
      next.open = false;
      next.selectedIndex = -1;
      effect = freezeState({ type: 'close' });
    }
  } else if (type !== undefined) {
    throw new TypeError(`Unknown Universal Search event: ${type}`);
  }
  return { state: freezeState(next), effect };
}

export function orderUniversalSearchGroups(groups = {}) {
  const order = ['best-match', 'apps', 'files', 'people', 'actions', 'settings', 'recent', 'related', 'generated-answer'];
  return Object.freeze(
    order
      .filter((key) => (Array.isArray(groups[key]) ? groups[key].length > 0 : Boolean(groups[key])))
      .map((key) => Object.freeze({ key, value: groups[key] })),
  );
}

export function createControlCenterState({
  open = false,
  wifi = true,
  bluetooth = true,
  focus = false,
  brightness = 64,
  volume = 64,
  mediaPlaying = true,
} = {}) {
  return freezeState({
    open: Boolean(open),
    wifi: Boolean(wifi),
    bluetooth: Boolean(bluetooth),
    focus: Boolean(focus),
    brightness: clamp(Number(brightness) || 0, 0, 100),
    volume: clamp(Number(volume) || 0, 0, 100),
    mediaPlaying: Boolean(mediaPlaying),
  });
}

export function reduceControlCenter(state, event = {}) {
  if (!state || typeof state !== 'object') throw new TypeError('Control Center state is required');
  const next = { ...state };
  const type = event.type;
  if (type === 'open') next.open = true;
  else if (type === 'close' || type === 'escape') next.open = false;
  else if (type === 'toggle') {
    if (!['wifi', 'bluetooth', 'focus', 'mediaPlaying'].includes(event.control)) {
      throw new TypeError(`Unknown Control Center toggle: ${event.control}`);
    }
    next[event.control] = !Boolean(next[event.control]);
  } else if (type === 'set') {
    if (!['brightness', 'volume'].includes(event.control)) {
      throw new TypeError(`Unknown Control Center range: ${event.control}`);
    }
    next[event.control] = clamp(Number(event.value) || 0, 0, 100);
  } else if (type !== undefined) {
    throw new TypeError(`Unknown Control Center event: ${type}`);
  }
  return freezeState(next);
}

export function createSystemPanelState({ active = null } = {}) {
  if (active !== null && !PANEL_IDS.includes(active)) throw new TypeError(`Unknown system panel: ${active}`);
  return freezeState({ active });
}

export function activateSystemPanel(state, panel) {
  if (!state || typeof state !== 'object') throw new TypeError('System panel state is required');
  if (panel !== null && !PANEL_IDS.includes(panel)) throw new TypeError(`Unknown system panel: ${panel}`);
  return freezeState({ active: panel });
}

function setHidden(node, hidden) {
  if (!node) return;
  node.hidden = Boolean(hidden);
  node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function resultNodes(searchRoot) {
  return [...searchRoot.querySelectorAll('[data-glz1-search-result]')];
}

function syncSearchDom(searchRoot, input, state) {
  setHidden(searchRoot, !state.open);
  input?.setAttribute('aria-expanded', state.open ? 'true' : 'false');
  const results = resultNodes(searchRoot);
  results.forEach((node, index) => {
    node.setAttribute('aria-selected', index === state.selectedIndex ? 'true' : 'false');
    node.dataset.confirming = index === state.confirmationIndex ? 'true' : 'false';
  });
}

export function bindUniversalSearch({
  document: doc = globalThis.document,
  searchRoot,
  input,
  invoker = null,
  status = null,
  globalShortcut = true,
  onExecute = null,
  onOpen = null,
  onClose = null,
} = {}) {
  if (!doc || !searchRoot || !input) throw new TypeError('Universal Search binding requires document, searchRoot, and input');
  let state = createUniversalSearchState({ resultCount: resultNodes(searchRoot).length, query: input.value || '' });
  let restoreFocus = invoker;

  const apply = (event) => {
    const wasOpen = state.open;
    const results = resultNodes(searchRoot);
    const outcome = reduceUniversalSearch(state, { ...event, resultCount: results.length });
    state = outcome.state;
    syncSearchDom(searchRoot, input, state);
    if (event.type === 'open' && !wasOpen && state.open) {
      restoreFocus = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : invoker;
      input.focus({ preventScroll: true });
      onOpen?.(state);
    }
    if ((event.type === 'move' || event.type === 'select') && state.selectedIndex >= 0) {
      results[state.selectedIndex]?.focus({ preventScroll: true });
    }
    if (outcome.effect?.type === 'confirm') {
      if (status) status.textContent = `Confirm ${results[outcome.effect.index]?.textContent.trim() || 'action'}`;
    } else if (outcome.effect?.type === 'execute') {
      const node = results[outcome.effect.index];
      if (status) status.textContent = `Executed ${node?.textContent.trim() || 'action'}`;
      onExecute?.({ index: outcome.effect.index, node, state });
    } else if (outcome.effect?.type === 'cancel-confirmation') {
      if (status) status.textContent = 'Confirmation cancelled';
    }
    if (wasOpen && !state.open) {
      onClose?.(state);
      restoreFocus?.focus?.({ preventScroll: true });
    }
    return outcome;
  };

  syncSearchDom(searchRoot, input, state);

  const onDocumentKeydown = (event) => {
    if (globalShortcut && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      apply({ type: 'open' });
      return;
    }
    if (!state.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      apply({ type: 'escape' });
      return;
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && doc.activeElement !== input) {
      event.preventDefault();
      apply({ type: 'move', direction: event.key === 'ArrowUp' ? 'previous' : 'next' });
      return;
    }
    if (event.key === 'Enter' && doc.activeElement?.matches?.('[data-glz1-search-result]')) {
      event.preventDefault();
      const results = resultNodes(searchRoot);
      const index = results.indexOf(doc.activeElement);
      apply({ type: 'execute', index, destructive: doc.activeElement.dataset.destructive === 'true' });
    }
  };

  const onInputKeydown = (event) => {
    if (!state.open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      apply({ type: 'move', direction: event.key === 'ArrowUp' ? 'previous' : 'next' });
    }
  };

  const onInput = () => {
    const outcome = reduceUniversalSearch(state, { type: 'query', query: input.value, resultCount: resultNodes(searchRoot).length });
    state = outcome.state;
    syncSearchDom(searchRoot, input, state);
  };

  const onSearchClick = (event) => {
    const node = event.target.closest?.('[data-glz1-search-result]');
    if (!node || !searchRoot.contains(node)) return;
    const results = resultNodes(searchRoot);
    const index = results.indexOf(node);
    apply({ type: 'select', index });
    apply({ type: 'execute', index, destructive: node.dataset.destructive === 'true' });
  };

  const onInvokerClick = () => apply({ type: state.open ? 'close' : 'open' });
  doc.addEventListener('keydown', onDocumentKeydown);
  input.addEventListener('keydown', onInputKeydown);
  input.addEventListener('input', onInput);
  searchRoot.addEventListener('click', onSearchClick);
  invoker?.addEventListener('click', onInvokerClick);

  return Object.freeze({
    open: () => apply({ type: 'open' }),
    close: () => apply({ type: 'close' }),
    getState: () => state,
    destroy: () => {
      doc.removeEventListener('keydown', onDocumentKeydown);
      input.removeEventListener('keydown', onInputKeydown);
      input.removeEventListener('input', onInput);
      searchRoot.removeEventListener('click', onSearchClick);
      invoker?.removeEventListener('click', onInvokerClick);
    },
  });
}

function syncControlCenterDom(root, state) {
  setHidden(root, !state.open);
  for (const control of ['wifi', 'bluetooth', 'focus', 'mediaPlaying']) {
    const node = root.querySelector(`[data-glz1-control-toggle="${control}"]`);
    if (!node) continue;
    node.setAttribute('aria-pressed', state[control] ? 'true' : 'false');
    node.dataset.state = state[control] ? 'on' : 'off';
  }
  for (const control of ['brightness', 'volume']) {
    const node = root.querySelector(`[data-glz1-control-range="${control}"]`);
    if (!node) continue;
    node.value = String(state[control]);
    node.setAttribute('aria-valuenow', String(state[control]));
  }
}

export function bindControlCenter({
  document: doc = globalThis.document,
  root,
  invoker = null,
  initialState = {},
  onOpen = null,
  onClose = null,
  onChange = null,
} = {}) {
  if (!doc || !root) throw new TypeError('Control Center binding requires document and root');
  let state = createControlCenterState(initialState);
  let restoreFocus = invoker;

  const apply = (event) => {
    const wasOpen = state.open;
    state = reduceControlCenter(state, event);
    syncControlCenterDom(root, state);
    if (event.type === 'open' && !wasOpen && state.open) {
      restoreFocus = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : invoker;
      const first = root.querySelector('button,[role="button"],input,[tabindex]:not([tabindex="-1"])');
      first?.focus?.({ preventScroll: true });
      onOpen?.(state);
    } else if (wasOpen && !state.open) {
      onClose?.(state);
      restoreFocus?.focus?.({ preventScroll: true });
    } else if (event.type === 'toggle' || event.type === 'set') {
      onChange?.({ event, state });
    }
    return state;
  };

  syncControlCenterDom(root, state);

  const onClick = (event) => {
    const toggle = event.target.closest?.('[data-glz1-control-toggle]');
    if (toggle && root.contains(toggle)) apply({ type: 'toggle', control: toggle.dataset.glz1ControlToggle });
  };
  const onInput = (event) => {
    const range = event.target.closest?.('[data-glz1-control-range]');
    if (range && root.contains(range)) apply({ type: 'set', control: range.dataset.glz1ControlRange, value: range.value });
  };
  const onKeydown = (event) => {
    if (!state.open || event.key !== 'Escape') return;
    event.preventDefault();
    apply({ type: 'escape' });
  };
  const onInvokerClick = () => apply({ type: state.open ? 'close' : 'open' });

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  doc.addEventListener('keydown', onKeydown);
  invoker?.addEventListener('click', onInvokerClick);

  return Object.freeze({
    open: () => apply({ type: 'open' }),
    close: () => apply({ type: 'close' }),
    getState: () => state,
    destroy: () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      doc.removeEventListener('keydown', onKeydown);
      invoker?.removeEventListener('click', onInvokerClick);
    },
  });
}

export function bindExclusiveSystemPanels({ searchController, controlCenterController } = {}) {
  if (!searchController || !controlCenterController) throw new TypeError('Exclusive panel binding requires search and Control Center controllers');
  let panelState = createSystemPanelState();

  const activate = (panel) => {
    panelState = activateSystemPanel(panelState, panel);
    if (panel === 'search') {
      if (controlCenterController.getState().open) controlCenterController.close();
      searchController.open();
    } else if (panel === 'control-center') {
      if (searchController.getState().open) searchController.close();
      controlCenterController.open();
    } else {
      if (searchController.getState().open) searchController.close();
      if (controlCenterController.getState().open) controlCenterController.close();
    }
    return panelState;
  };

  return Object.freeze({ activate, close: () => activate(null), getState: () => panelState });
}
