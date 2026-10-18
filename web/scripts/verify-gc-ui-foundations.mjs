// Immutable Foundations v1.0.0 compatibility probe for Memos.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const base='https://github.com/GoreeCloud/gc-ui/releases/download/foundations-v1.0.0/';
const name='goreecloud-gc-ui-1.0.0.tgz';
const sha='8db29188f90da8936f5452a01b2414ffe8f295092320f1d67221c4a95bc28102';
