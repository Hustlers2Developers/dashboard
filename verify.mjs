import { chromium } from "playwright";

const SCRATCH = "C:\\Users\\hp\\AppData\\Local\\Temp\\claude\\e--dashboard\\0ea4b5e5-2f8a-4b2c-8124-f6a0a8db9ea9\\scratchpad\\";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:5174/login", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });

await page.fill('input[type="email"]', "godeveloper100k@gmail.com");
await page.fill('input[type="password"]', "hustlers2developers@2025#sre");
await page.click('button[type="submit"]');

await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: SCRATCH + "01-dashboard.png", fullPage: true });

// Navigate to Community
await page.goto("http://localhost:5174/community", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Community", { timeout: 15000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: SCRATCH + "02-community-posts.png", fullPage: true });

// Create a test post
const newPostBtn = page.locator('button:has-text("New post")');
if (await newPostBtn.count()) {
  await newPostBtn.click();
  await page.waitForTimeout(300);
  await page.fill('input[placeholder="Title"]', "Verification test post");
  await page.fill('textarea', "Checking the new Community posts feature end to end.");
  await page.screenshot({ path: SCRATCH + "03-create-post-dialog.png" });
  await page.click('button:has-text("Post")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SCRATCH + "04-post-created.png", fullPage: true });
}

// Notification bell
const bell = page.locator('button:has(svg.lucide-bell)');
if (await bell.count()) {
  await bell.first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: SCRATCH + "05-notification-bell.png" });
}

console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
await browser.close();
