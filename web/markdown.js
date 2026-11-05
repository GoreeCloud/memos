/* Small dependency-free Markdown subset. Never interpret memo text as HTML. */
(function (root) {
  "use strict";

  function parse(source) {
    const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let fenced = null;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (fenced) {
        if (/^ {0,3}(\x60\x60\x60+|~~~+)/.test(raw) && raw.trim().startsWith(fenced.marker)) {
          blocks.push({type: "code", content: fenced.lines.join("\n"), line: fenced.line});
          fenced = null;
        } else {
          fenced.lines.push(raw);
        }
        continue;
      }
      const opening = raw.match(/^ {0,3}(\x60\x60\x60+|~~~+)([\w-]*)\s*$/);
      if (opening) {
        fenced = {marker: opening[1].substring(0, 3), line: i, lines: []};
        continue;
      }
      if (!raw.trim()) {
        blocks.push({type: "blank", line: i});
        continue;
      }
      const checklist = raw.match(/^(\s*[-*+] \[)([ xX])(\] )(.*)$/);
      if (checklist) {
        blocks.push({type: "check", text: checklist[4], checked: checklist[2].toLowerCase() === "x", line: i});
        continue;
      }
      const heading = raw.match(/^ {0,3}(#{1,6})\s+(.+)$/);
      if (heading) {
        blocks.push({type: "heading", level: heading[1].length, text: heading[2], line: i});
        continue;
      }
      if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(raw)) {
        blocks.push({type: "rule", line: i});
        continue;
      }
      const quote = raw.match(/^ {0,3}>\s?(.*)$/);
      if (quote) {
        blocks.push({type: "quote", text: quote[1], line: i});
        continue;
      }
      const bullet = raw.match(/^\s*[-*+] (.*)$/);
      if (bullet) {
        blocks.push({type: "bullet", text: bullet[1], line: i});
        continue;
      }
      const ordered = raw.match(/^\s*\d{1,4}[.)]\s+(.*)$/);
      if (ordered) {
        blocks.push({type: "ordered", text: ordered[1], line: i});
        continue;
      }
      blocks.push({type: "paragraph", text: raw, line: i});
    }
    if (fenced) blocks.push({type: "code", content: fenced.lines.join("\n"), line: fenced.line});
    return blocks;
  }

  function safeHref(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function inline(container, source, doc) {
    const text = String(source);
    const token = /(\[([^\]]{1,140})\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\x60([^\x60]+)\x60|\*([^*]+)\*)/g;
    let start = 0;
    for (const match of text.matchAll(token)) {
      const index = match.index ?? 0;
      if (index > start) container.append(doc.createTextNode(text.slice(start, index)));
      let element;
      if (match[2] !== undefined) {
        const href = safeHref(match[3]);
        if (href) {
          element = doc.createElement("a");
          element.href = href;
          element.target = "_blank";
          element.rel = "noopener noreferrer";
          element.textContent = match[2];
        }
      } else if (match[4] !== undefined) {
        element = doc.createElement("strong"); element.textContent = match[4];
      } else if (match[5] !== undefined) {
        element = doc.createElement("code"); element.textContent = match[5];
      } else if (match[6] !== undefined) {
        element = doc.createElement("em"); element.textContent = match[6];
      }
      if (element) container.append(element);
      else container.append(doc.createTextNode(match[0]));
      start = index + match[0].length;
    }
    if (start < text.length) container.append(doc.createTextNode(text.slice(start)));
  }

  function render(source, {document: doc = root.document, onChecklistChange} = {}) {
    if (!doc) throw new Error("DOM document is required to render Markdown");
    const fragment = doc.createDocumentFragment();
    let currentList = null, currentType = "";
    for (const block of parse(source)) {
      if (["check", "bullet", "ordered"].includes(block.type)) {
        const type = block.type === "ordered" ? "ol" : "ul";
        if (!currentList || type !== currentType) {
          currentType = type;
          currentList = doc.createElement(type);
          fragment.append(currentList);
        }
        const li = doc.createElement("li");
        if (block.type === "check") {
          li.className = "check-item";
          const label = doc.createElement("label");
          const checkbox = doc.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = block.checked;
          checkbox.addEventListener("change", () => {
            if (typeof onChecklistChange === "function") {
              onChecklistChange(block.line, checkbox.checked);
            }
          });
          label.append(checkbox);
          const text = doc.createElement("span");
          inline(text, block.text, doc);
          label.append(text);
          li.append(label);
        } else {
          inline(li, block.text, doc);
        }
        currentList.append(li);
        continue;
      }
      currentList = null; currentType = "";
      if (block.type === "blank") continue;
      const tag = block.type === "heading" ? "h" + block.level
        : block.type === "quote" ? "blockquote"
        : block.type === "rule" ? "hr"
        : block.type === "code" ? "pre" : "p";
      const node = doc.createElement(tag);
      if (block.type === "code") {
        const code = doc.createElement("code");
        code.textContent = block.content;
        node.append(code);
      } else if (block.text !== undefined) {
        inline(node, block.text, doc);
      }
      fragment.append(node);
    }
    return fragment;
  }

  const API = {parse, safeHref, render};
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.GCMemosMarkdown = API;
})(typeof window !== "undefined" ? window : globalThis);
