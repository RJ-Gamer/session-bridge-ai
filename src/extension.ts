import * as vscode from "vscode";
import { initBudget } from "./budget";
import { appendToBuffer, initBuffer } from "./buffer";
import { getConfig, setProvider } from "./config";
import {
  COMMANDS,
  MESSAGES,
  NEW_SESSION,
  OPEN_DASHBOARD,
  SECRET_KEY,
  STATUS_BAR,
} from "./constants";
import { openDashboard } from "./dashboard";
import { startNewSession, updateSessionFile } from "./session";

let statusBarItem: vscode.StatusBarItem;
let ctx: vscode.ExtensionContext;

async function getApiKey(provider: string): Promise<string | undefined> {
  return await ctx.secrets.get(SECRET_KEY(provider));
}

async function setApiKey(provider: string, key: string): Promise<void> {
  await ctx.secrets.store(SECRET_KEY(provider), key);
}

async function executeSetApiKey(): Promise<void> {
  const provider = await vscode.window.showQuickPick(
    [
      {
        label: "$(star) Gemini",
        description: "Google Gemini — free tier available",
        value: "gemini",
      },
      {
        label: "$(hubot) Claude",
        description: "Anthropic Claude — requires credits",
        value: "claude",
      },
      {
        label: "$(robot) OpenAI",
        description: "OpenAI GPT-4o mini — requires credits",
        value: "openai",
      },
    ],
    { placeHolder: "Select AI provider to configure" },
  );

  if (!provider) return;

  const key = await vscode.window.showInputBox({
    prompt: `Enter your ${provider.label} API key`,
    placeHolder:
      provider.value === "gemini"
        ? "AIza..."
        : provider.value === "claude"
          ? "sk-ant-..."
          : "sk-...",
    password: true,
    ignoreFocusOut: true,
  });

  if (!key) return;

  await setApiKey(provider.value, key);
  await setProvider(provider.value);
  vscode.window.showInformationMessage(MESSAGES.KEY_SAVED(provider.label));
}

export async function activate(extCtx: vscode.ExtensionContext) {
  ctx = extCtx;
  initBuffer(ctx);

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  const { threshold: initThreshold } = getConfig();
  const { getCount } = require("./buffer");
  statusBarItem.text = STATUS_BAR.withCount(getCount(), initThreshold);
  statusBarItem.tooltip = "Save session context to SESSION.md";
  statusBarItem.command = COMMANDS.SAVE_NOW;
  statusBarItem.show();

  ctx.subscriptions.push(statusBarItem);

  ctx.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SAVE_NOW, async () => {
      await updateSessionFile(
        "Manual save triggered.",
        statusBarItem,
        getApiKey,
        executeSetApiKey,
      );
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.LOG_MESSAGE,
      async (message?: string) => {
        let msg = message;
        if (!msg) {
          msg = await vscode.window.showInputBox({
            prompt: "What are you working on right now?",
            placeHolder:
              "e.g. Implementing login route, fixing JWT refresh token bug...",
            ignoreFocusOut: true,
          });
        }
        if (!msg) return;

        const { threshold } = getConfig();
        const count = await appendToBuffer(msg);
        vscode.window.showInformationMessage(
          `Logged: "${msg}" (${count}/${threshold})`,
        );
        statusBarItem.text = STATUS_BAR.withCount(count, threshold);

        if (count % threshold === 0) {
          await updateSessionFile(
            "Auto-save: threshold reached.",
            statusBarItem,
            getApiKey,
            executeSetApiKey,
          );
        }
      },
    ),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.SET_API_KEY, executeSetApiKey),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CLEAR_BUFFER, async () => {
      const { clearBuffer } = await import("./buffer.js");
      await clearBuffer();
      vscode.window.showInformationMessage(MESSAGES.BUFFER_CLEARED);
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand(NEW_SESSION, async () => {
      await startNewSession(statusBarItem);
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand(OPEN_DASHBOARD, () => {
      openDashboard(ctx);
    }),
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("session-bridge.checkBudget", async () => {
      await checkBudget();
      vscode.window.showInformationMessage("Budget status refreshed.");
    }),
  );

  // Check peak hours on startup and every 30 minutes
  checkPeakHours();

  const interval = setInterval(
    checkPeakHours,
    30 * 60 * 1000,
  ) as unknown as NodeJS.Timeout;
  ctx.subscriptions.push({ dispose: () => clearInterval(interval) });

  // Initialize budget alerts
  initBudget(ctx);

  // Show onboarding for first time users
  const hasOnboarded = ctx.globalState.get<boolean>(
    "session-bridge.onboarded",
    false,
  );
  if (!hasOnboarded) {
    await showOnboarding(ctx);
  } else {
    vscode.window.showInformationMessage(MESSAGES.ACTIVE);
  }
}

async function showOnboarding(extCtx: vscode.ExtensionContext): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "sessionBridgeOnboarding",
    "Welcome to Session Bridge AI",
    vscode.ViewColumn.One,
    { enableScripts: true },
  );

  panel.webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1e1e1e; color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 3rem; max-width: 680px; margin: 0 auto;
  }
  h1 { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 0.5rem; }
  .subtitle { color: #888; font-size: 14px; margin-bottom: 2.5rem; }
  .step { display: flex; gap: 1.5rem; margin-bottom: 2rem; align-items: flex-start; }
  .step-num {
    background: #4f8ef7; color: #fff; font-weight: 700;
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0; margin-top: 2px;
  }
  .step-content h3 { color: #fff; font-size: 15px; margin-bottom: 0.4rem; }
  .step-content p { color: #999; font-size: 13px; line-height: 1.6; }
  .step-content code {
    background: #2d2d2d; color: #4f8ef7; padding: 2px 6px;
    border-radius: 3px; font-size: 12px;
  }
  .shortcuts { background: #252526; border: 1px solid #333; border-radius: 8px; padding: 1.25rem; margin-bottom: 2rem; }
  .shortcuts h3 { color: #ccc; font-size: 13px; margin-bottom: 0.75rem; }
  .shortcut-row { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid #2a2a2a; }
  .shortcut-row:last-child { border-bottom: none; }
  .shortcut-action { color: #999; font-size: 12px; }
  .shortcut-key { color: #4f8ef7; font-size: 12px; font-family: monospace; }
  .btn {
    background: #4f8ef7; color: #fff; border: none;
    padding: 0.75rem 2rem; border-radius: 6px; font-size: 14px;
    cursor: pointer; font-weight: 500; width: 100%;
    margin-top: 1rem;
  }
  .btn:hover { background: #3a7de0; }
  .divider { border: none; border-top: 1px solid #333; margin: 2rem 0; }
</style>
</head>
<body>

<h1>🌉 Welcome to Session Bridge AI</h1>
<p class="subtitle">Never lose your AI coding context again — across Claude, Gemini, OpenAI and more.</p>

<div class="step">
  <div class="step-num">1</div>
  <div class="step-content">
    <h3>Set your AI provider and API key</h3>
    <p>Press <code>Ctrl+Shift+P</code> and run <code>Session Bridge: Set AI Provider & API Key</code>.<br>
    Gemini is recommended — it has a free tier with no credit card required.<br>
    Get a free key at <a href="https://aistudio.google.com/apikey" style="color:#4f8ef7">aistudio.google.com/apikey</a></p>
  </div>
</div>

<div class="step">
  <div class="step-num">2</div>
  <div class="step-content">
    <h3>Log what you're working on</h3>
    <p>Press <code>Ctrl+Alt+M</code> anytime to log your current progress.<br>
    Do this every few exchanges with your AI tool — the extension will auto-save every 5 messages.</p>
  </div>
</div>

<div class="step">
  <div class="step-num">3</div>
  <div class="step-content">
    <h3>When credits run out — one click handoff</h3>
    <p>Press <code>Ctrl+Alt+N</code> to copy your full session context to clipboard.<br>
    Paste it as the first message in your next AI tool and continue exactly where you left off.</p>
  </div>
</div>

<div class="step">
  <div class="step-num">4</div>
  <div class="step-content">
    <h3>Track your token usage</h3>
    <p>Press <code>Ctrl+Shift+P</code> → <code>Session Bridge: Open Token Dashboard</code> to see<br>
    how many tokens you're burning across all your Claude Code projects.</p>
  </div>
</div>

<hr class="divider">

<div class="shortcuts">
  <h3>Keyboard Shortcuts</h3>
  <div class="shortcut-row">
    <span class="shortcut-action">Log current progress</span>
    <span class="shortcut-key">Ctrl+Alt+M</span>
  </div>
  <div class="shortcut-row">
    <span class="shortcut-action">Save context now</span>
    <span class="shortcut-key">Ctrl+Alt+S</span>
  </div>
  <div class="shortcut-row">
    <span class="shortcut-action">Start new session (copy handoff)</span>
    <span class="shortcut-key">Ctrl+Alt+N</span>
  </div>
</div>

<button class="btn" onclick="getStarted()">Get Started — Set My API Key</button>

<script>
  const vscode = acquireVsCodeApi();
  function getStarted() {
    vscode.postMessage({ command: 'setApiKey' });
  }
</script>

</body>
</html>`;

  panel.webview.onDidReceiveMessage(
    async (msg) => {
      if (msg.command === "setApiKey") {
        panel.dispose();
        await executeSetApiKey();
      }
    },
    undefined,
    extCtx.subscriptions,
  );

  panel.onDidDispose(async () => {
    await extCtx.globalState.update("session-bridge.onboarded", true);
  });
}

function checkPeakHours(): void {
  // ctx.globalState.update("session-bridge.lastPeakWarning", 0); // TEMP: remove after test
  const now = new Date();
  const utcHour = now.getUTCHours();

  // Peak hours: 13:00-19:00 UTC = 8AM-2PM ET = 5AM-11AM PT
  const isPeak = utcHour >= 13 && utcHour < 19;

  if (!isPeak) return;

  const lastWarning = ctx.globalState.get<number>(
    "session-bridge.lastPeakWarning",
    0,
  );
  const hoursSinceWarning = (Date.now() - lastWarning) / (1000 * 60 * 60);

  // Only warn once every 4 hours
  if (hoursSinceWarning < 4) return;

  ctx.globalState.update("session-bridge.lastPeakWarning", Date.now());

  const ptHour = utcHour - 8 < 0 ? utcHour + 16 : utcHour - 8;
  const etHour = utcHour - 5 < 0 ? utcHour + 19 : utcHour - 5;
  const timeStr = `${ptHour}:00 PT / ${etHour}:00 ET`;

  vscode.window
    .showWarningMessage(
      `⚠️ Peak Claude hours (${timeStr}) — token limits drain faster. Consider saving context frequently or switching to off-peak hours for heavy tasks.`,
      "Save Context Now",
      "Dismiss",
    )
    .then((action) => {
      if (action === "Save Context Now") {
        vscode.commands.executeCommand(COMMANDS.SAVE_NOW);
      }
    });
}

export function deactivate() {}
