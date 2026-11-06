"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../web/app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../web/index.html"), "utf8");

function storage(entries={}) {
  const values = new Map(Object.entries(entries));
  return {
    get length(){return values.size;},
    key(i){return Array.from(values.keys())[i] ?? null;},
    getItem(k){return values.has(k)?values.get(k):null;},
    setItem(k,v){values.set(k,String(v));},
    removeItem(k){values.delete(k);},
    keys(){return [...values.keys()];}
  };
}
class Element {
  constructor(){
    this.value="";this.textContent="";this.open=false;this.hidden=false;
    this.dataset={};this.children=[];
    this.classList={add(){},remove(){},toggle(){}};
  }
  addEventListener(){}
  setAttribute(){}
  removeAttribute(){}
  replaceChildren(...nodes){this.children=nodes;}
  close(){this.open=false;}
}
function fixture(seed, confirmed=true){
  const sessionStorage=storage(seed);
  const localStorage=storage({"gcmemos-layout":"list","gcmemos-mode":"dark"});
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,new Element());
    return elements.get(id);
  };
  let confirms=0,requests=0;
  const document={
    documentElement:new Element(),
    getElementById:get,
    querySelectorAll:()=>[],
    addEventListener(){},
    createElement:()=>new Element()
  };
  vm.runInNewContext(script, {
    document, sessionStorage, localStorage,
    window:{confirm(){confirms++;return confirmed;}},
    URLSearchParams, Date, Intl,
    setTimeout:()=>1,clearTimeout:()=>{},
    fetch:async()=>{requests++;throw Error("Unexpected server request");},
    console
  }, {filename:"web/app.js",timeout:1500});
  return {
    get, sessionStorage, localStorage,
    get confirms(){return confirms;},
    get requests(){return requests;},
    clearInside(){get("clearDraftsBtn").onclick();},
    clearBeforeLogin(){get("clearLockedDraftsBtn").onclick();}
  };
}

test("privacy controls are present in authenticated and locked browser views",()=>{
  assert.match(html,/<button(?=[^>]*id="clearDraftsBtn")(?=[^>]*type="button")[^>]*>/);
  assert.match(html,/<button(?=[^>]*id="clearLockedDraftsBtn")(?=[^>]*type="button")[^>]*>/);
  assert.match(html,/Unsaved memo text may remain in this tab until cleared/);
});

test("cancel never erases drafts or closes an open editor",()=>{
  const env=fixture({"gcmemos:quick":"Quick note","gcmemos:draft:new":"Unsaved memo"},false);
  env.get("editor").open=true;
  env.get("quickContent").value="Quick note";
  env.clearInside();
  assert.equal(env.confirms,1);
  assert.equal(env.sessionStorage.getItem("gcmemos:quick"),"Quick note");
  assert.equal(env.sessionStorage.getItem("gcmemos:draft:new"),"Unsaved memo");
  assert.equal(env.get("editor").open,true);
  assert.equal(env.get("quickContent").value,"Quick note");
  assert.equal(env.requests,0);
});

test("confirmed cleanup removes only Memos tab drafts and resets exposed input",()=>{
  const env=fixture({
    "gcmemos:draft:new":"New private thought",
    "other-site-or-feature":"Keep unrelated data",
    "gcmemos:quick":"Quick private thought",
    "gcmemos:draft:1234":"Edited private thought",
    "keep-other":"preserve"
  });
  env.get("editor").open=true;
  env.get("quickContent").value="Quick private thought";
  env.get("revisionPanel").open=true;
  env.get("revisionList").children=["older private text"];
  env.get("accessToken").value="typed-but-never-submitted-token";
  env.clearInside();
  assert.equal(env.confirms,1);
  assert.deepEqual(env.sessionStorage.keys(),["other-site-or-feature","keep-other"]);
  assert.equal(env.sessionStorage.getItem("gcmemos:quick"),null);
  assert.equal(env.get("quickContent").value,"");
  assert.equal(env.get("editor").open,false);
  assert.equal(env.get("revisionPanel").open,false);
  assert.equal(env.get("revisionList").children.length,0);
  assert.equal(env.get("accessToken").value,"typed-but-never-submitted-token");
  assert.equal(env.localStorage.getItem("gcmemos-layout"),"list");
  assert.equal(env.localStorage.getItem("gcmemos-mode"),"dark");
  assert.equal(env.requests,0);
});

test("cleanup works from login screen without token or server access",()=>{
  const env=fixture({"gcmemos:draft:old":"Old draft"});
  env.clearBeforeLogin();
  assert.equal(env.confirms,1);
  assert.equal(env.sessionStorage.getItem("gcmemos:draft:old"),null);
  assert.equal(env.requests,0);
});

test("an empty Memos draft store is a no-op without confirmation",()=>{
  const env=fixture({"keep-other":"not our key"});
  env.get("editor").open=true;
  env.clearInside();
  assert.equal(env.confirms,0);
  assert.equal(env.get("editor").open,true);
  assert.equal(env.sessionStorage.getItem("keep-other"),"not our key");
  assert.match(env.get("toast").textContent,/No unsaved Memos drafts/);
});
