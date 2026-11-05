/* GoreeCloud Memos: same-origin client, safe text rendering, no external scripts. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const state = {token:"",folder:"active",tag:"",q:"",memos:[],editing:null,
    layout:localStorage.getItem("gcmemos-layout")==="list"?"list":"masonry",pinnedCollapsed:localStorage.getItem("gcmemos-pin-collapsed")==="true",request:0};
  const folders={active:"All memos",pinned:"Pinned memos",archive:"Archive",trash:"Trash"};
  document.documentElement.dataset.mode=localStorage.getItem("gcmemos-mode")==="dark"?"dark":"light";
  function make(tag,css,text){const v=document.createElement(tag);if(css)v.className=css;if(text!==undefined)v.textContent=text;return v;}
  let tTimer;
  function toast(message){const v=el("toast");v.textContent=message;v.classList.add("visible");clearTimeout(tTimer);tTimer=setTimeout(()=>v.classList.remove("visible"),2800);}
  async function api(path,opt={}){
    const headers={Authorization:"Bearer "+state.token};
    if(opt.body!==undefined)headers["Content-Type"]="application/json";
    const res=await fetch(path,{...opt,headers:{...headers,...(opt.headers||{})},cache:"no-store",credentials:"omit"});
    let data;try{data=await res.json();}catch{data={};}
    if(!res.ok){const err=new Error(data.error||"Request failed");err.status=res.status;err.current=data.current;throw err;}
    return data;
  }
  const key=id=>"gcmemos:draft:"+(id||"new");
  let previewActive=false;
  function renderPreview(){
    if(!window.GCMemosMarkdown) return;
    const node=window.GCMemosMarkdown.render(el("editContent").value,{
      onChecklistChange:(line,checked)=>{
        const lines=el("editContent").value.replace(/\r\n?/g,"\n").split("\n");
        if(!lines[line]||!/^\s*[-*+] \[[ xX]\] /.test(lines[line])) return;
        lines[line]=lines[line].replace(/^(\s*[-*+] \[)[ xX](\] )/,(_,a,b)=>a+(checked?"x":" ")+b);
        el("editContent").value=lines.join("\n");
        sessionStorage.setItem(key(state.editing?.id),el("editContent").value);
        renderPreview();
        toast("Checklist updated. Save memo to keep changes.");
      }
    });
    el("editPreview").replaceChildren(node);
  }
  function setPreview(value){
    previewActive=value;
    el("editContent").hidden=value;
    el("editPreview").hidden=!value;
    el("rawMode").setAttribute("aria-pressed",String(!value));
    el("previewMode").setAttribute("aria-pressed",String(value));
    if(value) renderPreview();
  }
  function fail(err){if(err.status===401){state.token="";el("shell").hidden=true;el("authScreen").hidden=false;}toast(err.message||"Request failed");}
  function layout(type){
    state.layout=type;localStorage.setItem("gcmemos-layout",type);
    ["notesGrid","pinnedGrid"].forEach(id=>el(id).classList.toggle("list",type==="list"));
    for(const name of ["masonry","list"]){const b=el(name+"Btn");b.classList.toggle("active",type===name);b.setAttribute("aria-pressed",String(type===name));}
  }
  function card(memo){
    const v=make("article","memo-card");v.dataset.color=memo.color;v.tabIndex=0;
    v.setAttribute("role","button");v.setAttribute("aria-label","Edit memo: "+(memo.title||"Untitled memo"));
    if(memo.title.trim())v.append(make("h3","",memo.title.trim()));
    if(memo.content)v.append(make("p","",memo.content.slice(0,1700)));
    if(memo.tags&&memo.tags.length){
      const wrap=make("div","card-tags");for(const tag of memo.tags.slice(0,6))wrap.append(make("span","card-tag","#"+tag));v.append(wrap);
    }
    const foot=make("div","card-foot"),date=new Date(memo.updated_at);
    foot.append(make("span","",Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(date)));
    foot.append(make("span","pin-mark",memo.pinned?"✦ Pinned":"↗ Open"));v.append(foot);
    v.addEventListener("click",()=>open(memo));
    v.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open(memo);}});
    return v;
  }
  function render(){
    el("pageTitle").textContent=folders[state.folder];
    el("subtitle").textContent=state.tag?"Notes tagged #"+state.tag:state.q?"Search results for “"+state.q+"”":"Capture the little things that matter.";
    document.querySelectorAll("[data-folder]").forEach(b=>{const selected=b.dataset.folder===state.folder;b.classList.toggle("selected",selected);if(selected)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
    const all=state.folder==="pinned"?state.memos.filter(m=>m.pinned):state.memos;
    const pinned=state.folder==="active"?all.filter(m=>m.pinned):[];
    const rest=state.folder==="active"?all.filter(m=>!m.pinned):all;
    el("pinnedSection").hidden=pinned.length===0;el("pinnedGrid").hidden=state.pinnedCollapsed;el("pinToggle").textContent=state.pinnedCollapsed?"Expand":"Collapse";el("pinToggle").setAttribute("aria-expanded",String(!state.pinnedCollapsed));el("pinnedGrid").replaceChildren(...pinned.map(card));
    el("notesGrid").replaceChildren(...rest.map(card));el("notesSection").hidden=rest.length===0;el("empty").hidden=all.length>0;
    el("sectionTitle").textContent=state.folder==="active"?"Recent memos":folders[state.folder];
    el("count").textContent=rest.length+" "+(rest.length===1?"memo":"memos");
    const tagSet=[...new Set(state.memos.flatMap(m=>m.tags||[]))].sort((a,b)=>a.localeCompare(b));
    el("tags").replaceChildren(...tagSet.slice(0,40).map(tag=>{const b=make("button","tag-pill","#"+tag);b.classList.toggle("selected",state.tag===tag);b.onclick=()=>{state.tag=state.tag===tag?"":tag;load();};return b;}));
    layout(state.layout);
  }
  async function load(){
    const request=++state.request;
    const params=new URLSearchParams({folder:state.folder==="pinned"?"active":state.folder,q:state.q,tag:state.tag});
    try{const notes=await api("/api/v1/memos?"+params.toString());if(request!==state.request)return;state.memos=notes;render();}catch(err){fail(err);}
  }
  function open(memo=null){
    state.editing=memo;el("editorTitle").textContent=memo?"EDIT MEMO · VERSION "+memo.version:"NEW MEMO";
    el("editTitle").value=memo?.title||"";
    el("editContent").value=sessionStorage.getItem(key(memo?.id))??memo?.content??"";
    el("editColor").value=memo?.color||"paper";el("editPin").checked=Boolean(memo?.pinned);
    el("editArchive").checked=Boolean(memo?.archived);el("duplicateBtn").hidden=!memo;
    el("trashBtn").hidden=!memo;el("trashBtn").textContent=memo?.deleted?"Restore memo":"Move to trash";
    el("saveBtn").textContent=memo?"Save changes":"Create memo";
    setPreview(false);
    el("editor").showModal();el("editContent").focus();
  }
  function clearDraft(){sessionStorage.removeItem(key(state.editing?.id));}
  async function save(){
    const memo=state.editing,body={title:el("editTitle").value,content:el("editContent").value,color:el("editColor").value,pinned:el("editPin").checked,archived:el("editArchive").checked};
    try{
      if(memo)await api("/api/v1/memos/"+memo.id,{method:"PATCH",body:JSON.stringify({...body,version:memo.version})});
      else await api("/api/v1/memos",{method:"POST",body:JSON.stringify(body)});
      clearDraft();el("editor").close();toast(memo?"Memo updated":"Memo created");await load();
    }catch(err){if(err.status===409)toast("Memo changed elsewhere. Copy your draft before refreshing.");else fail(err);}
  }
  el("authForm").addEventListener("submit",async e=>{
    e.preventDefault();state.token=el("accessToken").value.trim();
    try{await api("/api/v1/memos?folder=active");el("authScreen").hidden=true;el("shell").hidden=false;el("accessToken").value="";await load();}
    catch(err){el("authError").textContent=err.message;state.token="";}
  });
  el("newBtn").onclick=()=>open();el("emptyNew").onclick=()=>open();el("closeEditor").onclick=()=>el("editor").close();el("pinToggle").onclick=()=>{state.pinnedCollapsed=!state.pinnedCollapsed;localStorage.setItem("gcmemos-pin-collapsed",String(state.pinnedCollapsed));render();};
  el("editorForm").addEventListener("submit",e=>{e.preventDefault();save();});
  el("editContent").addEventListener("input",()=>{sessionStorage.setItem(key(state.editing?.id),el("editContent").value);if(previewActive)renderPreview();});
  el("rawMode").onclick=()=>setPreview(false);
  el("previewMode").onclick=()=>setPreview(true);
  el("quickContent").value=sessionStorage.getItem("gcmemos:quick")||"";
  el("quickContent").addEventListener("input",()=>sessionStorage.setItem("gcmemos:quick",el("quickContent").value));
  el("quickSave").onclick=async()=>{
    const content=el("quickContent").value.trim();if(!content)return toast("Write a thought to save");
    try{await api("/api/v1/memos",{method:"POST",body:JSON.stringify({content})});el("quickContent").value="";sessionStorage.removeItem("gcmemos:quick");toast("Your thought is saved");await load();}catch(err){fail(err);}
  };
  el("duplicateBtn").onclick=async()=>{
    if(!state.editing)return;
    try{await api("/api/v1/memos/"+state.editing.id+"/duplicate",{method:"POST",body:"{}"});el("editor").close();toast("Memo duplicated");await load();}catch(err){fail(err);}
  };
  el("trashBtn").onclick=async()=>{
    const memo=state.editing;if(!memo)return;
    try{await api("/api/v1/memos/"+memo.id,{method:"PATCH",body:JSON.stringify({version:memo.version,deleted:!memo.deleted})});clearDraft();el("editor").close();toast(memo.deleted?"Memo restored":"Memo moved to trash");await load();}catch(err){fail(err);}
  };
  document.querySelectorAll("[data-folder]").forEach(b=>b.addEventListener("click",()=>{state.folder=b.dataset.folder;state.tag="";state.q="";el("search").value="";load();}));
  let sTimer;el("search").addEventListener("input",()=>{clearTimeout(sTimer);sTimer=setTimeout(()=>{state.q=el("search").value.trim();load();},180);});
  el("masonryBtn").onclick=()=>layout("masonry");el("listBtn").onclick=()=>layout("list");layout(state.layout);
  el("themeBtn").onclick=()=>{const next=document.documentElement.dataset.mode==="dark"?"light":"dark";document.documentElement.dataset.mode=next;localStorage.setItem("gcmemos-mode",next);};
  el("exportBtn").onclick=async()=>{
    try{const result=await api("/api/v1/export"),blob=new Blob([JSON.stringify(result,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=make("a");a.href=url;a.download="goreecloud-memos-export.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Export downloaded");
    }catch(err){fail(err);}
  };
  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if(!el("shell").hidden)el("search").focus();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="n"){e.preventDefault();if(!el("shell").hidden)open();}
  });
})();
