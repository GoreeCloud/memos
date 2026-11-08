"use strict";
const {test,expect}=require("@playwright/test");

// No real notes, credentials, or network services; this file uses fictional
// route-mocked memo data and a fixed Chicago timezone to test date behavior.
test.use({timezoneId:"America/Chicago"});
const TOKEN="synthetic-only-test-token-no-real-access-2026";
const note=(date,title)=>({
 id:"00000000-0000-4000-8000-"+(title==="Yesterday note"?"000000000001":"000000000002"),
 title,content:"Fictional calendar test #calendar",color:"paper",pinned:false,
 archived:false,deleted:false,tags:["calendar"],version:1,updated_at:date
});
const reply=(route,memos)=>route.fulfill({
 status:200,contentType:"application/json",body:JSON.stringify(memos)
});
async function login(page,memos){
 await page.route(url=>url.pathname==="/api/v1/memos",route=>{
  const url=new URL(route.request().url());
  return reply(route,!url.searchParams.has("q")?[]:
   url.searchParams.get("q")?[]:memos);
 });
 await page.goto("/index.html");
 await page.locator("#accessToken").fill(TOKEN);
 await page.locator("#authForm button[type=submit]").click();
 await expect(page.locator("#shell")).toBeVisible();
}

test("a spring-forward boundary still labels the previous calendar day Yesterday",async({page})=>{
 // A 24-hour subtraction would jump to March 7 instead of March 8 at 00:30.
 await page.clock.setFixedTime(new Date("2026-03-09T00:30:00-05:00"));
 await login(page,[note("2026-03-08T12:00:00-05:00","Yesterday note")]);
 await expect(page.locator("#notesGrid .timeline-heading h3")).toHaveText("Yesterday");
 await expect(page.locator("#notesGrid .timeline-heading small")).toContainText("Mar 8, 2026");
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
});

test("calendar date filtering explains empty results and can be cleared",async({page})=>{
 await page.clock.setFixedTime(new Date("2026-11-08T12:00:00-06:00"));
 await login(page,[note("2026-11-08T11:00:00-06:00","Today note")]);
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await page.locator('#calendarDays button[aria-label="Thursday, November 12, 2026"]').click();
 await expect(page.locator("#emptyTitle")).toHaveText("No notes on this date");
 await expect(page.locator("#emptyBody")).toContainText("clear the calendar filter");
 await expect(page.locator("#feedStatus")).toHaveText("No notes on the selected date.");
 await expect(page.locator("#clearDateFilter")).toBeVisible();
 await page.locator("#clearDateFilter").click();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await expect(page.locator("#clearDateFilter")).toBeHidden();
});

test("pinned and search no-result views do not claim all notes are missing",async({page})=>{
 await login(page,[note("2026-11-08T11:00:00-06:00","Ordinary note")]);
 await page.locator("#tabPinned").click();
 await expect(page.locator("#emptyTitle")).toHaveText("Nothing pinned yet");
 await expect(page.locator("#emptyBody")).toContainText("Pin a memo");
 await page.locator("#tabAll").click();
 await expect(page.locator("#notesGrid .memo-card")).toHaveCount(1);
 await page.locator("#search").fill("unmatched");
 await expect(page.locator("#emptyTitle")).toHaveText("No matching notes");
 await expect(page.locator("#emptyBody")).toContainText("different search");
});
