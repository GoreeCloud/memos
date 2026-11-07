"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const source=fs.readFileSync(path.join(__dirname,"../web/app.js"),"utf8");
class Node {
  constructor(){
    this.value="";this.textContent="";this.hidden=false;this.open=false;
    this.dataset={};this.children=[];this.handlers={};this.attributes={};
    this.classList={add(){},remove(){},toggle(){}};
  }
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  replaceChildren(...children){this.children=children;}
  append(...children){this.children.push(...children);}
  close(){this.open=false;}
  focus(){this.focused=true;}
  async emit(type){
    for(const handler of this.handlers[type]??[])await handler({preventDefault(){}});
    if(type==="click"&&typeof this.onclick==="function")await this.onclick();
  }
}
function fixture({simulateRedirect=false}={}){
  const elements=new Map(),requests=[];
  const get=id=>{
    if(!elements.has(id))elements.set(id,new Node());
    return elements.get(id);
  };
  get("shell").hidden=true;
  const data=new Map();
  const storage={
    getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k),get length(){return data.size;},
    key:i=>[...data.keys()][i]??null
  };
  const fetch=async(url,options={})=>{
    requests.push({url,options});
    // Simulate the browser rejecting a redirect when redirect:error is supplied.
    // No URL is actually followed and no external network traffic is generated.
    if(simulateRedirect&&options.redirect==="error")
      throw Error("Mock redirect refused");
    return {ok:true,status:200,json:async()=>url==="/api/v1/memos"?{}:[]};
  };
  const document={documentElement:new Node(),getElementById:get,
    querySelectorAll:()=>[],createElement:()=>new Node(),addEventListener(){}};
  vm.runInNewContext(source,{
    document,window:{confirm:()=>false},localStorage:storage,sessionStorage:storage,
    URLSearchParams,Date,Intl,AbortController,navigator:{onLine:true},
    setTimeout:()=>1,clearTimeout:()=>{},fetch,console
  },{filename:"web/app.js",timeout:1500});
  return {get,requests,
    async login(){
      get("accessToken").value="nonsecret-placeholder-credential";
      await get("authForm").emit("submit");
    }
  };
}
const expected={
  credentials:"omit",cache:"no-store",mode:"same-origin",
  redirect:"error",referrerPolicy:"no-referrer"
};
test("all authenticated browser GETs explicitly reject redirects and cross-origin fetches",async()=>{
  const f=fixture();
  await f.login();
  assert.equal(f.get("shell").hidden,false);
  assert.equal(f.requests.length,2);
  for(const {url,options} of f.requests){
    assert.match(url,/^\/api\/v1\/memos/);
    for(const [key,value] of Object.entries(expected))
      assert.equal(options[key],value,key+" was not locked down");
    assert.equal(options.headers.Authorization,"Bearer nonsecret-placeholder-credential");
  }
});
test("authorized writes retain JSON headers while never relaxing transport controls",async()=>{
  const f=fixture();
  await f.login();
  f.get("quickContent").value="Test-only thought";
  await f.get("quickSave").onclick();
  const post=f.requests.find(req=>req.url==="/api/v1/memos"&&req.options.method==="POST");
  assert.ok(post);
  assert.equal(post.options.headers["Content-Type"],"application/json");
  assert.equal(post.options.headers.Authorization,"Bearer nonsecret-placeholder-credential");
  for(const [key,value] of Object.entries(expected))
    assert.equal(post.options[key],value);
});
test("mock redirect rejection fails login closed without showing private workspace",async()=>{
  const f=fixture({simulateRedirect:true});
  await f.login();
  assert.equal(f.requests.length,1,"failed authentication must not launch a feed");
  assert.equal(f.requests[0].options.redirect,"error");
  assert.equal(f.requests[0].options.mode,"same-origin");
  assert.equal(f.get("shell").hidden,true);
  assert.equal(f.get("authScreen").hidden,false);
  assert.match(f.get("authError").textContent,/Mock redirect refused/);
});
