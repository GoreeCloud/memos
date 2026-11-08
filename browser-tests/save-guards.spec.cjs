"use strict";
const {test,expect}=require("@playwright/test");

// Fictional notes and inert test credentials, isolated to loopback. These
// tests never contact a live Memos workspace or retain private source data.
const TOKEN="synthetic-only-test-token-no-real-access-2026";
const template={
 id:"00000000-0000-4000-8000-000000000099",title:"",
 content:"",color:"paper",pinned:false,archived:false,deleted:false,
 tags:[],version:1,updated_at:"2026-11-08T12:00:00Z"
};
const json=(route,data,status=200)=>route.fulfill({
 status,contentType:"application/json",body:JSON.stringify(data)
});
async function setup(page,{rejectWrites=false}={}){
 const pending={count:0,release:null,notes:[]};
 await page.route(url=>url.pathname==="/api/v1/memos",async route=>{
  const req=route.request();
  if(req.method()==="GET"){
   const url=new URL(req.url());
   return json(route,url.searchParams.has("q")?pending.notes:[]);
  }
  if(req.method()!=="POST")return json(route,{error:"Unexpected test operation"},405);
  const body=JSON.parse(req.postData()||"{}");
  pending.count++;
  await new Promise(resolve=>{pending.release=resolve;});
  if(rejectWrites)return json(route,{error:"Synthetic write unavailable"},503);
  const note={...template,title:body.title||"",content:body.content||""};
  pending.notes.push(note);
  return json(route,note,201);
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
 return pending;
}
test("rapid quick-capture clicks send a single POST and save once",async({page})=>{
 const pending=await setup(page);
 await page.locator("#quickContent").fill("One fictional quick thought");
 await page.locator("#quickSave").click();
 await expect.poll(()=>pending.count).toBe(1);
 await expect(page.locator("#quickSave")).toBeDisabled();
 await expect(page.locator("#quickSave")).toHaveAttribute("aria-label","Saving quick memo");
 // A programmatic extra click is a stronger check than pointer blocking.
 await page.evaluate(()=>document.getElementById("quickSave").click());
 expect(pending.count).toBe(1);
 pending.release();
 await expect(page.locator("#quickSave")).toBeEnabled();
 await expect(page.locator("#quickContent")).toHaveValue("");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 expect(pending.count).toBe(1);
});

test("repeated editor submissions cannot create two copies of one memo",async({page})=>{
 const pending=await setup(page);
 await page.locator("#newBtn").click();
 await page.locator("#editTitle").fill("Only one created note");
 await page.locator("#editContent").fill("Fictional editor draft");
 await page.locator("#saveBtn").click();
 await expect.poll(()=>pending.count).toBe(1);
 await expect(page.locator("#saveBtn")).toBeDisabled();
 await expect(page.locator("#saveBtn")).toHaveAttribute("aria-busy","true");
 await page.locator("#editorForm").evaluate(form=>
  form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 expect(pending.count).toBe(1);
 pending.release();
 await expect(page.locator("#editor")).toBeHidden();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 expect(pending.count).toBe(1);
});

test("failed quick write re-enables save and keeps the unsaved draft",async({page})=>{
 const pending=await setup(page,{rejectWrites:true});
 const draft="Keep this fictional draft";
 await page.locator("#quickContent").fill(draft);
 await page.locator("#quickSave").click();
 await expect.poll(()=>pending.count).toBe(1);
 await expect(page.locator("#quickSave")).toBeDisabled();
 pending.release();
 await expect(page.locator("#toast")).toContainText("Synthetic write unavailable");
 await expect(page.locator("#quickSave")).toBeEnabled();
 await expect(page.locator("#quickContent")).toHaveValue(draft);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:quick"))).toBe(draft);
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(0);
});

test("typing another memo during the pending POST preserves the newer draft",async({page})=>{
 const pending=await setup(page);
 const first="First fictional thought";
 const second="Second fictional thought, still unsaved";
 await page.locator("#quickContent").fill(first);
 await page.locator("#quickSave").click();
 await expect.poll(()=>pending.count).toBe(1);
 await page.locator("#quickContent").fill(second);
 pending.release();
 await expect(page.locator("#quickSave")).toBeEnabled();
 await expect(page.locator("#quickContent")).toHaveValue(second);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:quick"))).toBe(second);
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await expect(page.locator("#notesGrid")).toContainText(first);
 await expect(page.locator("#notesGrid")).not.toContainText(second);
 expect(pending.count).toBe(1);
});
