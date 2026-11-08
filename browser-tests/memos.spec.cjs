"use strict";
const {test,expect}=require("@playwright/test");

// Entire suite uses fictional memo content and an inert test-only token.
// The only server is an ephemeral loopback static server; API requests are
// fulfilled inside Playwright. Never use a live Memos account or private data.
const TOKEN="synthetic-only-test-token-no-real-access-2026";
const WHEN="2026-11-07T12:00:00Z";
const NOTES=[
 {id:"00000000-0000-4000-8000-000000000001",title:"Synthetic pinned idea",
  content:"Synthetic content for test only #ideas",color:"paper",pinned:true,
  archived:false,deleted:false,tags:["ideas"],version:1,updated_at:WHEN},
 {id:"00000000-0000-4000-8000-000000000002",title:"Synthetic ordinary memo",
  content:"Fictional private-looking card",color:"mint",pinned:false,
  archived:false,deleted:false,tags:[],version:1,updated_at:WHEN}
];
const json=(route,body,status=200)=>route.fulfill({
 status,contentType:"application/json",body:JSON.stringify(body)
});
const isMemo=(url)=>url.pathname==="/api/v1/memos";
function setup(page,handler){
 const requests=[];
 const ready=page.route(isMemo,async route=>{
  const req=route.request();
  requests.push(req);
  const url=new URL(req.url());
  // Auth validation has folder=active, but the subsequent list includes q and tag.
  if(!url.searchParams.has("q"))return json(route,[]);
  return handler(route,url,req);
 });
 return {requests,ready};
}
async function login(page,token=TOKEN){
 await page.goto("/index.html");
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 await page.locator("#accessToken").fill(token);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
}

test("locked startup keeps all private workspace controls and placeholders invisible",async({page})=>{
 await page.goto("/index.html");
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 await expect(page.locator("#notesGrid")).toBeHidden();
});

test("fast authenticated load shows real data without flashing skeletons, with safe fetch headers",async({page})=>{
 const {requests}=setup(page,(route)=>json(route,NOTES));
 await login(page);
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","false");
 await expect(page.locator("#feedStatus")).toHaveText("2 memos loaded.");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(2);
 await expect(page.locator("#pinnedGrid .memo-card")).toHaveCount(0);
 await page.waitForTimeout(230);
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 expect(requests.length).toBe(2);
 for(const req of requests){
  const headers=await req.allHeaders();
  expect(headers.authorization).toBe("Bearer "+TOKEN);
  expect(headers.cookie).toBeUndefined();
  expect(headers.referer).toBeUndefined();
  expect(new URL(req.url()).origin).toBe("http://127.0.0.1:8767");
 }
});

test("delayed fetch exposes decorative geometry, live status outside busy region, then content",async({page})=>{
 let release;
 setup(page,async route=>{
  await new Promise(resolve=>{release=resolve;});
  await json(route,NOTES);
 });
 await login(page);
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","true");
 await expect.poll(()=>typeof release).toBe("function");
 await expect(page.locator("#feedSkeleton")).toBeVisible();
 await expect(page.locator("#feedSkeleton")).toHaveAttribute("aria-hidden","true");
 await expect(page.locator("#feedSkeleton .memo-skeleton-card")).toHaveCount(4);
 expect(await page.locator("#feedStatus").evaluate(node=>!document.querySelector("#feedRegion").contains(node))).toBe(true);
 await expect(page.locator("#feedStatus")).toHaveText("Loading memos…");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(0);
 release();
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","false");
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(2);
 await expect(page.locator("#feedStatus")).toHaveText("2 memos loaded.");
});

test("network error clears old cards and retry restores results without losing keyboard focus",async({page})=>{
 let calls=0;
 setup(page,(route)=>{
  calls++;
  return calls===1?json(route,{error:"Synthetic server unavailable"},503):json(route,NOTES);
 });
 await login(page);
 await expect(page.locator("#feedFailure")).toBeVisible();
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","false");
 await expect(page.locator("#feedStatus")).toHaveText("Unable to load memos.");
 await page.locator("#feedRetry").click();
 await expect(page.locator("#feedFailure")).toBeHidden();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await expect(page.locator("#search")).toBeFocused();
});

test("keyboard retry preserves focus and Enter opens the recovered memo",async({page})=>{
 let calls=0;
 setup(page,route=>{
  calls++;
  return calls===1
   ?json(route,{error:"Synthetic temporary outage"},503)
   :json(route,NOTES);
 });
 await login(page);
 await expect(page.locator("#feedFailure")).toBeVisible();
 await expect(page.locator("#feedStatus")).toHaveAttribute("role","status");
 await expect(page.locator("#feedStatus")).toHaveAttribute("aria-live","polite");
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","false");
 // Use a real keyboard event, not an onclick invocation.
 await page.locator("#feedRetry").focus();
 await expect(page.locator("#feedRetry")).toBeFocused();
 await page.keyboard.press("Enter");
 await expect(page.locator("#feedFailure")).toBeHidden();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await expect(page.locator("#search")).toBeFocused();
 const memo=page.locator("#notesGrid .memo-card").first();
 await memo.focus();
 await expect(memo).toBeFocused();
 await page.keyboard.press("Enter");
 await expect(page.locator("#editor")).toBeVisible();
 await expect(page.locator("#editContent")).toHaveValue(NOTES[0].content);
 // The card's keyboard activation must not mutate the disposable source.
 expect(calls).toBe(2);
});

test("empty and offline outcomes resolve the skeleton and permit recovery",async({page,context})=>{
 let notes=[];
 setup(page,route=>json(route,notes));
 await login(page);
 await expect(page.locator("#empty")).toBeVisible();
 await expect(page.locator("#feedStatus")).toHaveText("No memos found.");
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","false");
 notes=NOTES;
 await context.setOffline(true);
 await page.locator('[data-folder="archive"]').click();
 await expect(page.locator("#feedFailureTitle")).toHaveText("You're offline");
 await expect(page.locator("#feedStatus")).toHaveText("Offline: memos unavailable.");
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 await context.setOffline(false);
 await page.locator("#feedRetry").click();
 // The mock returns two records for Archive; unlike Active, both appear in the
 // ordinary collection because the pinned split is Active-only.
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(2);
 await expect(page.locator("#feedFailure")).toBeHidden();
});

test("search, tags, pinned and layout switches keep state coherent",async({page})=>{
 setup(page,(route,url)=>{
  const q=url.searchParams.get("q")||"";
  const tag=url.searchParams.get("tag")||"";
  const notes=NOTES.filter(n=>(!q||(n.title+" "+n.content).toLowerCase().includes(q.toLowerCase()))&&(!tag||n.tags.includes(tag)));
  return json(route,notes);
 });
 await login(page);
 await page.locator("#listBtn").click();
 await expect(page.locator("#notesGrid")).toHaveClass(/list/);
 await page.locator("#masonryBtn").click();
 await expect(page.locator("#notesGrid")).not.toHaveClass(/list/);
 await page.locator("#search").fill("ordinary");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await expect(page.locator("#pinnedSection")).toBeHidden();
 await page.locator("#search").fill("");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(2);
 await page.getByRole("button",{name:"#ideas",exact:true}).click();
 await expect(page.locator("#feedStatus")).toHaveText("1 memo loaded.");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
});

test("locking a delayed search clears personal text and prevents a stale response from returning",async({page})=>{
 let held=false,release;
 setup(page,async(route,url)=>{
  if(url.searchParams.get("q")==="synthetic wait"){
   held=true;
   await new Promise(resolve=>{release=resolve;});
   try{await json(route,NOTES);}catch{/* aborted by lock; no data may render */}
  }else await json(route,NOTES);
 });
 await login(page);
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await page.evaluate(()=>sessionStorage.setItem("gcmemos:draft:new","Synthetic unsaved draft"));
 await page.locator("#search").fill("synthetic wait");
 await expect.poll(()=>held).toBe(true);
 await expect(page.locator("#feedSkeleton")).toBeVisible();
 await page.locator("#lockWorkspaceBtn").click();
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 await expect(page.locator("#feedStatus")).toBeHidden();
 expect(await page.locator("#notesGrid").evaluate(node=>node.children.length)).toBe(0);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:draft:new"))).toBe("Synthetic unsaved draft");
 release();
 await page.waitForTimeout(100);
 expect(await page.locator("#notesGrid").evaluate(node=>node.children.length)).toBe(0);
});

test("browser rejects even same-origin redirect for the dummy bearer token",async({page})=>{
 let targetRequests=0,authRequests=0;
 await page.route(url=>url.pathname==="/synthetic-redirect-target",route=>{
  targetRequests++;
  return route.fulfill({status:200,body:"Synthetic target"});
 });
 await page.route(isMemo,route=>{
  authRequests++;
  return route.fulfill({status:302,headers:{location:"/synthetic-redirect-target"},body:""});
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#authError")).not.toBeEmpty();
 await expect(page.locator("#shell")).toBeHidden();
 expect(authRequests).toBe(1);
 expect(targetRequests).toBe(0);
});

test("cross-origin redirects never receive dummy bearer credentials in real browsers",async({page})=>{
 const target="http://127.0.0.1:8768/synthetic-cross-origin-redirect-target";
 let authRequests=0,targetRequests=0;
 const originHeaders=[];
 await page.route(url=>url.href===target,route=>{
  targetRequests++;
  return route.fulfill({status:200,body:"Synthetic test target"});
 });
 await page.route(isMemo,async route=>{
  authRequests++;
  originHeaders.push(await route.request().allHeaders());
  return route.fulfill({
   status:302,headers:{location:target},body:""
  });
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#authError")).not.toBeEmpty();
 await expect(page.locator("#shell")).toBeHidden();
 expect(authRequests).toBe(1);
 expect(originHeaders[0].authorization).toBe("Bearer "+TOKEN);
 expect(originHeaders[0].cookie).toBeUndefined();
 expect(originHeaders[0].referer).toBeUndefined();
 // A different loopback PORT is a different origin. A redirected network
 // request must not happen, even toward our fictional route target.
 expect(targetRequests).toBe(0);
});

test("genuinely timed-out fetch resolves the busy region and permits retry",async({page})=>{
 let attempts=0,release;
 setup(page,async route=>{
  attempts++;
  if(attempts===1){
   await new Promise(resolve=>{release=resolve;});
   // The browser aborts after 12 seconds; finishing this intercept afterward
   // must not revive any content or surface a private response.
   try{await json(route,NOTES);}catch{/* expected canceled request */}
  }else await json(route,NOTES);
 });
 await login(page);
 await expect(page.locator("#feedSkeleton")).toBeVisible();
 await expect(page.locator("#feedFailureTitle")).toHaveText("Loading timed out",{timeout:18000});
 await expect(page.locator("#feedStatus")).toHaveText("Memo loading timed out.");
 await expect(page.locator("#feedRegion")).toHaveAttribute("aria-busy","false");
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 release();
 await page.locator("#feedRetry").click();
 await expect(page.locator("#feedFailure")).toBeHidden();
 await expect(page.locator("#feedStatus")).toHaveText("2 memos loaded.");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
});

test("320px, forced colors, dark and reduced motion keep static placeholders readable",async({page})=>{
 let release;
 await page.setViewportSize({width:320,height:740});
 await page.emulateMedia({colorScheme:"dark",reducedMotion:"reduce",forcedColors:"active"});
 setup(page,async route=>{
  await new Promise(resolve=>{release=resolve;});
  await json(route,NOTES);
 });
 await login(page);
 await expect(page.locator("#feedSkeleton")).toBeVisible();
 const shape=page.locator(".memo-skeleton-shape").first();
 await expect(shape).toHaveCSS("animation-name","none");
 expect(await page.evaluate(()=>matchMedia("(forced-colors: active)").matches)).toBe(true);
 const geometry=await page.evaluate(()=>{
  const width=document.documentElement.clientWidth;
  const outliers=[...document.querySelectorAll("body *")].filter(node=>{
   const r=node.getBoundingClientRect();
   return r.width>0&&r.right>width+2;
  }).map(node=>{
   const r=node.getBoundingClientRect();
   return {tag:node.tagName,id:node.id,cls:String(node.className).slice(0,80),right:Math.round(r.right)};
  }).slice(0,15);
  return {overflow:document.documentElement.scrollWidth-width,outliers};
 });
 expect(geometry.overflow,JSON.stringify(geometry.outliers)).toBeLessThanOrEqual(2);
 release();
 await expect(page.locator("#feedSkeleton")).toBeHidden();
});

test("official dashboard uses real memo data and clearly marks unavailable actions",async({page})=>{
 setup(page,route=>json(route,NOTES));
 await login(page);
 await expect(page.locator(".header-brand")).toContainText("GoreeCloud Memos");
 await expect(page.locator("#calendarDays button").first()).toBeVisible();
 expect(await page.locator("#calendarDays button").count()).toBeGreaterThanOrEqual(28);
 await expect(page.locator("#trendingTags .trending-tag")).toContainText(["#ideas 1"]);
 await expect(page.locator("#recentNotes .recent-row")).toHaveCount(2);
 await expect(page.locator(".timeline-group")).toHaveCount(1);
 const previous=await page.locator("#calendarMonth").innerText();
 await page.locator("#calendarNext").click();
 await expect(page.locator("#calendarMonth")).not.toHaveText(previous);
 await page.locator('[data-feature="Reminders"]').first().click();
 await expect(page.locator("#toast")).toContainText("Not available yet");
 await page.locator("#tabPinned").click();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await page.locator("#tabAll").click();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await page.locator("#captureChecklistBtn").click();
 await expect(page.locator("#quickContent")).toHaveValue("- [ ] ");
});
test("compact dashboard keeps lock reachable and removes visible private content",async({page})=>{
 await page.setViewportSize({width:320,height:700});
 setup(page,route=>json(route,NOTES));
 await login(page);
 await expect(page.locator("#utilityMenuBtn")).toBeVisible();
 await page.locator("#utilityMenuBtn").click();
 await expect(page.locator("#lockWorkspaceBtn")).toBeVisible();
 await page.locator("#lockWorkspaceBtn").click();
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#recentNotes .recent-row")).toHaveCount(0);
 await expect(page.locator("#trendingTags .trending-tag")).toHaveCount(0);
});
