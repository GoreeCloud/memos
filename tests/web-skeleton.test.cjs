"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const js=fs.readFileSync(path.join(__dirname,"../web/app.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../web/index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../web/style.css"),"utf8");
const memo={id:"123e4567-e89b-42d3-a456-426614174000",title:"Private example",
  content:"Never shown as a skeleton",color:"paper",pinned:false,
  archived:false,deleted:false,tags:[],version:1,updated_at:"2026-11-07T12:00:00Z"};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
class Element{
  constructor(tag="div"){
    this.tag=tag;this.hidden=false;this.value="";this.open=false;this.textContent="";
    this.dataset={};this.children=[];this.attributes={};this.handlers={};
    this.classList={add(){},remove(){},toggle(){}};
  }
  replaceChildren(...children){this.children=children;}
  append(...children){this.children.push(...children);}
  addEventListener(type,listener){(this.handlers[type]??=[]).push(listener);}
  setAttribute(key,value){this.attributes[key]=String(value);}
  removeAttribute(key){delete this.attributes[key];}
  close(){this.open=false;}
  focus(){this.focused=true;}
  async emit(type){
    for(const listener of this.handlers[type]??[])await listener({preventDefault(){}});
    if(type==="click"&&typeof this.onclick==="function")await this.onclick();
  }
}
function fixture({mode="held",offline=false,items=[memo]}={}){
  const values=new Map([["gcmemos:draft:new","Keep this private tab draft"]]);
  const storage={
    getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),get length(){return values.size;},
    key:i=>[...values.keys()][i]??null
  };
  const elements=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,new Element(id));
    return elements.get(id);
  };
  get("shell").hidden=true;get("authScreen").hidden=false;
  get("feedSkeleton").hidden=true;get("feedFailure").hidden=true;
  get("feedStatus").hidden=true;
  const timers=new Map();let nextTimer=0;
  const deferred=[],requests=[];
  const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
  const fetch=(url,init={})=>{
    requests.push({url,init});
    if(url==="/api/v1/memos?folder=active")return Promise.resolve(response(200,[]));
    if(!url.startsWith("/api/v1/memos?"))throw Error("Unexpected request: "+url);
    if(mode==="failure")return Promise.resolve(response(503,{error:"Test feed error"}));
    if(mode==="unauthorized")return Promise.resolve(response(401,{error:"Access expired"}));
    if(mode==="ready")return Promise.resolve(response(200,items));
    return new Promise((resolve,reject)=>{
      const pending={resolve:data=>resolve(response(200,data)),reject};
      init.signal?.addEventListener("abort",()=>reject(new Error("Aborted")),{once:true});
      deferred.push(pending);
    });
  };
  const doc={documentElement:new Element("html"),getElementById:get,
    createElement:tag=>new Element(tag),querySelectorAll:()=>[],addEventListener(){}};
  vm.runInNewContext(js,{
    document:doc,window:{confirm:()=>true},localStorage:storage,sessionStorage:storage,
    URLSearchParams,Date,Intl,AbortController,
    navigator:{get onLine(){return !offline;}},
    fetch,console,
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},
    clearTimeout:id=>timers.delete(id)
  },{filename:"web/app.js",timeout:1500});
  return {
    get,requests,deferred,storage,
    setMode(value){mode=value;},
    setOffline(value){offline=value;},
    tick(ms){for(const [id,t] of [...timers])if(t.ms<=ms){timers.delete(id);t.fn();}},
    resolveFeed(data=items){const p=deferred.shift();assert.ok(p,"pending request");p.resolve(data);},
    rejectFeed(error=Error("Network lost")){const p=deferred.shift();assert.ok(p,"pending request");p.reject(error);},
    login(){
      get("accessToken").value="placeholder-token-for-test";
      return get("authForm").emit("submit");
    }
  };
}
test("the skeleton has matched placeholder cards, no fabricated memo data or unauthenticated visibility",()=>{
  assert.match(html,/id="shell" hidden/);
  assert.match(html,/id="feedStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.ok(html.indexOf('id="feedStatus"')<html.indexOf('id="feedRegion"'));
  assert.match(html,/id="feedRegion"[^>]*role="region"[^>]*aria-busy="false"/);
  assert.match(html,/id="feedSkeleton"[^>]*aria-hidden="true"[^>]*hidden/);
  assert.equal((html.match(/class="memo-card memo-skeleton-card"/g)||[]).length,4);
  assert.match(css,/#feedSkeleton\[hidden\]/);
  assert.match(css,/--gc-surface-tonal/);
  assert.match(css,/--gc-outline/);
  assert.match(css,/forced-colors:active/);
  const custom=css.slice(css.indexOf("/* GoreeCloud UI C36 skeleton geometry"));
  assert.doesNotMatch(custom,/\banimation\s*:/,"static skeleton does not animate or shimmer");
});
test("delayed authenticated feed shows only decorative skeletons, then real data",async()=>{
  const env=fixture();
  assert.equal(env.get("feedSkeleton").hidden,true);
  const login=env.login();
  await turn();
  assert.equal(env.get("shell").hidden,false);
  assert.equal(env.get("feedRegion").attributes["aria-busy"],"true");
  assert.equal(env.get("feedSkeleton").hidden,true,"avoid fast-load flashing");
  env.tick(120);
  assert.equal(env.get("feedSkeleton").hidden,false);
  assert.equal(env.get("notesGrid").children.length,0);
  assert.equal(env.get("feedStatus").textContent,"Loading memos…");
  env.resolveFeed();
  await login;
  assert.equal(env.get("feedSkeleton").hidden,true);
  assert.equal(env.get("feedRegion").attributes["aria-busy"],"false");
  assert.equal(env.get("notesGrid").children.length,1);
  assert.equal(env.get("feedStatus").textContent,"1 memo loaded.");
  assert.ok(!env.get("feedStatus").hidden);
});
test("request failures clear previous private memo content and expose a real retry",async()=>{
  const env=fixture({mode:"ready"});
  await env.login();
  assert.equal(env.get("notesGrid").children.length,1);
  env.setMode("failure");
  env.get("search").value="fresh filter";
  await env.get("search").emit("input");
  env.tick(180);
  await turn();
  assert.equal(env.get("notesGrid").children.length,0,"old private cards cannot remain visible");
  assert.equal(env.get("feedSkeleton").hidden,true);
  assert.equal(env.get("feedFailure").hidden,false);
  assert.equal(env.get("feedRegion").attributes["aria-busy"],"false");
  assert.equal(env.get("feedStatus").textContent,"Unable to load memos.");
  env.setMode("ready");
  await env.get("feedRetry").emit("click");
  assert.equal(env.get("feedFailure").hidden,true);
  assert.equal(env.get("notesGrid").children.length,1);
  assert.equal(env.get("search").focused,true,"explicit retry returns focus to search");
});
test("offline state makes no protected feed request and recovers through retry",async()=>{
  const env=fixture({mode:"ready",offline:true});
  await env.login();
  assert.equal(env.requests.length,1,"only the initial token validation reached the server");
  assert.equal(env.get("feedFailureTitle").textContent,"You're offline");
  assert.equal(env.get("feedStatus").textContent,"Offline: memos unavailable.");
  env.setOffline(false);
  await env.get("feedRetry").emit("click");
  assert.equal(env.get("notesGrid").children.length,1);
  assert.equal(env.get("feedFailure").hidden,true);
});
test("timeout resolves busy state to a visible error and never leaves a skeleton behind",async()=>{
  const env=fixture();
  const login=env.login();
  await turn();
  env.tick(120);
  env.tick(12000);
  await login;
  assert.equal(env.get("feedSkeleton").hidden,true);
  assert.equal(env.get("feedRegion").attributes["aria-busy"],"false");
  assert.equal(env.get("feedFailureTitle").textContent,"Loading timed out");
  assert.equal(env.get("feedStatus").textContent,"Memo loading timed out.");
});
test("locking during in-flight loading clears token-facing content and blocks stale completion",async()=>{
  const env=fixture();
  const login=env.login();
  await turn();
  env.tick(120);
  await env.get("lockWorkspaceBtn").emit("click");
  assert.equal(env.get("shell").hidden,true);
  assert.equal(env.get("authScreen").hidden,false);
  assert.equal(env.get("feedSkeleton").hidden,true);
  assert.equal(env.get("feedStatus").hidden,true);
  assert.equal(env.get("feedRegion").attributes["aria-busy"],"false");
  assert.equal(env.storage.getItem("gcmemos:draft:new"),"Keep this private tab draft");
  env.resolveFeed();
  await login;
  assert.equal(env.get("notesGrid").children.length,0,"late fetch cannot repopulate locked workspace");
});
test("superseded slow request cannot overwrite a newer successful query",async()=>{
  const env=fixture({mode:"ready"});
  await env.login();
  env.setMode("held");
  env.get("search").value="older query";
  await env.get("search").emit("input");env.tick(180);await turn();
  assert.equal(env.deferred.length,1);
  env.setMode("ready");
  env.get("search").value="new query";
  await env.get("search").emit("input");env.tick(180);await turn();
  assert.equal(env.get("notesGrid").children.length,1);
  assert.equal(env.get("feedStatus").textContent,"1 memo loaded.");
  env.rejectFeed();
  await turn();
  assert.equal(env.get("notesGrid").children.length,1);
  assert.equal(env.get("feedFailure").hidden,true);
  assert.equal(env.get("feedRegion").attributes["aria-busy"],"false");
});
test("401 from an authenticated refresh locks and forgets the visible memo feed",async()=>{
  const env=fixture({mode:"ready"});
  await env.login();
  assert.equal(env.get("notesGrid").children.length,1);
  env.setMode("unauthorized");
  env.get("search").value="refresh";
  await env.get("search").emit("input");env.tick(180);await turn();
  assert.equal(env.get("shell").hidden,true);
  assert.equal(env.get("authScreen").hidden,false);
  assert.equal(env.get("notesGrid").children.length,0);
  assert.equal(env.get("feedStatus").hidden,true);
});
