// Immutable Foundations v1.0.1 compatibility probe for Memos.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const base='https://github.com/GoreeCloud/gc-ui/releases/download/foundations-v1.0.1/';
const name='goreecloud-gc-ui-1.0.1.tgz';
const sha='275d7e6dc9503b2e74b3190bcecf176d73d2345860e8a20fa5faa3b326cd2298';
async function fetchAsset(filename){
 const r=await fetch(base+filename,{signal:AbortSignal.timeout(30000)});
 assert.equal(r.ok,true,'Cannot fetch '+filename);
 const bytes=Buffer.from(await r.arrayBuffer());
 assert.ok(bytes.length>0&&bytes.length<1000000,'Unexpected release asset size');
 return bytes;
}
 const [archive,checksum]=await Promise.all([fetchAsset(name),fetchAsset('SHA256SUMS')]);
 assert.equal(createHash('sha256').update(archive).digest('hex'),sha);
 assert.equal(checksum.toString('utf8').trim(),sha+'  '+name);
const tar = gunzipSync(archive);
assert.ok(tar.includes(Buffer.from('Apache License')), 'License missing from pinned archive');
console.log('Foundations v1.0.1 immutable archive verified');
