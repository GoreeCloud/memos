"use strict";
const {test,expect}=require("@playwright/test");

// These tests exercise the actual development Python server and a fresh
// owner-only temporary SQLite file created by private_fixture_server.py.
// No live app instance, private content or real credentials are involved.
const ORIGIN="http://127.0.0.1:8768";
const TOKEN="synthetic-only-test-token-no-real-access-2026";

async function authenticate(page,token=TOKEN){
 await page.goto(ORIGIN+"/");
 await expect(page.locator("#shell")).toBeHidden();
 await page.locator("#accessToken").fill(token);
 await page.locator("#authForm button[type=submit]").click();
}

test("real private Python API rejects invalid bearer and accepts disposable test token",async({page})=>{
 const requests=[];
 page.on("request",req=>{
  if(new URL(req.url()).pathname.startsWith("/api/"))requests.push(req);
 });
 await authenticate(page,"synthetic-incorrect-credential-123456");
 await expect(page.locator("#authError")).toContainText("Authentication required");
 await expect(page.locator("#shell")).toBeHidden();
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#pinnedGrid .memo-card")).toHaveCount(0);
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(2);
 await expect(page.locator("#notesGrid .memo-card h3").getByText("Synthetic real-server pinned")).toBeVisible();
 await expect(page.locator("#feedStatus")).toHaveText("2 memos loaded.");
 expect(requests.length).toBeGreaterThanOrEqual(3);
 for(const req of requests){
  expect(new URL(req.url()).origin).toBe(ORIGIN);
  const headers=await req.allHeaders();
  expect(headers.cookie).toBeUndefined();
  expect(headers.referer).toBeUndefined();
 }
});

test("real API persists only synthetic quick memo and the browser safely refreshes",async({page})=>{
 await authenticate(page);
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#feedStatus")).toHaveText(/\d+ memos loaded\./);
 const note="Synthetic browser-created quick note #no-personal-data";
 await page.locator("#quickContent").fill(note);
 await page.locator("#quickSave").click();
 await expect(page.locator("#notesGrid")).toContainText(note);
 await expect(page.locator("#quickContent")).toHaveValue("");
 await page.reload();
 await expect(page.locator("#shell")).toBeHidden();
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#notesGrid")).toContainText(note);
});

test("401 on a real-server session refresh locks the UI; reauth restores only fresh data",async({page})=>{
 await authenticate(page);
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#notesGrid .memo-card")).not.toHaveCount(0);
 await page.evaluate(()=>sessionStorage.setItem("gcmemos:draft:new","Synthetic tab draft, not submitted"));
 const denied=url=>url.pathname==="/api/v1/memos"&&url.searchParams.has("q");
 await page.route(denied,route=>route.fulfill({
  status:401,contentType:"application/json",body:JSON.stringify({error:"Synthetic credential expired"})
 }));
 await page.locator("#search").fill("trigger synthetic 401");
 await expect(page.locator("#shell")).toBeHidden();
 await expect(page.locator("#authScreen")).toBeVisible();
 await expect(page.locator("#notesGrid")).toBeEmpty();
 await expect(page.locator("#pinnedGrid")).toBeEmpty();
 await expect(page.locator("#feedSkeleton")).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:draft:new"))).toBe("Synthetic tab draft, not submitted");
 await page.unroute(denied);
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
 await expect(page.locator("#notesGrid .memo-card")).not.toHaveCount(0);
 expect(await page.evaluate(()=>sessionStorage.getItem("gcmemos:draft:new"))).toBe("Synthetic tab draft, not submitted");
});
