/* GoreeCloud Memos: same-origin client, safe text rendering, no external scripts. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const state = {token:"",folder:"active",tag:"",q:"",memos:[],editing:null,
    layout:localStorage.getItem("gcmemos-layout")==="list"?"list":"masonry",pinnedCollapsed:localStorage.getItem("gcmemos-pin-collapsed")==="true",request:0,personalView:false,dateFilter:null,calendarCursor:new Date(new Date().getFullYear(),new Date().getMonth(),1),allTags:false,allActivity:false,promotedQuick:false};
  const folders={active:"All memos",pinned:"Pinned memos",archive:"Archive",trash:"Trash"};
  document.documentElement.dataset.mode=localStorage.getItem("gcmemos-mode")==="dark"?"dark":"light";
  function make(tag,css,text){const v=document.createElement(tag);if(css)v.className=css;if(text!==undefined)v.textContent=text;return v;}
  let tTimer,activeFeedController=null,pendingSkeletonTimer=null;
  function toast(message){const v=el("toast");v.textContent=message;v.classList.add("visible");clearTimeout(tTimer);tTimer=setTimeout(()=>v.classList.remove("visible"),2800);}
  async function api(path,opt={}){
    const headers={Authorization:"Bearer "+state.token};
    if(opt.body!==undefined)headers["Content-Type"]="application/json";
    // Bearer credentials stay on this origin and never follow HTTP redirects.
    // Explicitly override caller options to protect future API call sites.
    const res=await fetch(path,{...opt,headers:{...headers,...(opt.headers||{})},
      cache:"no-store",credentials:"omit",mode:"same-origin",redirect:"error",
      referrerPolicy:"no-referrer"});
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
  function fail(err){if(err.status===401)lockWorkspace();toast(err.message||"Request failed");}
  function layout(type){
    state.layout=type;localStorage.setItem("gcmemos-layout",type);
    ["notesGrid","pinnedGrid","feedSkeleton"].forEach(id=>el(id).classList.toggle("list",type==="list"));
    document.querySelectorAll(".timeline-card-grid").forEach(grid=>grid.classList.toggle("list",type==="list"));
    for(const name of ["masonry","list"]){const b=el(name+"Btn");b.classList.toggle("active",type===name);b.setAttribute("aria-pressed",String(type===name));}
  }
  function card(memo){
    const v=make("article","memo-card");v.dataset.color=memo.color;v.dataset.pinned=String(Boolean(memo.pinned));v.tabIndex=0;
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
  function syncFeedContext(){
    el("pageTitle").textContent=folders[state.folder];
    el("subtitle").textContent=state.tag?"Notes tagged #"+state.tag:state.q?"Search results for “"+state.q+"”":"Capture the little things that matter.";
    document.querySelectorAll("[data-folder]").forEach(b=>{const selected=b.dataset.folder===state.folder;b.classList.toggle("selected",selected);if(selected)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  }

  // Local-only calendar presentation: no server date query or cross-user activity claims.
  function dateKey(value){
    const d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime()))return "";
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  }
  function notAvailable(feature){toast("Not available yet — "+feature);}
  function renderCalendar(){
    const cursor=state.calendarCursor,year=cursor.getFullYear(),month=cursor.getMonth();
    el("calendarMonth").textContent=new Intl.DateTimeFormat(undefined,{month:"short",year:"numeric"}).format(cursor);
    const days=new Date(year,month+1,0).getDate(),offset=new Date(year,month,1).getDay();
    const count=Math.ceil((offset+days)/7)*7;
    const withMemos=new Set(state.memos.map(m=>dateKey(m.updated_at)));
    const cells=[];
    for(let i=0;i<count;i++){
      const day=new Date(year,month,i-offset+1),key=dateKey(day);
      const b=make("button","",String(day.getDate()));b.type="button";
      b.setAttribute("aria-label",new Intl.DateTimeFormat(undefined,{dateStyle:"full"}).format(day));
      b.setAttribute("aria-pressed",String(state.dateFilter===key));
      b.classList.toggle("other-month",day.getMonth()!==month);
      b.classList.toggle("selected",state.dateFilter===key);
      b.classList.toggle("has-memos",withMemos.has(key));
      b.addEventListener("click",()=>{
        state.dateFilter=state.dateFilter===key?null:key;
        state.calendarCursor=new Date(day.getFullYear(),day.getMonth(),1);
        render();
      });
      cells.push(b);
    }
    el("calendarDays").replaceChildren(...cells);
    el("clearDateFilter").hidden=!state.dateFilter;
  }
  function renderInsights(){
    renderCalendar();
    const counts=new Map();
    for(const memo of state.memos)for(const tag of memo.tags||[])counts.set(tag,(counts.get(tag)||0)+1);
    const tags=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    el("trendingTags").replaceChildren();
    for(const [tag,num] of tags.slice(0,state.allTags?40:8)){
      const b=make("button","trending-tag","#"+tag+" ");
      b.append(make("em","",String(num)));
      b.type="button";b.setAttribute("aria-pressed",String(state.tag===tag));
      b.addEventListener("click",()=>{state.tag=state.tag===tag?"":tag;state.dateFilter=null;load();});
      el("trendingTags").append(b);
    }
    if(!tags.length)el("trendingTags").append(make("p","insight-empty","No tags in this view"));
    el("allTagsBtn").textContent=state.allTags?"Show Less":"See All";
    const recent=[...state.memos].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
    el("recentNotes").replaceChildren();
    for(const memo of recent.slice(0,state.allActivity?20:5)){
      const b=make("button","recent-row");b.type="button";
      const symbol=make("span","recent-icon",memo.pinned?"⚑":"✎");
      const content=make("span","recent-body"),name=make("span","",memo.title||"Untitled memo");
      const when=new Date(memo.updated_at);
      content.append(name,make("small","",Number.isNaN(when.getTime())?"Updated":when.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})));
      b.append(symbol,content);b.setAttribute("aria-label","Open memo: "+(memo.title||"Untitled memo"));
      b.addEventListener("click",()=>open(memo));el("recentNotes").append(b);
    }
    if(!recent.length)el("recentNotes").append(make("p","insight-empty","No recent notes"));
    el("activityAllBtn").textContent=state.allActivity?"Show Less":"See All";
    el("navCount").textContent=String(state.memos.length);
    const pinned=state.folder==="pinned";
    for(const id of ["tabPinned","filterPinned"])el(id).setAttribute("aria-pressed",String(pinned));
    el("tabAll").setAttribute("aria-pressed",String(!pinned&&!state.personalView));
    el("tabMine").setAttribute("aria-pressed",String(!pinned&&state.personalView));
    el("tabAll").classList.toggle("selected",!pinned&&!state.personalView);
    el("tabMine").classList.toggle("selected",!pinned&&state.personalView);
    el("tabPinned").classList.toggle("selected",pinned);
    el("filterPinned").classList.toggle("selected",pinned);
  }
  function renderTimeline(memos){
    const groups=new Map();
    for(const memo of memos){
      const key=dateKey(memo.updated_at)||"unknown";
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(memo);
    }
    const today=dateKey(new Date()),yesterday=dateKey(new Date(Date.now()-86400000));
    const sections=[];
    for(const [date,members] of [...groups].sort((a,b)=>b[0].localeCompare(a[0]))){
      const section=make("section","timeline-group"),heading=make("div","timeline-heading");
      const headingName=date===today?"Today":date===yesterday?"Yesterday":
        date==="unknown"?"Unknown date":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(date+"T12:00:00"));
      heading.append(make("h3","",headingName),make("small","",members.length+" "+(members.length===1?"note":"notes")));
      const grid=make("div","timeline-card-grid masonry");
      grid.classList.toggle("list",state.layout==="list");
      grid.append(...members.map(card));section.append(heading,grid);sections.push(section);
    }
    el("notesGrid").classList.add("timeline-feed");
    el("notesGrid").replaceChildren(...sections);
  }
  function render(){
    syncFeedContext();
    const visible=state.dateFilter?state.memos.filter(m=>dateKey(m.updated_at)===state.dateFilter):state.memos;
    const all=state.folder==="pinned"?visible.filter(m=>m.pinned):visible;
    // The official mockup places pinned cards within their chronological day.
    // Pinned remains a filter, not a second duplicated collection.
    const pinned=[];
    const rest=all;
    el("pinnedSection").hidden=pinned.length===0;
    el("pinnedGrid").hidden=state.pinnedCollapsed;
    el("pinToggle").textContent=state.pinnedCollapsed?"Expand":"Collapse";
    el("pinToggle").setAttribute("aria-expanded",String(!state.pinnedCollapsed));
    el("pinnedGrid").replaceChildren(...pinned.map(card));
    renderTimeline(rest);
    el("notesSection").hidden=rest.length===0;
    el("notesSection").classList.toggle("active-timeline",state.folder==="active");
    el("empty").hidden=all.length>0;
    el("sectionTitle").textContent=state.folder==="active"?"Timeline":folders[state.folder];
    el("count").textContent=(state.dateFilter?"Filtered · ":"")+rest.length+" "+(rest.length===1?"note":"notes");
    const tagSet=[...new Set(state.memos.flatMap(m=>m.tags||[]))].sort((a,b)=>a.localeCompare(b));
    el("tags").replaceChildren(...tagSet.slice(0,40).map(tag=>{const b=make("button","tag-pill","#"+tag);b.classList.toggle("selected",state.tag===tag);b.onclick=()=>{state.tag=state.tag===tag?"":tag;state.dateFilter=null;load();};return b;}));
    renderInsights();
    layout(state.layout);
  }
  function feedStatus(message){
    const node=el("feedStatus");
    node.textContent=message;
    node.hidden=false;
  }
  function settleFeed(){
    clearTimeout(pendingSkeletonTimer);
    pendingSkeletonTimer=null;
    el("feedSkeleton").hidden=true;
    el("feedRegion").setAttribute("aria-busy","false");
  }
  async function load(){
    if(!state.token)return;
    const request=++state.request;
    activeFeedController?.abort("superseded");
    const controller=typeof AbortController==="function"?new AbortController():null;
    activeFeedController=controller;
    clearTimeout(pendingSkeletonTimer);
    // A new filter/search must not expose the previous private memo list.
    state.memos=[];
    el("trendingTags").replaceChildren();el("recentNotes").replaceChildren();el("navCount").textContent="";
    el("notesGrid").replaceChildren();
    el("pinnedGrid").replaceChildren();
    el("notesSection").hidden=true;
    el("pinnedSection").hidden=true;
    el("empty").hidden=true;
    el("feedFailure").hidden=true;
    el("feedSkeleton").hidden=true;
    el("feedRegion").setAttribute("aria-busy","true");
    feedStatus("Loading memos…");
    syncFeedContext();
    // Avoid flashing a placeholder for an immediately resolved request.
    pendingSkeletonTimer=setTimeout(()=>{
      if(request===state.request&&state.token)el("feedSkeleton").hidden=false;
    },120);
    const deadline=controller?setTimeout(()=>controller.abort("timeout"),12000):null;
    const params=new URLSearchParams({folder:state.folder==="pinned"?"active":state.folder,q:state.q,tag:state.tag});
    try{
      if(typeof navigator!=="undefined"&&navigator.onLine===false)throw new Error("Offline");
      const notes=await api("/api/v1/memos?"+params.toString(),controller?{signal:controller.signal}:{});
      if(request!==state.request||!state.token)return;
      if(!Array.isArray(notes))throw new Error("Unexpected memo list response");
      state.memos=notes;
      settleFeed();
      render();
      feedStatus(notes.length?notes.length+" "+(notes.length===1?"memo":"memos")+" loaded.":"No memos found.");
    }catch(err){
      if(request!==state.request||!state.token)return;
      settleFeed();
      if(err.status===401){fail(err);return;}
      const offline=typeof navigator!=="undefined"&&navigator.onLine===false;
      const timeout=controller?.signal.aborted&&controller.signal.reason==="timeout";
      el("feedFailureTitle").textContent=offline?"You're offline":timeout?"Loading timed out":"Unable to load memos";
      el("feedFailureBody").textContent=offline?"Reconnect and retry loading your private memos.":timeout?
        "The request did not respond in time. Check your connection and retry.":
        "Your memos could not be loaded. Check your connection and retry.";
      el("feedFailure").hidden=false;
      feedStatus(offline?"Offline: memos unavailable.":timeout?"Memo loading timed out.":"Unable to load memos.");
      fail(err);
    }finally{
      if(deadline!==null)clearTimeout(deadline);
      if(activeFeedController===controller)activeFeedController=null;
    }
  }
  async function loadRevisions(memo){
    const list=el("revisionList");
    list.replaceChildren(make("p","revision-message","Loading previous versions…"));
    try{
      const response=await api("/api/v1/memos/"+memo.id+"/revisions");
      // A delayed response must never expose another memo's history in this editor.
      if(state.editing?.id!==memo.id||!el("revisionPanel").open)return;
      if(!Array.isArray(response))throw new Error("Unexpected revision history response");
      const revisions=response.filter(r=>r&&Number.isInteger(r.version)&&r.version>0&&
        typeof r.title==="string"&&typeof r.content==="string");
      list.replaceChildren();
      if(!revisions.length){
        list.append(make("p","revision-message","No previous versions yet."));
        return;
      }
      for(const revision of revisions){
        const row=make("section","revision-row");
        const head=make("div","revision-head");
        head.append(make("strong","", "Version "+revision.version));
        const when=new Date(revision.saved_at);
        if(!Number.isNaN(when.getTime()))
          head.append(make("span","revision-date",when.toLocaleString()));
        row.append(head);
        if(revision.title)row.append(make("div","revision-title",revision.title));
        const excerpt=revision.content.length>650?
          revision.content.slice(0,650)+"…":revision.content;
        row.append(make("pre","revision-text",excerpt));
        const restore=make("button","subtle revision-restore","Restore this version");
        restore.type="button";
        restore.addEventListener("click",async()=>{
          if(state.editing?.id!==memo.id)return;
          if(!window.confirm("Restore version "+revision.version+" as a NEW memo version? "+
            "Current title/content will change, and unsaved editor text will be discarded. "+
            "Earlier versions will be preserved."))return;
          restore.disabled=true;
          try{
            await api("/api/v1/memos/"+memo.id,{method:"PATCH",
              body:JSON.stringify({version:memo.version,title:revision.title,
                content:revision.content})});
            if(state.editing?.id===memo.id){
              clearDraft();el("editor").close();
              toast("Earlier text restored as a new memo version");
            }
            await load();
          }catch(err){
            if(err.status===409)toast("Memo changed elsewhere. Copy your draft before refreshing.");
            else fail(err);
          }finally{restore.disabled=false;}
        });
        row.append(restore);
        list.append(row);
      }
    }catch(err){
      if(state.editing?.id!==memo.id||!el("revisionPanel").open)return;
      list.replaceChildren(make("p","revision-message","Unable to load revision history."));
      fail(err);
    }
  }
  function open(memo=null){
    const history=el("revisionPanel");
    history.open=false;history.hidden=!memo;el("revisionList").replaceChildren();
    state.editing=memo;state.promotedQuick=false;el("editorTitle").textContent=memo?"EDIT MEMO · VERSION "+memo.version:"NEW MEMO";
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
  function lockWorkspace(){
    // A lock forgets the bearer token and removes displayed memo text from
    // the DOM. Incrementing the request id invalidates in-flight feed results.
    ++state.request;
    activeFeedController?.abort("locked");
    activeFeedController=null;
    clearTimeout(pendingSkeletonTimer);
    pendingSkeletonTimer=null;
    settleFeed();
    el("feedFailure").hidden=true;
    el("feedStatus").textContent="";
    el("feedStatus").hidden=true;
    state.token="";
    state.memos=[];
    state.editing=null;
    state.folder="active";state.tag="";state.q="";state.dateFilter=null;state.personalView=false;state.promotedQuick=false;
    clearTimeout(sTimer);
    el("editor").close();
    el("editTitle").value="";
    el("editContent").value="";
    el("editPreview").replaceChildren();
    el("revisionPanel").open=false;
    el("revisionList").replaceChildren();
    el("quickContent").value="";
    el("search").value="";
    el("notesGrid").replaceChildren();
    el("pinnedGrid").replaceChildren();
    el("tags").replaceChildren();
    el("trendingTags").replaceChildren();el("recentNotes").replaceChildren();el("calendarDays").replaceChildren();el("navCount").textContent="";
    el("count").textContent="";
    el("accessToken").value="";
    el("authError").textContent="";
    el("shell").hidden=true;
    el("authScreen").hidden=false;
    // Deliberately preserve unsaved sessionStorage drafts: the separate
    // Clear drafts control handles destructive draft deletion by confirmation.
  }
  function clearLocalDrafts(){
    const keys=[];
    for(let i=0;i<sessionStorage.length;i++){
      const k=sessionStorage.key(i);
      if(k==="gcmemos:quick"||k?.startsWith("gcmemos:draft:"))keys.push(k);
    }
    if(!keys.length)return toast("No unsaved Memos drafts in this tab");
    if(!window.confirm("Permanently clear "+keys.length+
      " unsaved Memos draft entries from this browser tab? "+
      "An open editor will close. Saved server memos, login tokens, and "+
      "layout preferences will not change. This cannot be undone."))return;
    for(const k of keys)sessionStorage.removeItem(k);
    el("quickContent").value="";
    if(el("editor").open){
      el("editor").close();
      el("revisionPanel").open=false;
      el("revisionList").replaceChildren();
      state.editing=null;
    }
    toast("Unsaved drafts cleared from this tab");
  }
  async function save(){
    const memo=state.editing,body={title:el("editTitle").value,content:el("editContent").value,color:el("editColor").value,pinned:el("editPin").checked,archived:el("editArchive").checked};
    try{
      if(memo)await api("/api/v1/memos/"+memo.id,{method:"PATCH",body:JSON.stringify({...body,version:memo.version})});
      else await api("/api/v1/memos",{method:"POST",body:JSON.stringify(body)});
      clearDraft();if(!memo&&state.promotedQuick){el("quickContent").value="";sessionStorage.removeItem("gcmemos:quick");}state.promotedQuick=false;el("editor").close();toast(memo?"Memo updated":"Memo created");await load();
    }catch(err){if(err.status===409)toast("Memo changed elsewhere. Copy your draft before refreshing.");else fail(err);}
  }
  el("authForm").addEventListener("submit",async e=>{
    e.preventDefault();state.token=el("accessToken").value.trim();
    try{await api("/api/v1/memos?folder=active");el("authScreen").hidden=true;el("shell").hidden=false;el("accessToken").value="";el("quickContent").value=sessionStorage.getItem("gcmemos:quick")||"";await load();}
    catch(err){el("authError").textContent=err.message;state.token="";}
  });
  el("revisionPanel").addEventListener("toggle",()=>{
    if(el("revisionPanel").open&&state.editing)loadRevisions(state.editing);
  });
  el("lockWorkspaceBtn").onclick=lockWorkspace;
  el("feedRetry").onclick=async()=>{
    await load();
    if(!state.token||el("shell").hidden)return;
    if(el("feedFailure").hidden)el("search").focus();
    else el("feedRetry").focus();
  };
  el("clearDraftsBtn").onclick=clearLocalDrafts;
  el("clearLockedDraftsBtn").onclick=clearLocalDrafts;
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
  document.querySelectorAll("[data-folder]").forEach(b=>b.addEventListener("click",()=>{state.folder=b.dataset.folder;state.personalView=false;state.tag="";state.q="";state.dateFilter=null;el("search").value="";load();}));
  let sTimer;el("search").addEventListener("input",()=>{clearTimeout(sTimer);sTimer=setTimeout(()=>{state.q=el("search").value.trim();load();},180);});
  el("masonryBtn").onclick=()=>layout("masonry");el("listBtn").onclick=()=>layout("list");layout(state.layout);
  el("themeBtn").onclick=()=>{const next=document.documentElement.dataset.mode==="dark"?"light":"dark";document.documentElement.dataset.mode=next;localStorage.setItem("gcmemos-mode",next);};
  el("exportBtn").onclick=async()=>{
    if(!window.confirm("Export ALL memos, including archived and trashed notes, "+
      "and their full text revision history as an UNENCRYPTED JSON download? "+
      "The browser download location may be accessible to other users or "+
      "backup services. Protect or encrypt the file before sharing it."))return;
    try{const result=await api("/api/v1/export"),blob=new Blob([JSON.stringify(result,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=make("a");a.href=url;a.download="goreecloud-memos-export.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Export downloaded");
    }catch(err){fail(err);}
  };

  // Every control from the official visual mockup is either functional or explains its status.
  document.querySelectorAll("[data-feature]").forEach(b=>b.addEventListener("click",()=>notAvailable(b.dataset.feature)));
  for(const id of ["notificationsBtn","collaboratorsBtn","profileBtn"])
    el(id).addEventListener("click",()=>notAvailable(id==="notificationsBtn"?"Notifications":id==="collaboratorsBtn"?"Collaboration":"User profiles"));
  el("utilityMenuBtn").onclick=()=>{const area=el("headerUtilities");const open=area.classList.toggle("open");el("utilityMenuBtn").setAttribute("aria-expanded",String(open));};
  el("quickCaptureNav").onclick=()=>{el("quickCapture").scrollIntoView({behavior:"smooth",block:"center"});el("quickContent").focus();};
  el("timelineNav").onclick=()=>{el("notesSection").scrollIntoView({behavior:"smooth",block:"start"});};
  el("tagsNav").onclick=()=>{el("trendingTags").scrollIntoView({behavior:"smooth",block:"center"});};
  el("captureMarkdownBtn").onclick=()=>{
    const draft=el("quickContent").value;
    open();
    if(draft){el("editContent").value=draft;sessionStorage.setItem(key(null),draft);state.promotedQuick=true;}
  };
  el("captureChecklistBtn").onclick=()=>{
    const input=el("quickContent"),at=input.selectionStart??input.value.length;
    const prefix=at&&input.value[at-1]!=="\n"?"\n":"";
    const addition=prefix+"- [ ] ";
    input.value=input.value.slice(0,at)+addition+input.value.slice(at);
    sessionStorage.setItem("gcmemos:quick",input.value);
    input.focus();input.setSelectionRange?.(at+addition.length,at+addition.length);
  };
  el("calendarPrev").onclick=()=>{const d=state.calendarCursor;state.calendarCursor=new Date(d.getFullYear(),d.getMonth()-1,1);renderCalendar();};
  el("calendarNext").onclick=()=>{const d=state.calendarCursor;state.calendarCursor=new Date(d.getFullYear(),d.getMonth()+1,1);renderCalendar();};
  el("clearDateFilter").onclick=()=>{state.dateFilter=null;render();};
  el("allTagsBtn").onclick=()=>{state.allTags=!state.allTags;renderInsights();};
  el("activityAllBtn").onclick=()=>{state.allActivity=!state.allActivity;renderInsights();};
  const activateFolder=(folder,personal=false)=>{state.folder=folder;state.personalView=personal;state.tag="";state.q="";state.dateFilter=null;el("search").value="";load();};
  el("tabAll").onclick=()=>activateFolder("active");
  el("tabMine").onclick=()=>{activateFolder("active",true);toast("This workspace currently contains private notes only");};
  el("tabPinned").onclick=()=>activateFolder("pinned");
  el("filterPinned").onclick=()=>activateFolder(state.folder==="pinned"?"active":"pinned");
  el("filterPrivate").onclick=()=>{activateFolder("active");toast("All notes in this workspace are private");};
  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if(!el("shell").hidden)el("search").focus();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="n"){e.preventDefault();if(!el("shell").hidden)open();}
  });
})();
