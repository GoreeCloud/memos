"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "web", "style.css"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "web", "app.js"), "utf8");

test("keyboard-focus styles cover memo cards, search, and quick capture", () => {
  assert.match(app, /v\.tabIndex=0/);
  assert.match(app, /e\.key==="Enter"\|\|e\.key===" "/);
  assert.match(css, /\.memo-card:focus-visible\s*\{[^}]*outline:/);
  assert.match(css, /\.searchbox:focus-within,\.capture:focus-within\s*\{[^}]*outline:/);
});

test("reduced motion removes card hover movement", () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\s*\{\.memo-card:hover\s*\{transform:none\}\}/);
});
