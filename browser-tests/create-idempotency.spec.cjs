"use strict";
const {test,expect}=require("@playwright/test");

// Fictional data and browser-only loopback route interceptors, never owner notes.
const TOKEN="synthetic-only-test-token-no-real-access-2026";
const memo={id:"00000000-0000-4000-8000-000000000078",title:"Fictional",
 content:"Synthetic content",color:"paper",pinned:false,archived:false,
 deleted:false,tags:[],version:1,updated_at:"2026-11-08T12:00:00Z"};
const reply=(route,data,status=200)=>route.fulfill({
 status,contentType:"application/json",body:JSON.stringify(data)
});
async function fixture(page){
 const state={writes:[],failFirst:true,notes:[]};
 await page.route(url=>url.pathname==="/api/v1/memos",route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==="GET")
   return reply(route,url.searchParams.has("q")?state.notes:[]);
  if(request.method()!=="POST")return reply(route,{error:"Unexpected request"},405);
  state.writes.push({body:JSON.parse(request.postData()||"{}"),
    requestKey:request.headers()["idempotency-key"]});
  if(state.failFirst){state.failFirst=false;return reply(route,{error:"Synthetic timeout after commit"},503);}
  state.notes=[{...memo,...state.writes.at(-1).body}];
  return reply(route,state.notes[0],201);
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
 return state;
}

test("quick capture retries a failed request with the same opaque key",async({page})=>{
 const state=await fixture(page),draft="Fictional private memo #retry";
 await page.locator("#quickContent").fill(draft);
 await page.locator("#quickSave").click();
 await expect(page.locator("#toast")).toContainText("Synthetic timeout after commit");
 await expect(page.locator("#quickContent")).toHaveValue(draft);
 const stored=await page.evaluate(()=>sessionStorage.getItem("gcmemos:create-request:quick"));
 expect(stored).toBeTruthy();
 expect(stored).not.toContain(draft);
 expect(state.writes[0].requestKey).toMatch(/^[a-f0-9-]{36}$/);
 await page.locator("#quickSave").click();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 expect(state.writes).toHaveLength(2);
 expect(state.writes[1].requestKey).toBe(state.writes[0].requestKey);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:create-request:quick"))).toBeNull();
});

test("changing an unsaved quick memo after failure chooses a new replay key",async({page})=>{
 const state=await fixture(page);
 await page.locator("#quickContent").fill("Original fictional body");
 await page.locator("#quickSave").click();
 await expect(page.locator("#toast")).toContainText("Synthetic timeout after commit");
 await page.locator("#quickContent").fill("Changed fictional body");
 await page.locator("#quickSave").click();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 expect(state.writes).toHaveLength(2);
 expect(state.writes[0].requestKey).not.toBe(state.writes[1].requestKey);
});

test("new editor memo retries with the same key without duplicating stored plaintext",async({page})=>{
 const state=await fixture(page);
 await page.locator("#newBtn").click();
 await page.locator("#editTitle").fill("Retry this fictional note");
 await page.locator("#editContent").fill("Sensitive-looking but fabricated");
 await page.locator("#saveBtn").click();
 await expect(page.locator("#toast")).toContainText("Synthetic timeout after commit");
 const entry=await page.evaluate(()=>sessionStorage.getItem("gcmemos:create-request:editor"));
 expect(entry).toBeTruthy();
 expect(entry).not.toContain("Sensitive-looking");
 await page.locator("#saveBtn").click();
 await expect(page.locator("#editor")).toBeHidden();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 expect(state.writes).toHaveLength(2);
 expect(state.writes[1].requestKey).toBe(state.writes[0].requestKey);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:create-request:editor"))).toBeNull();
});
