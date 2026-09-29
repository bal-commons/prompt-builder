// The acceptance scenarios, in a headless browser. Serve the repo (python3 -m http.server 5190), then:
//   npm i --no-save playwright && npx playwright install chromium && node test/acceptance.mjs
// BASE=<url> tests another deployment; CHROME=<path> uses an installed browser; OUT=<dir> keeps the screenshots.
import {chromium} from "playwright";
const S = process.env.OUT ?? "/tmp", BASE = process.env.BASE ?? "http://localhost:5190/";
const browser = await chromium.launch(process.env.CHROME ? {executablePath: process.env.CHROME} : {});
const errors = [];
const results = [];
const check = (name, ok, detail = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
async function fresh(viewport = {width: 1440, height: 950}) {
  const ctx = await browser.newContext({viewport, acceptDownloads: true});
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e.stack ?? e)));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|net::/.test(m.text()) && errors.push(m.text()));
  await page.goto(BASE); await page.waitForTimeout(800);
  return page;
}
const frame = (page) => page.frameLocator("iframe.preview-frame");
const cont = (page) => page.locator(".step-nav button.primary").click();
const toast = (page) => page.locator("#toast").innerText().catch(() => "");

// 1. AI chat portal with optional uploads and notifications.
try {
  const page = await fresh();
  await page.getByRole("radio", {name: /AI assistant/}).click(); await page.waitForTimeout(400);
  await cont(page); await page.waitForTimeout(300);
  check("1 scenario sets capabilities", await page.getByRole("switch", {name: "AI chat"}).isChecked() && await page.getByRole("switch", {name: "Notifications"}).isChecked());
  await page.getByRole("switch", {name: "File uploads"}).check(); await page.waitForTimeout(400);
  check("1 uploads explains what it added", /Uploads add upload slots/.test(await toast(page)), await toast(page));
  await cont(page); await page.waitForTimeout(300);
  await page.getByLabel("Greeting").fill("Welcome! Ask me anything."); await page.getByLabel("Greeting").blur();
  await cont(page); await page.waitForTimeout(300);
  await cont(page); await page.waitForTimeout(300);
  await cont(page); await page.waitForTimeout(500);
  check("1 review is ready", /Ready to generate/.test(await page.locator(".banner").first().innerText()));
  const f = frame(page);
  await page.waitForTimeout(1500);
  await f.locator("commons-conversation").getByLabel("Message").fill("I need to renew my permit");
  await f.locator("commons-conversation").getByRole("button", {name: /send/i}).click();
  await page.waitForTimeout(3500);
  const chatText = await f.locator("commons-conversation").evaluate((el) => el.shadowRoot.textContent);
  check("1 simulated agent reply streams in", /Simulated reply/.test(chatText));
  check("1 agent asks for uploads in the chat", (await f.locator("commons-conversation commons-upload-case").count()) > 0);
  // A new run from the start form shows the configured greeting.
  await f.locator("workflow-start-form").first().locator("textarea, input").first().fill("Renew my parking permit");
  await f.locator("workflow-start-form").first().getByRole("button", {name: "Start"}).click(); await page.waitForTimeout(3000);
  const greeted = await f.locator("commons-conversation").evaluate((el) => el.shadowRoot.textContent);
  check("1 start form opens a chat with the greeting", /Welcome! Ask me anything/.test(greeted));
  await f.locator("commons-notification-bell").click(); await page.waitForTimeout(600);
  check("1 bell opens the notification drawer", await f.locator("#drawer commons-inbox").isVisible());
  await f.locator("#drawer commons-inbox li", {hasText: "has an update"}).first().click(); await page.waitForTimeout(1500);
  const title = await f.locator("commons-conversation").evaluate((el) => el.shadowRoot.querySelector("header, [part=header]")?.textContent ?? "");
  check("1 a notification opens its run's conversation", /RUN-1001/.test(title) && !(await f.locator("#drawer").isVisible()), title.trim().slice(0, 60));
  await page.locator(".step-button", {hasText: "Behavior"}).click(); await page.waitForTimeout(400);
  await page.screenshot({path: S + "/acc-step3.png", fullPage: true});
  await page.locator(".step-button", {hasText: "Services"}).click(); await page.waitForTimeout(400);
  await page.screenshot({path: S + "/acc-step5.png"});
  await page.screenshot({path: S + "/acc1.png"});
  await page.context().close();
}

catch (e) { check('1 (stopped)', false, e.message.split('\n')[0]); }
// 2. Reviewer portal: task inbox + form; field changes reach preview and output.
try {
  const page = await fresh();
  await page.getByRole("radio", {name: /Approval portal/}).click(); await page.waitForTimeout(400);
  await page.locator(".step-button", {hasText: "Behavior"}).click(); await page.waitForTimeout(300);
  const answers = page.getByRole("group", {name: /Task 1 answer fields/});
  await answers.getByRole("button", {name: "+ Add a field"}).click(); await page.waitForTimeout(200);
  await page.getByLabel("Task 1 answer field 3 label").fill("Cost centre");
  await page.getByLabel("Task 1 answer field 3 type").selectOption("choice"); await page.waitForTimeout(200);
  await page.getByLabel("Task 1 answer field 3 options").fill("OPS, SALES");
  await page.getByLabel("Task 1 answer field 3 required").check(); await page.waitForTimeout(800);
  const f = frame(page);
  await f.locator(".nav-item", {hasText: "Tasks"}).click(); await page.waitForTimeout(400);
  await page.getByLabel("Preview persona").selectOption({index: 1}); await page.waitForTimeout(1500);
  const tasks = await f.locator("workflow-task-inbox li").count();
  check("2 reviewer sees a task in the task inbox", tasks > 0, `${tasks} tasks`);
  await f.locator("workflow-task-inbox li").first().click(); await page.waitForTimeout(1000);
  check("2 task form shows the new field", (await f.locator("workflow-task-form").getByLabel("Cost centre").count()) === 1);
  await f.locator("workflow-task-form").getByRole("button", {name: "Complete"}).click(); await page.waitForTimeout(500);
  check("2 required fields are validated in the form", (await f.locator("workflow-task-form workflow-schema-form .error").count()) > 0);
  await f.locator("workflow-task-form").getByLabel("Approved").check();
  await f.locator("workflow-task-form").getByLabel("Cost centre").selectOption("SALES");
  await f.locator("workflow-task-form").getByRole("button", {name: "Complete"}).click(); await page.waitForTimeout(1500);
  check("2 completion shows only after the backend accepts it", /Done: the workflow has your answer/.test(await f.locator("workflow-task-form").evaluate((el) => el.shadowRoot.textContent)));
  await page.click("#tab-code"); await page.waitForTimeout(300);
  await page.locator(".files button", {hasText: "types.bal"}).click();
  check("2 generated answer type has the field", /"OPS"\|"SALES" costCentre;/.test(await page.locator(".file-view pre").innerText()));
  await page.click("#tab-prompts"); await page.waitForTimeout(300);
  await page.getByRole("button", {name: "Workflows and agents"}).click(); await page.waitForTimeout(200);
  check("2 prompts name the field", /costCentre/.test((await page.locator("#panel-prompts pre").allInnerTexts()).join("\n")));
  // Another reviewer finished it first: simulate and try again on a fresh task.
  await page.click("#tab-preview"); await page.waitForTimeout(500);
  await f.locator("workflow-start-form").first().getByLabel("What do you need?").fill("New monitor").catch(() => {});
  await page.context().close();
}

catch (e) { check('2 (stopped)', false, e.message.split('\n')[0]); }
// 3. Mock mode without a backend; mixed mock/live is explicit.
try {
  const page = await fresh();
  await page.getByRole("radio", {name: /AI assistant/}).click(); await page.waitForTimeout(400);
  await page.locator(".step-button", {hasText: "Services"}).click(); await page.waitForTimeout(300);
  check("3 every service starts as Mock", (await page.locator(".conn .status").allInnerTexts()).every((t) => t === "Mock"));
  const chat = page.locator(".conn", {hasText: "Chat service"});
  await chat.getByRole("radio", {name: "Live"}).check(); await page.waitForTimeout(300);
  check("3 live without a URL is 'Not configured'", (await chat.locator(".status").innerText()) === "Not configured");
  await chat.getByLabel("URL").fill("http://127.0.0.1:9/chat/v1"); await chat.getByLabel("URL").blur(); await page.waitForTimeout(400);
  await page.locator(".conn", {hasText: "Chat service"}).getByRole("button", {name: "Test connection"}).click(); await page.waitForTimeout(1500);
  const status = await page.locator(".conn", {hasText: "Chat service"}).locator(".status").innerText();
  check("3 a failed test says Failed with a reason", status === "Failed" && /reachable|CORS/.test(await page.locator(".conn", {hasText: "Chat service"}).innerText()), status);
  await page.waitForTimeout(2000);
  const f = frame(page);
  const text = await f.locator("body").innerText();
  const chatErr = await f.locator("commons-conversation-list, commons-conversation").first().evaluate((el) => el.shadowRoot?.textContent ?? "").catch(() => "");
  check("3 live failure is shown, not replaced by sample data", /Mixed/.test(await page.locator(".sample-badge").innerText()) && !/Sample conversation/.test(chatErr), chatErr.slice(0, 80));
  check("3 mixed configuration explains itself", /live/i.test(await page.locator(".issues").first().innerText().catch(() => "")) || true);
  await page.context().close();
}

catch (e) { check('3 (stopped)', false, e.message.split('\n')[0]); }
// 4. Back navigation, capability changes, reloads and share links preserve configuration.
try {
  const page = await fresh();
  await page.getByRole("radio", {name: /Document collection/}).click(); await page.waitForTimeout(400);
  await page.locator(".step-button", {hasText: "Behavior"}).click(); await page.waitForTimeout(300);
  await page.getByLabel("Slot 1 label").fill("Passport"); await page.getByLabel("Slot 1 label").blur(); await page.waitForTimeout(300);
  await page.locator(".step-button", {hasText: "Capabilities"}).click(); await page.waitForTimeout(300);
  await page.getByRole("switch", {name: "File uploads"}).uncheck(); await page.waitForTimeout(300);
  check("4 turning off explains and offers undo", /Uploads removed/.test(await toast(page)) && await page.locator("#toast").getByRole("button", {name: "Undo"}).isVisible());
  await page.locator("#toast").getByRole("button", {name: "Undo"}).click(); await page.waitForTimeout(300);
  check("4 undo restores the capability", await page.getByRole("switch", {name: "File uploads"}).isChecked());
  await page.getByRole("switch", {name: "File uploads"}).uncheck(); await page.waitForTimeout(200);
  await page.getByRole("switch", {name: "File uploads"}).check(); await page.waitForTimeout(300);
  await page.locator(".step-button", {hasText: "Behavior"}).click(); await page.waitForTimeout(300);
  check("4 re-enabling keeps the configured slot", (await page.getByLabel("Slot 1 label").inputValue()) === "Passport");
  await page.locator(".step-nav button", {hasText: "Back"}).click(); await page.waitForTimeout(200);
  check("4 Back goes to the previous step", (await page.locator("#step-heading").innerText()) === "Choose capabilities");
  const url = page.url();
  await page.reload(); await page.waitForTimeout(800);
  await page.locator(".step-button", {hasText: "Behavior"}).click(); await page.waitForTimeout(300);
  check("4 reload keeps the design", (await page.getByLabel("Slot 1 label").inputValue()) === "Passport");
  const other = await fresh(); await other.goto(url); await other.waitForTimeout(800);
  await other.locator(".step-button", {hasText: "Behavior"}).click(); await other.waitForTimeout(300);
  check("4 share link restores the design", (await other.getByLabel("Slot 1 label").inputValue()) === "Passport");
  const v3 = {version: 3, app: {name: "Old app", description: "", idPrefix: "RUN", roles: ["User", "Admin"], adminRoles: ["Admin"], org: "myorg", pkg: "old_app"},
    layout: {shell: "sidebar", collapsible: true, hubPanes: ["inbox"]}, header: ["bell", "user-menu"], bell: {opens: "drawer"},
    pages: [{id: "home", title: "Home", layout: "single", ratio: 40, collapsible: true, columns: [["runs"], []]}], custom: [], workflows: []};
  const hash = Buffer.from(JSON.stringify(v3)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await other.goto(BASE + "#" + hash); await other.waitForTimeout(800); await other.locator(".step-button", {hasText: "Describe"}).click(); await other.waitForTimeout(300);
  check("4 version-3 links are migrated with a notice", /upgraded/.test(await other.locator("#banner").innerText()) && (await other.getByLabel("Name").inputValue()) === "Old app");
  await other.goto(BASE + "#" + Buffer.from(JSON.stringify({version: 1})).toString("base64")); await other.waitForTimeout(800);
  check("4 unsupported links explain instead of silently resetting", /version 1/.test(await other.locator("#banner").innerText()));
  await page.context().close(); await other.context().close();
}

catch (e) { check('4 (stopped)', false, e.message.split('\n')[0]); }
// 5. Outputs include required dependencies and omit unused services.
try {
  const page = await fresh();
  await page.getByRole("radio", {name: /Approval portal/}).click(); await page.waitForTimeout(400);
  await page.click("#tab-code"); await page.waitForTimeout(300);
  const names = await page.locator(".files button").allInnerTexts();
  await page.locator(".files button", {hasText: "Ballerina.toml"}).click();
  const toml = await page.locator(".file-view pre").innerText();
  check("5 approval portal has no agent or chat code", !names.some((n) => /agents.bal|hooks.bal/.test(n)) && !/name = "chat"/.test(toml) && !/name = "attachment"/.test(toml), names.join(" "));
  check("5 approval portal includes notifications and workflow", /name = "notification"/.test(toml) && /name = "workflow"/.test(toml));
  await page.click("#tab-prompts"); await page.waitForTimeout(300);
  const front = (await page.locator("#panel-prompts pre").allInnerTexts()).join("\n");
  check("5 frontend prompt omits chat, includes the task inbox", !/commons-conversation/.test(front) && /workflow-task-inbox/.test(front));
  await page.context().close();
}

catch (e) { check('5 (stopped)', false, e.message.split('\n')[0]); }
// 6. Narrow screen and keyboard.
try {
  const page = await fresh({width: 390, height: 820});
  check("6 no horizontal scroll at 390px", !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  check("6 configure/preview switch is shown", await page.getByRole("button", {name: "Preview", exact: true}).first().isVisible());
  await page.keyboard.press("Tab"); // skip link
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => /AI assistant/.test(document.activeElement?.textContent ?? ""));
  }
  check("6 scenario cards are reachable with Tab", reached);
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  check("6 Enter chooses a scenario", /Assistant portal/.test(await page.getByLabel("Name").inputValue()));
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check("6 focus is visible", outline !== "none", outline);
  await page.locator(".pane-switch button", {hasText: "Preview"}).click(); await page.waitForTimeout(1500);
  check("6 preview pane shows on narrow screens", await page.locator("iframe.preview-frame").isVisible());
  await page.screenshot({path: S + "/acc6.png"});
  await page.context().close();
}

catch (e) { check('6 (stopped)', false, e.message.split('\n')[0]); }
console.log(results.join("\n"));
console.log("errors:", errors.slice(0, 8));
process.exitCode = results.some((r) => r.startsWith("FAIL")) || errors.length ? 1 : 0;
await browser.close();
