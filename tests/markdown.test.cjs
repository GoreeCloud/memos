"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Markdown = require("../web/markdown.js");

class FakeNode {
  constructor(tag = "#fragment") {
    this.tag = tag;
    this.children = [];
    this.textContent = "";
    this.events = new Map();
  }
  append(node) { this.children.push(node); }
  addEventListener(type, listener) { this.events.set(type, listener); }
}
const document = {
  createElement: name => new FakeNode(name),
  createDocumentFragment: () => new FakeNode(),
  createTextNode: text => Object.assign(new FakeNode("#text"), {textContent: text})
};
function all(node) { return [node, ...(node.children || []).flatMap(all)]; }

test("parse supports headings, checkboxes, lists, quotes and code safely", () => {
  const nodes = Markdown.parse("# Daily journal\n- [ ] Prepare #work\n- [x] Done\n> A thought\n" +
    "~~~js\nconst x = '<script>';\n~~~\n1. First");
  assert.deepEqual(nodes.map(n => n.type),
    ["heading", "check", "check", "quote", "code", "ordered"]);
  assert.equal(nodes[1].checked, false);
  assert.equal(nodes[2].checked, true);
  assert.equal(nodes[4].content, "const x = '<script>';");
  assert.equal(nodes[1].line, 1);
});

test("render uses DOM elements without interpreting HTML", () => {
  const root = Markdown.render("# Hello\n<img src=x onerror=alert(1)>\n" +
    "[safe](https://example.com/docs) [bad](javascript:alert(1))", {document});
  const nodes = all(root);
  assert.ok(nodes.some(n => n.tag === "h1"));
  assert.ok(nodes.some(n => n.textContent === "<img src=x onerror=alert(1)>"));
  assert.equal(nodes.filter(n => n.tag === "img").length, 0);
  assert.equal(nodes.filter(n => n.tag === "script").length, 0);
  const links = nodes.filter(n => n.tag === "a");
  assert.equal(links.length, 1);
  assert.equal(links[0].href, "https://example.com/docs");
  assert.equal(links[0].rel, "noopener noreferrer");
});

test("interactive checklist reports source line and new value", () => {
  const events = [];
  const root = Markdown.render("Intro\n- [ ] One\n- [x] Two", {
    document,
    onChecklistChange: (line, checked) => events.push([line, checked])
  });
  const checkboxes = all(root).filter(n => n.tag === "input");
  assert.equal(checkboxes.length, 2);
  assert.deepEqual(checkboxes.map(n => n.checked), [false, true]);
  checkboxes[0].checked = true;
  checkboxes[0].events.get("change")();
  assert.deepEqual(events, [[1, true]]);
});

test("unsafe links are never promoted to anchors", () => {
  for (const target of ["javascript:alert(1)", "data:text/html,hello", "file:///etc/passwd"]) {
    assert.equal(Markdown.safeHref(target), null);
  }
  assert.equal(Markdown.safeHref("https://example.org/x"), "https://example.org/x");
});
