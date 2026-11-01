import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "./preview-server.mjs";
const { chromium, webkit } = await import(
  process.env.IMD_PLAYWRIGHT || "playwright"
);
const output = "test/scratch/interactions";
await mkdir(output, { recursive: true });
const server = await preview();
const results = [];
const record = (name, details) => {
  results.push({ name, passed: true, details });
  console.log(`PASS ${name}: ${details}`);
};
const sample = await fetch("https://api.squeekchain.com/v1/core", {
  signal: AbortSignal.timeout(15000),
}).then((r) => r.json());
assert.equal(sample.status, "available");
const account = sample.configuration.reporter;
const genesis = Number(sample.configuration.genesisTimestamp);
const round = Math.floor((Date.now() / 1000 - genesis) / 600) + 1;
const deadline = (genesis + round * 600) * 1000;
const tx = sample.events[0].transactionHash;
const makeEvent = (eventName, args, blockTimestamp) => ({
  contractAddress: sample.identities.core,
  eventName,
  blockNumber: sample.chain.safeThroughBlock,
  transactionHash: tx,
  blockTimestamp: String(blockTimestamp),
  arguments: Object.entries(args).map(([name, value]) => ({
    name,
    value: String(value),
  })),
});
const settled = (through, work) => {
  const copy = structuredClone(sample);
  copy.core.settledThroughRound = String(through);
  copy.events = [
    makeEvent(
      "BatchSettled",
      {
        previousSettledThroughRound: through - 3,
        settledThroughRound: through,
        activeRoundCount: work > 0 ? 2 : 1,
      },
      genesis + through * 600 + 36,
    ),
    makeEvent(
      "RoundRecorded",
      { roundId: through - 1, work: 285 },
      genesis + through * 600 + 36,
    ),
    ...(work > 0
      ? [
          makeEvent(
            "RoundRecorded",
            { roundId: through, work },
            genesis + through * 600 + 36,
          ),
        ]
      : []),
  ];
  return copy;
};
const initial = settled(round - 1, 609);
let browsers = [];
try {
  const browser = await chromium.launch({ headless: true });
  browsers.push(browser);
  const liveContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const livePage = await liveContext.newPage();
  const errors = [],
    failed = [];
  livePage.on("pageerror", (e) => errors.push(e.message));
  livePage.on("response", (r) => {
    if (r.url().startsWith(server.url) && r.status() >= 400)
      failed.push(r.url());
  });
  await livePage.goto(server.url);
  await livePage
    .locator(".scene-label")
    .filter({ hasText: "Chapter" })
    .waitFor({ timeout: 25000 });
  await livePage.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 600, 720, 850, 1060, 1440]) {
    await livePage.setViewportSize({ width, height: width > 720 ? 1000 : 844 });
    assert.ok(
      await livePage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    );
    if (width === 390) {
      const action = await livePage
        .getByRole("button", { name: "Choose the next path" })
        .boundingBox();
      assert.ok(
        action.y + action.height <= 844,
        `primary action offscreen: ${JSON.stringify(action)}`,
      );
      await livePage.screenshot({ path: `${output}/mobile-live.png` });
    }
    if (width === 1440)
      await livePage.screenshot({ path: `${output}/desktop-live.png` });
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(failed.length, 0, failed.join("\n"));
  record(
    "Live production export",
    "real API chapters rendered under /preview/; no page errors, missing local resources or overflow at seven widths; main action within first 844px at 390",
  );
  await livePage.setViewportSize({ width: 390, height: 844 });
  await livePage.getByRole("button", { name: "Choose the next path" }).click();
  await livePage.getByRole("radio", { name: /Build a cozy camp/ }).check();
  await livePage
    .getByRole("button", { name: "Choose this path", exact: true })
    .click();
  await livePage.getByRole("dialog", { name: "Connect a wallet" }).waitFor();
  await livePage.keyboard.press("Escape");
  assert.equal(await livePage.locator("dialog[open]").count(), 0);
  assert.ok(
    await livePage
      .getByRole("button", { name: "Choose this path", exact: true })
      .evaluate((el) => el === document.activeElement),
  );
  record(
    "Guest path and keyboard",
    "choosing opens the wallet sheet; Escape closes it and restores focus to the vote action",
  );
  await livePage
    .getByRole("button", { name: "How to play", exact: true })
    .first()
    .click();
  await livePage
    .getByRole("dialog", { name: "A little guide to the adventure" })
    .waitFor();
  await livePage.keyboard.press("Tab");
  assert.ok(
    await livePage.evaluate(
      () => document.activeElement.closest("dialog") !== null,
    ),
  );
  await livePage.getByRole("button", { name: "Back to the adventure" }).click();
  record(
    "Help dialog",
    "guide opens, keeps keyboard focus in the modal, and closes through its primary button",
  );
  try {
    const { default: AxeBuilder } = await import(
      process.env.IMD_AXE || "@axe-core/playwright"
    );
    const scan = await new AxeBuilder({ page: livePage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    await writeFile(
      `${output}/axe.json`,
      JSON.stringify(scan.violations, null, 2),
    );
    assert.equal(
      scan.violations.length,
      0,
      scan.violations.map((v) => `${v.id}: ${v.help}`).join("\n"),
    );
    record(
      "Automated accessibility",
      "axe found 0 WCAG A/AA violations on the story screen; not a screen-reader certification",
    );
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND")
      results.push({
        name: "Automated accessibility",
        skipped: true,
        details: "Install @axe-core/playwright and set IMD_AXE to its module.",
      });
    else throw error;
  }
  await liveContext.close();

  for (const engine of [chromium, webkit]) {
    let engineBrowser;
    if (engine === chromium) engineBrowser = browser;
    else {
      try {
        engineBrowser = await engine.launch({ headless: true });
        browsers.push(engineBrowser);
      } catch (e) {
        results.push({
          name: "WebKit",
          skipped: true,
          details: e.message.slice(0, 1500),
        });
        console.log("LIMITATION WebKit runtime is unavailable.");
        continue;
      }
    }
    const context = await engineBrowser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(
      ({ account }) => {
        let authorized = sessionStorage.getItem("test-authorized") === "yes",
          chain = sessionStorage.getItem("test-chain") || "0x1",
          reject = sessionStorage.getItem("test-rejected") !== "yes",
          unknown = !sessionStorage.getItem("test-chain");
        const listeners = new Map();
        const provider = {
          on: (name, callback) => {
            const entries = listeners.get(name) || [];
            entries.push(callback);
            listeners.set(name, entries);
          },
          removeListener: (name, callback) =>
            listeners.set(
              name,
              (listeners.get(name) || []).filter((c) => c !== callback),
            ),
          request: async ({ method, params }) => {
            window.__walletCalls.push(method);
            if (method === "eth_chainId") return chain;
            if (method === "eth_accounts") return authorized ? [account] : [];
            if (method === "eth_requestAccounts") {
              if (reject) {
                reject = false;
                sessionStorage.setItem("test-rejected", "yes");
                throw Object.assign(new Error("Test rejection"), {
                  code: 4001,
                });
              }
              authorized = true;
              sessionStorage.setItem("test-authorized", "yes");
              return [account];
            }
            if (method === "wallet_switchEthereumChain") {
              if (unknown) {
                unknown = false;
                throw Object.assign(new Error("Unknown chain"), { code: 4902 });
              }
              chain = params[0].chainId;
              sessionStorage.setItem("test-chain", chain);
              (listeners.get("chainChanged") || []).forEach((c) => c(chain));
              return null;
            }
            if (method === "wallet_addEthereumChain") {
              chain = params[0].chainId;
              sessionStorage.setItem("test-chain", chain);
              (listeners.get("chainChanged") || []).forEach((c) => c(chain));
              return null;
            }
            if (method === "wallet_getCapabilities") return {};
            if (method === "wallet_requestPermissions") return [];
            if (method === "eth_blockNumber") return "0x100";
            throw new Error(`Unexpected test method ${method}`);
          },
        };
        window.__walletCalls = [];
        window.ethereum = provider;
        const info = {
          uuid: "2e17d99c-2e80-47c7-84ef-1895a192c36a",
          name: "Test browser wallet",
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="green"/></svg>',
          rdns: "com.squeektales.testwallet",
        };
        const announce = () =>
          dispatchEvent(
            new CustomEvent("eip6963:announceProvider", {
              detail: { info, provider },
            }),
          );
        addEventListener("eip6963:requestProvider", announce);
        announce();
      },
      { account },
    );
    let response = initial;
    await context.route("https://api.squeekchain.com/v1/core", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      }),
    );
    const page = await context.newPage();
    await page.goto(server.url);
    await page.getByRole("radio", { name: /Chase the falling star/ }).check();
    await page
      .getByRole("button", { name: "Choose this path", exact: true })
      .click();
    const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
    await sheet.getByRole("button", { name: "Test browser wallet" }).waitFor();
    assert.equal(
      await sheet.getByText("Browser wallet", { exact: true }).count(),
      0,
    );
    await sheet.getByRole("button", { name: "Test browser wallet" }).click();
    await sheet
      .getByText("The wallet did not connect.", { exact: false })
      .waitFor();
    await sheet.getByRole("button", { name: "Test browser wallet" }).click();
    await page
      .getByRole("button", { name: "Switch to Sepolia", exact: true })
      .first()
      .waitFor();
    await page
      .getByRole("button", { name: "Switch to Sepolia", exact: true })
      .first()
      .click();
    await page.locator(".wallet-button").filter({ hasText: /0x/ }).waitFor();
    assert.ok(
      await page
        .getByRole("radio", { name: /Chase the falling star/ })
        .isChecked(),
    );
    const calls = await page.evaluate(() => window.__walletCalls);
    assert.ok(calls.includes("wallet_switchEthereumChain"));
    assert.ok(calls.includes("wallet_addEthereumChain"));
    record(
      `${engine.name()} EIP-6963 and network`,
      "guest plan survives connecting; named provider replaces generic row; rejection recovers; Sepolia switch falls back to addEthereumChain",
    );
    await page.getByRole("radio", { name: /Chase the falling star/ }).check();
    await page
      .getByRole("button", { name: "Choose this path", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Path saved", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Path saved", exact: true })
      .waitFor();
    assert.ok(
      await page
        .getByRole("radio", { name: /Chase the falling star/ })
        .isChecked(),
    );
    await page.getByRole("radio", { name: /Build a cozy camp/ }).check();
    await page.getByRole("button", { name: "Update my path" }).click();
    await page
      .getByRole("button", { name: "Path saved", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("squeek-tales:choices:v1")).choices
            .length,
      ),
      1,
    );
    record(
      `${engine.name()} saved choice`,
      "selection persists across reload; changing a choice replaces it without duplicating votes",
    );
    response = settled(round, 0);
    await page.clock.install({ time: new Date(deadline + 60000) });
    await page.clock.runFor(16000);
    await page
      .locator(".scene-label")
      .filter({ hasText: `Chapter ${round}` })
      .waitFor();
    await page.getByText(/Your plan to build a cozy camp/).waitFor();
    assert.ok(
      (await page.locator(".scene").getAttribute("src")).endsWith("/nap.svg"),
    );
    await page
      .getByRole("link", { name: "Trailblazers", exact: true })
      .first()
      .click();
    await page.locator("tbody tr").waitFor();
    assert.equal(await page.locator("tbody tr").count(), 1);
    assert.match(await page.locator("tbody tr").innerText(), /30/);
    await page.reload();
    await page.locator("tbody tr").waitFor();
    assert.match(await page.locator("tbody tr").innerText(), /30/);
    record(
      `${engine.name()} confirmed round transition`,
      "polling adds the new chapter, switches illustration and personal plot, and awards exactly 30 points after settlement; reload retains score",
    );
    await page
      .getByRole("link", { name: "Chapter book", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Jog", exact: true }).waitFor();
    await page.locator(".skip-link").focus();
    await page.getByRole("link", { name: "Skip to content" }).press("Enter");
    assert.ok(await page.evaluate(() => document.activeElement.id === "main"));
    assert.ok(page.url().endsWith("#chapters"));
    await page.getByRole("button", { name: "Jog", exact: true }).click();
    await page.locator(".chapter-card").first().waitFor();
    const jogCount = await page.locator(".chapter-card").count();
    assert.ok(jogCount >= 1);
    assert.ok(
      (await page.locator(".chapter-card").first().innerText()).includes("Jog"),
    );
    await page.locator(".chapter-card").first().click();
    assert.ok(
      (await page.locator(".scene").getAttribute("src")).endsWith("/jog.svg"),
    );
    await page
      .getByRole("button", { name: "Return to latest chapter" })
      .click();
    assert.ok(
      (await page.locator(".scene").getAttribute("src")).endsWith("/nap.svg"),
    );
    record(
      `${engine.name()} chapter navigation`,
      "skip link preserves the active view; outcome filter, archive selection, historical illustration and return-to-latest work",
    );
    assert.ok(
      !(await page.evaluate(() => window.__walletCalls)).some(
        (m) =>
          m === "eth_sendTransaction" ||
          m === "personal_sign" ||
          m === "eth_signTypedData_v4",
      ),
    );
    await context.close();
  }

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    isMobile: true,
    hasTouch: true,
  });
  await mobile.route("https://api.squeekchain.com/v1/core", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(initial),
    }),
  );
  const phone = await mobile.newPage();
  await phone.goto(server.url);
  await phone
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  const phoneSheet = phone.getByRole("dialog", { name: "Connect a wallet" });
  for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"])
    await phoneSheet.getByRole("link", { name: `Open in ${name}` }).waitFor();
  await phoneSheet
    .getByRole("button", { name: "Coinbase Smart Wallet" })
    .waitFor();
  assert.equal(
    await phoneSheet.getByText("Browser wallet", { exact: true }).count(),
    0,
  );
  const sheetBox = await phoneSheet.boundingBox();
  assert.ok(Math.abs(sheetBox.y + sheetBox.height - 844) < 2);
  await phone.screenshot({
    path: `output/mobile-wallet.png`.replace("output", output),
  });
  record(
    "Mobile wallet sheet",
    "four app deep links and Coinbase Smart Wallet; no generic injected row; bottom aligned at 390",
  );
  await mobile.close();

  const offline = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  let unavailable = true;
  await offline.route("https://api.squeekchain.com/v1/core", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        unavailable ? { schemaVersion: 1, status: "unavailable" } : initial,
      ),
    }),
  );
  const errorPage = await offline.newPage();
  await errorPage.goto(server.url);
  await errorPage
    .getByRole("button", { name: "Retry", exact: true })
    .waitFor({ timeout: 15000 });
  assert.ok(
    await errorPage
      .getByRole("button", { name: "Choose this path", exact: true })
      .isDisabled(),
  );
  assert.ok(
    await errorPage
      .getByRole("button", { name: "Connect wallet", exact: true })
      .isEnabled(),
  );
  unavailable = false;
  await errorPage.getByRole("button", { name: "Retry", exact: true }).click();
  await errorPage
    .locator(".scene-label")
    .filter({ hasText: "Chapter" })
    .waitFor();
  assert.ok(
    await errorPage
      .getByRole("button", { name: "Choose this path", exact: true })
      .isEnabled(),
  );
  record(
    "Unavailable feed and retry",
    "no invented zero result; voting disabled, wallet usable; retry restores real chapter controls",
  );
  await errorPage
    .getByRole("link", { name: "Chapter book", exact: true })
    .last()
    .click();
  await errorPage.getByRole("button", { name: "Nap", exact: true }).click();
  // The initial fixture includes a certified Nap, so use an empty archive in a fresh deployment response.
  await offline.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      {
        passed: results.filter((r) => r.passed).length,
        limitations: results.filter((r) => r.skipped).map((r) => r.name),
      },
      null,
      2,
    ),
  );
} finally {
  for (const browser of browsers) await browser.close();
  await server.close();
}
