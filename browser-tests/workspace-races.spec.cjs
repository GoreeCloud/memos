"use strict";
const {test,expect}=require("@playwright/test");

// All requests and documents in this suite are synthetic on loopback. No real
// access token, private note, API export, file or device data is used.
const FIRST="synthetic-first-token-not-a-real-secret-0001";
const SECOND="synthetic-second-token-not-a-real-secret-0002";
const ITEM={
 id:"00000000-0000-4000-8000-000000000099",title:"Fictional checklist",
 content:"- [ ] Verify a private memo #synthetic",color:"mint",pinned:false,
 archived:false,deleted:false,tags:["synthetic"],version:1,
 updated_at:"2026-11-08T12:00:00Z"
};
const json=(route,data,status=200)=>route.fulfill({
 status,contentType:"application/json",body:JSON.stringify(data)
});
const isMemo=url=>url.pathname==="/api/v1/memos";
async function login(page){
 await page.route(isMemo,route=>{
  if(route.request().method()!=="GET")return json(route,{error:"Unexpected write"},405);
  return json(route,new URL(route.request().url()).searchParams.has("q")?[ITEM]:[]);
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(FIRST);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
}
test("lock rejects a delayed plaintext export even if its response arrives later",async({page})=>{
 await login(page);
 let release,received=false;
 const downloads=[];
 page.on("download",item=>downloads.push(item));
 await page.route(url=>url.pathname==="/api/v1/export",async route=>{
  received=true;
  await new Promise(resolve=>{release=resolve;});
  try{await json(route,{memos:[ITEM],revisions:[]});}
  catch{/* a canceled browser request is an expected outcome */}
 });
 page.on("dialog",dialog=>dialog.accept());
 await page.locator("#exportBtn").click();
 await expect.poll(()=>received).toBe(true);
 await page.locator("#lockWorkspaceBtn").click();
 await expect(page.locator("#authScreen")).toBeVisible();
 release();
 await page.waitForTimeout(150);
 expect(downloads).toHaveLength(0);
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#toast")).toBeEmpty();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(0);
});

test("lock preserves the quick draft and ignores an old pending memo write",async({page})=>{
 await login(page);
 let release,received=false;
 await page.route(isMemo,async route=>{
  if(route.request().method()!=="POST")return route.fallback();
  received=true;
  await new Promise(resolve=>{release=resolve;});
  try{await json(route,{...ITEM,id:"00000000-0000-4000-8000-000000000100"});}
  catch{/* browser canceled the request on lock */}
 });
 const draft="Fictional unsaved #work";
 await page.locator("#quickContent").fill(draft);
 await page.locator("#quickSave").click();
 await expect.poll(()=>received).toBe(true);
 await page.locator("#lockWorkspaceBtn").click();
 release();
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:quick"))).toBe(draft);
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(0);
 await expect(page.locator("#quickContent")).toHaveValue("");
});

test("an old rejected login cannot invalidate a newer successful login",async({page})=>{
 let releaseOld,oldReceived=false;
 await page.route(isMemo,async route=>{
  const auth=route.request().headers().authorization||"";
  if(auth==="Bearer "+FIRST){
   oldReceived=true;
   await new Promise(resolve=>{releaseOld=resolve;});
   try{await json(route,{error:"Synthetic stale 401"},401);}catch{}
   return;
  }
  if(auth!=="Bearer "+SECOND)return json(route,{error:"Incorrect synthetic token"},401);
  return json(route,new URL(route.request().url()).searchParams.has("q")?[ITEM]:[]);
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(FIRST);
 await page.locator("#authForm button[type=submit]").click();
 await expect.poll(()=>oldReceived).toBe(true);
 await page.locator("#accessToken").fill(SECOND);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 releaseOld();
 await page.waitForTimeout(150);
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#authScreen")).toBeHidden();
 await expect(page.locator("#authError")).toBeEmpty();
});

test("mobile menu is keyboard-dismissible and returns focus to login after lock",async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await login(page);
 const menu=page.locator("#utilityMenuBtn");
 await expect(menu).toBeVisible();
 await menu.click();
 await expect(menu).toHaveAttribute("aria-expanded","true");
 await expect(page.locator("#themeBtn")).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(menu).toHaveAttribute("aria-expanded","false");
 await expect(menu).toBeFocused();
 await menu.click();
 await page.locator("#search").click();
 await expect(menu).toHaveAttribute("aria-expanded","false");
 await menu.click();
 await page.locator("#lockWorkspaceBtn").click();
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#accessToken")).toBeFocused();
 await expect(menu).toHaveAttribute("aria-expanded","false");
});
