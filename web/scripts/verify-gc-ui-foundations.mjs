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
async function fetchAsset(filename){
 const r=await fetch(base+filename,{signal:AbortSignal.timeout(30000)});
 assert.equal(r.ok,true,'Cannot fetch '+filename);
 const bytes=Buffer.from(await r.arrayBuffer());
 assert.ok(bytes.length>0&&bytes.length<1000000,'Unexpected release asset size');
 return bytes;
}
const temp=mkdtempSync(join(tmpdir(),'memos-foundations-'));
try{
 const [archive,checksum]=await Promise.all([fetchAsset(name),fetchAsset('SHA256SUMS')]);
 assert.equal(createHash('sha256').update(archive).digest('hex'),sha);
 assert.equal(checksum.toString('utf8').trim(),sha+'  '+name);
 const local=join(temp,name);
 writeFileSync(local,archive);
