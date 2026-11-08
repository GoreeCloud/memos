"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "../web/app.js"), "utf8");
const markup = fs.readFileSync(path.join(__dirname, "../web/index.html"), "utf8");
const first = {
  id:"123e4567-e89b-42d3-a456-426614174000", title:"Current note",
  content:"Current private text", version:3, pinned:false, archived:false,
  deleted:false, color:"paper", tags:[], updated_at:"2026-11-05T12:00:00Z"
};
const second = {...first, id:"123e4567-e89b-42d3-a456-426614174001",
  title:"Second note", version:1};
const history = [
  {version:2,title:"Earlier title",content:"<img src=x onerror=alert(1)>",
   saved_at:"2026-11-05T11:00:00Z"},
  {version:1,title:"Original",content:"Old private text",
   saved_at:"2026-11-05T10:00:00Z"}
];

class Node {
  constructor(tag="div") {
    this.tag=tag;this.children=[];this.dataset={};this.handlers={};
    this.attributes={};this.hidden=false;this.open=false;this.disabled=false;
    this.value="";this.textContent="";this.checked=false;this.className="";
    const flags=new Set();
    this.classList={
      add:x=>flags.add(x), remove:x=>flags.delete(x),
      toggle:(x,on)=>on===undefined?(flags.has(x)?(flags.delete(x),false):(flags.add(x),true)):
        (on?(flags.add(x),true):(flags.delete(x),false)),
      contains:x=>flags.has(x)
    };
  }
  append(...nodes) {this.children.push(...nodes);}
  replaceChildren(...nodes) {this.children=[...nodes];}
  addEventListener(type,callback) {(this.handlers[type]??=[]).push(callback);}
  setAttribute(key,value) {this.attributes[key]=value;}
  removeAttribute(key) {delete this.attributes[key];}
  focus() {this.focused=true;}
  showModal() {this.open=true;}
  close() {this.open=false;}
  async emit(type,data={}) {
    for(const listener of this.handlers[type]??[]){
      await listener({preventDefault(){},...data});
    }
    if(type==="click"&&typeof this.onclick==="function") await this.onclick();
  }
}
function descendants(node) {
  return [node,...node.children.flatMap(descendants)];
}
function fixture(options={}) {
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,new Node(id));
    return elements.get(id);
  };
  const makeStorage=()=>{
    const values=new Map();
    return {getItem:key=>values.has(key)?values.get(key):null,
      setItem:(key,value)=>values.set(key,String(value)),
      removeItem:key=>values.delete(key)};
  };
  const sessionStorage=makeStorage(),localStorage=makeStorage(),requests=[];
  const downloads=[],exportedBlobs=[];
  let confirms=0,allowRestore=Boolean(options.allowRestore),patchConflict=false;
  let heldHistoryResolve=null;
  const response=(status,data)=>({
    ok:status>=200&&status<300,status,
    json:async()=>data
  });
  const fetch=async(url,init={})=>{
    requests.push({url,init});
    if(url==="/api/v1/export"){
      if(options.exportError)return response(500,{error:"Export unavailable"});
      return response(200,{
        format:"goreecloud-memos-v2",
        memos:[first,{...second,deleted:true}],
        revisions:history,
      });
    }
    if(url.startsWith("/api/v1/memos?"))return response(200,[first,second]);
    if(url.endsWith("/revisions")){
      if(options.holdFirstHistory&&url.includes(first.id))
        return new Promise(resolve=>{heldHistoryResolve=data=>resolve(response(200,data));});
      return response(200,url.includes(first.id)?history:[]);
    }
    if(url==="/api/v1/memos/"+first.id&&init.method==="PATCH"){
      if(patchConflict)return response(409,{error:"Version conflict",current:first});
      return response(200,{...first,...JSON.parse(init.body),version:first.version+1});
    }
    throw Error("Unexpected request "+url);
  };
  const doc={
    documentElement:new Node("html"),
    getElementById:get,
    createElement:tag=>{
      const node=new Node(tag);
      if(tag==="a")node.click=()=>downloads.push({
        href:node.href,filename:node.download
      });
      return node;
    },
    querySelectorAll:()=>[],
    addEventListener(){}
  };
  vm.runInNewContext(appSource,{
    document:doc,window:{confirm:()=>{confirms++;return allowRestore;}},
    localStorage,sessionStorage,fetch,URLSearchParams,Date,Intl,
    Blob:class{
      constructor(parts,opts){this.parts=parts;this.options=opts;exportedBlobs.push(this);}
    },
    URL:{
      createObjectURL:()=> "blob:test-private-export",
      revokeObjectURL:()=>{},
    },
    setTimeout:()=>0,clearTimeout:()=>{},console
  },{filename:"web/app.js",timeout:1500});
  return {
    get, requests, sessionStorage, downloads, exportedBlobs,
    async login(){
      get("accessToken").value="placeholder-token";
      await get("authForm").emit("submit");
    },
    // Date-grouped timeline containers are presentational; tests still
    // exercise the same first and second memo cards in chronological order.
    get cards(){return descendants(get("notesGrid")).filter(n=>n.tag==="article"&&n.className==="memo-card");},
    async openFirst(){
      const card=descendants(get("notesGrid")).filter(n=>n.tag==="article"&&n.className==="memo-card")[0];
      await card.emit("click");
    },
    async openSecond(){
      const card=descendants(get("notesGrid")).filter(n=>n.tag==="article"&&n.className==="memo-card")[1];
      await card.emit("click");
    },
    async expand(){
      get("revisionPanel").open=true;
      await get("revisionPanel").emit("toggle");
      await new Promise(resolve=>setImmediate(resolve));
    },
    get restores(){return descendants(get("revisionList")).filter(
      n=>n.tag==="button"&&n.textContent==="Restore this version");
    },
    get confirms(){return confirms;},
    permit(){allowRestore=true;},
    rejectPatch(){patchConflict=true;},
    resolveHeld(data){heldHistoryResolve(data);}
  };
}

test("editor exposes history only for existing memos",async()=>{
  assert.match(markup,/id="revisionPanel"[^>]*hidden/);
  const env=fixture();await env.login();await env.openFirst();
  assert.equal(env.get("revisionPanel").hidden,false);
  await env.expand();
  assert.equal(env.restores.length,2);
  const pre=descendants(env.get("revisionList")).find(n=>n.tag==="pre");
  assert.equal(pre.textContent,"<img src=x onerror=alert(1)>");
  assert.equal(descendants(env.get("revisionList")).filter(n=>n.tag==="img").length,0);
  await env.get("newBtn").emit("click");
  assert.equal(env.get("revisionPanel").hidden,true);
  assert.equal(env.get("revisionList").children.length,0);
});

test("canceling restoration never sends a PATCH or discards a draft",async()=>{
  const env=fixture();await env.login();await env.openFirst();
  const key="gcmemos:draft:"+first.id;
  env.sessionStorage.setItem(key,"Unsaved private draft");
  await env.expand();await env.restores[0].emit("click");
  assert.equal(env.confirms,1);
  assert.equal(env.requests.filter(r=>r.init.method==="PATCH").length,0);
  assert.equal(env.sessionStorage.getItem(key),"Unsaved private draft");
  assert.equal(env.get("editor").open,true);
});

test("confirmed restore creates a new version and clears draft after success",async()=>{
  const env=fixture({allowRestore:true});await env.login();await env.openFirst();
  const key="gcmemos:draft:"+first.id;
  env.sessionStorage.setItem(key,"Unsaved draft");
  await env.expand();await env.restores[0].emit("click");
  const patches=env.requests.filter(r=>r.init.method==="PATCH");
  assert.equal(patches.length,1);
  assert.deepEqual(JSON.parse(patches[0].init.body),{
    version:3,title:"Earlier title",content:"<img src=x onerror=alert(1)>"
  });
  assert.equal(patches[0].url,"/api/v1/memos/"+first.id);
  assert.equal(env.sessionStorage.getItem(key),null);
  assert.equal(env.get("editor").open,false);
});

test("409 conflict preserves the editor and its unsaved draft",async()=>{
  const env=fixture({allowRestore:true});env.rejectPatch();
  await env.login();await env.openFirst();
  const key="gcmemos:draft:"+first.id;
  env.sessionStorage.setItem(key,"Keep this draft");
  await env.expand();await env.restores[0].emit("click");
  assert.equal(env.sessionStorage.getItem(key),"Keep this draft");
  assert.equal(env.get("editor").open,true);
  assert.match(env.get("toast").textContent,/changed elsewhere/i);
});

test("delayed history from another memo cannot populate current editor",async()=>{
  const env=fixture({holdFirstHistory:true});await env.login();
  await env.openFirst();await env.expand();
  await env.openSecond();await env.expand();
  assert.equal(env.restores.length,0);
  env.resolveHeld(history);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(env.restores.length,0);
  assert.equal(descendants(env.get("revisionList")).some(
    n=>String(n.textContent).includes("Earlier title")),false);
});

test("workspace lock clears token-facing UI and memo DOM without deleting drafts",async()=>{
  assert.match(markup,/<button(?=[^>]*id="lockWorkspaceBtn")(?=[^>]*type="button")[^>]*>/);
  const env=fixture();
  await env.login();await env.openFirst();await env.expand();
  const draftKey="gcmemos:draft:"+first.id;
  env.sessionStorage.setItem(draftKey,"Unsaved private text");
  env.sessionStorage.setItem("gcmemos:quick","Private quick capture");
  env.get("quickContent").value="Private quick capture";
  const requestsBefore=env.requests.length;
  await env.get("lockWorkspaceBtn").emit("click");
  assert.equal(env.requests.length,requestsBefore);
  assert.equal(env.get("shell").hidden,true);
  assert.equal(env.get("authScreen").hidden,false);
  assert.equal(env.get("editor").open,false);
  assert.equal(env.get("editContent").value,"");
  assert.equal(env.get("quickContent").value,"");
  assert.equal(env.get("notesGrid").children.length,0);
  assert.equal(env.get("pinnedGrid").children.length,0);
  assert.equal(env.get("revisionList").children.length,0);
  assert.equal(env.get("revisionPanel").open,false);
  assert.equal(env.get("accessToken").value,"");
  assert.equal(env.sessionStorage.getItem(draftKey),"Unsaved private text");
  assert.equal(env.sessionStorage.getItem("gcmemos:quick"),"Private quick capture");
});

test("reauthentication after lock uses only the new token and restores quick draft",async()=>{
  const env=fixture();
  await env.login();
  env.sessionStorage.setItem("gcmemos:quick","Restore only my unsaved quick text");
  await env.get("lockWorkspaceBtn").emit("click");
  const before=env.requests.length;
  env.get("accessToken").value="fresh-in-memory-token-for-test";
  await env.get("authForm").emit("submit");
  const after=env.requests.slice(before);
  assert.ok(after.length>=2);
  for(const req of after){
    assert.equal(req.init.headers.Authorization,"Bearer fresh-in-memory-token-for-test");
  }
  assert.equal(env.get("shell").hidden,false);
  assert.equal(env.get("authScreen").hidden,true);
  assert.equal(env.get("quickContent").value,"Restore only my unsaved quick text");
  assert.equal(env.cards.length,2);
});

test("delayed revision history cannot reappear after workspace lock",async()=>{
  const env=fixture({holdFirstHistory:true});
  await env.login();await env.openFirst();await env.expand();
  await env.get("lockWorkspaceBtn").emit("click");
  env.resolveHeld(history);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(env.get("revisionList").children.length,0);
  assert.equal(env.get("authScreen").hidden,false);
});

test("canceling plaintext browser export makes no export API request",async()=>{
  const env=fixture();await env.login();
  const before=env.requests.length;
  await env.get("exportBtn").emit("click");
  assert.equal(env.confirms,1);
  assert.equal(env.requests.length,before);
  assert.equal(env.downloads.length,0);
  assert.equal(env.exportedBlobs.length,0);
});

test("confirmed export preserves full memo and revision data in plaintext JSON",async()=>{
  const env=fixture({allowRestore:true});await env.login();
  await env.get("exportBtn").emit("click");
  assert.equal(env.confirms,1);
  const exports=env.requests.filter(r=>r.url==="/api/v1/export");
  assert.equal(exports.length,1);
  assert.equal(exports[0].init.headers.Authorization,"Bearer placeholder-token");
  assert.equal(exports[0].init.credentials,"omit");
  assert.equal(env.downloads.length,1);
  assert.equal(env.downloads[0].filename,"goreecloud-memos-export.json");
  assert.equal(env.exportedBlobs.length,1);
  assert.equal(env.exportedBlobs[0].options.type,"application/json");
  const saved=JSON.parse(env.exportedBlobs[0].parts[0]);
  assert.equal(saved.format,"goreecloud-memos-v2");
  assert.equal(saved.memos.length,2);
  assert.equal(saved.memos[1].deleted,true);
  assert.equal(saved.revisions.length,2);
  assert.equal(saved.revisions[1].content,"Old private text");
});

test("failed export after confirmation never creates a downloaded file",async()=>{
  const env=fixture({allowRestore:true,exportError:true});await env.login();
  await env.get("exportBtn").emit("click");
  assert.equal(env.confirms,1);
  assert.equal(env.requests.filter(r=>r.url==="/api/v1/export").length,1);
  assert.equal(env.downloads.length,0);
  assert.equal(env.exportedBlobs.length,0);
  assert.match(env.get("toast").textContent,/Export unavailable/);
});
