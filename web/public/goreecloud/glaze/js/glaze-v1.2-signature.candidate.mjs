import {
  createUniversalSearchState,
  reduceUniversalSearch,
} from "./glaze-v1.system-interactions.mjs";

const freeze = (value) => Object.freeze({ ...value });

function resultNodes(searchRoot) {
  return [...searchRoot.querySelectorAll("[data-glz1-search-result]")];
}

function setSearchVisibility(searchRoot, input, state) {
  searchRoot.hidden = !state.open;
  searchRoot.dataset.open = state.open ? "true" : "false";
  searchRoot.setAttribute("aria-hidden", state.open ? "false" : "true");
  input.setAttribute("aria-expanded", state.open ? "true" : "false");
  const results = resultNodes(searchRoot);
  results.forEach((node, index) => {
    node.setAttribute("aria-selected", index === state.selectedIndex ? "true" : "false");
    node.dataset.confirming = index === state.confirmationIndex ? "true" : "false";
    node.tabIndex = index === state.selectedIndex ? 0 : -1;
  });
}

export function bindV12Disclosure({ root, expandedAttribute = "data-expanded" } = {}) {
  if (!root) throw new TypeError("V1.2 disclosure requires root");
  const initial = root.getAttribute("aria-expanded") === "true" || root.getAttribute(expandedAttribute) === "true";
  const setExpanded = (expanded) => {
    const value = Boolean(expanded);
    root.setAttribute("aria-expanded", value ? "true" : "false");
    root.setAttribute(expandedAttribute, value ? "true" : "false");
    return value;
  };
  setExpanded(initial);
  const onClick = () => {
    if (root.disabled || root.getAttribute("aria-disabled") === "true") return;
    setExpanded(root.getAttribute("aria-expanded") !== "true");
  };
  root.addEventListener("click", onClick);
  return freeze({
    setExpanded,
    getExpanded: () => root.getAttribute("aria-expanded") === "true",
    destroy: () => root.removeEventListener("click", onClick),
  });
}

export function bindV12SmartRail({ root } = {}) {
  if (!root) throw new TypeError("V1.2 Smart Rail requires root");
  const items = () => [...root.querySelectorAll(".glz1-rail-item:not([disabled]):not([aria-disabled='true'])")];
  const sync = (preferred = null) => {
    const nodes = items();
    if (!nodes.length) return [];
    const target = preferred && nodes.includes(preferred)
      ? preferred
      : nodes.find((node) => node.getAttribute("aria-current") === "page") || nodes[0];
    nodes.forEach((node) => { node.tabIndex = node === target ? 0 : -1; });
    return nodes;
  };
  sync();
  const onFocusIn = (event) => {
    const node = event.target.closest?.(".glz1-rail-item");
    if (node && root.contains(node)) sync(node);
  };
  const onKeyDown = (event) => {
    const nodes = items();
    if (!nodes.length || !nodes.includes(event.target)) return;
    const index = nodes.indexOf(event.target);
    let next = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = nodes[(index + 1) % nodes.length];
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = nodes[(index - 1 + nodes.length) % nodes.length];
    else if (event.key === "Home") next = nodes[0];
    else if (event.key === "End") next = nodes.at(-1);
    if (!next) return;
    event.preventDefault();
    sync(next);
    next.focus({ preventScroll: true });
  };
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("keydown", onKeyDown);
  return freeze({
    sync,
    destroy: () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("keydown", onKeyDown);
    },
  });
}

export function bindV12UniversalSearch({
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
  if (!doc || !searchRoot || !input) throw new TypeError("V1.2 Universal Search requires document, searchRoot, and input");
  let state = createUniversalSearchState({ resultCount: resultNodes(searchRoot).length, query: input.value || "" });
  let restoreFocus = invoker;

  const apply = (event) => {
    const wasOpen = state.open;
    const results = resultNodes(searchRoot);
    const outcome = reduceUniversalSearch(state, { ...event, resultCount: results.length });
    state = outcome.state;
    setSearchVisibility(searchRoot, input, state);

    if (event.type === "open" && !wasOpen && state.open) {
      restoreFocus = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : invoker;
      input.focus({ preventScroll: true });
      onOpen?.(state);
    }
    if ((event.type === "move" || event.type === "select") && state.selectedIndex >= 0) {
      results[state.selectedIndex]?.focus({ preventScroll: true });
    }
    if (outcome.effect?.type === "confirm") {
      if (status) status.textContent = `Confirm ${results[outcome.effect.index]?.textContent.trim() || "action"}`;
    } else if (outcome.effect?.type === "execute") {
      const node = results[outcome.effect.index];
      if (status) status.textContent = `Executed ${node?.textContent.trim() || "action"}`;
      onExecute?.({ index: outcome.effect.index, node, state });
    } else if (outcome.effect?.type === "cancel-confirmation") {
      if (status) status.textContent = "Confirmation cancelled";
    }
    if (wasOpen && !state.open) {
      onClose?.(state);
      restoreFocus?.focus?.({ preventScroll: true });
    }
    return outcome;
  };

  setSearchVisibility(searchRoot, input, state);

  const onDocumentKeyDown = (event) => {
    if (globalShortcut && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      apply({ type: "open" });
      return;
    }
    if (!state.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      apply({ type: "escape" });
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && doc.activeElement !== input) {
      event.preventDefault();
      apply({ type: "move", direction: event.key === "ArrowUp" ? "previous" : "next" });
      return;
    }
    if (event.key === "Enter" && doc.activeElement?.matches?.("[data-glz1-search-result]")) {
      event.preventDefault();
      const results = resultNodes(searchRoot);
      const index = results.indexOf(doc.activeElement);
      apply({ type: "execute", index, destructive: doc.activeElement.dataset.destructive === "true" });
    }
  };

  const onInputKeyDown = (event) => {
    if (!state.open || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    apply({ type: "move", direction: event.key === "ArrowUp" ? "previous" : "next" });
  };

  const onInput = () => {
    const outcome = reduceUniversalSearch(state, {
      type: "query",
      query: input.value,
      resultCount: resultNodes(searchRoot).length,
    });
    state = outcome.state;
    setSearchVisibility(searchRoot, input, state);
  };

  const onSearchClick = (event) => {
    const node = event.target.closest?.("[data-glz1-search-result]");
    if (!node || !searchRoot.contains(node)) return;
    const results = resultNodes(searchRoot);
    const index = results.indexOf(node);
    if (state.selectedIndex !== index) apply({ type: "select", index });
    apply({ type: "execute", index, destructive: node.dataset.destructive === "true" });
  };

  const onInvokerClick = () => apply({ type: state.open ? "close" : "open" });
  doc.addEventListener("keydown", onDocumentKeyDown);
  input.addEventListener("keydown", onInputKeyDown);
  input.addEventListener("input", onInput);
  searchRoot.addEventListener("click", onSearchClick);
  invoker?.addEventListener("click", onInvokerClick);

  return freeze({
    open: () => apply({ type: "open" }),
    close: () => apply({ type: "close" }),
    getState: () => state,
    destroy: () => {
      doc.removeEventListener("keydown", onDocumentKeyDown);
      input.removeEventListener("keydown", onInputKeyDown);
      input.removeEventListener("input", onInput);
      searchRoot.removeEventListener("click", onSearchClick);
      invoker?.removeEventListener("click", onInvokerClick);
    },
  });
}
