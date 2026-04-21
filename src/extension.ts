import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

// --- Config ---
const MESSAGE_THRESHOLD = 5;
const BUFFER_STORAGE_KEY = "sessionBridgeBuffer";
const BUFFER_COUNT_KEY = "sessionBridgeCount";

let statusBarItem: vscode.StatusBarItem;
let ctx: vscode.ExtensionContext;

// --- Helpers: Persistent Buffer ---
function getBuffer(): string[] {
  return ctx.workspaceState.get<string[]>(BUFFER_STORAGE_KEY, []);
}

function getCount(): number {
  return ctx.workspaceState.get<number>(BUFFER_COUNT_KEY, 0);
}

async function appendToBuffer(message: string): Promise<number> {
  const buffer = getBuffer();
  buffer.push(`[${new Date().toLocaleTimeString()}] ${message}`);
  await ctx.workspaceState.update(BUFFER_STORAGE_KEY, buffer);
  const newCount = getCount() + 1;
  await ctx.workspaceState.update(BUFFER_COUNT_KEY, newCount);
  return newCount;
}

async function clearBuffer(): Promise<void> {
  await ctx.workspaceState.update(BUFFER_STORAGE_KEY, []);
  await ctx.workspaceState.update(BUFFER_COUNT_KEY, 0);
}

// --- Helpers: Secure API Key ---
async function getApiKey(): Promise<string | undefined> {
  return await ctx.secrets.get("session-bridge.geminiApiKey");
}

async function setApiKey(key: string): Promise<void> {
  await ctx.secrets.store("session-bridge.geminiApiKey", key);
}

// --- Activation ---
export function activate(extCtx: vscode.ExtensionContext) {
  ctx = extCtx;

  // Status bar button
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(save) Save Context";
  statusBarItem.tooltip = "Save session context to SESSION.md";
  statusBarItem.command = "session-bridge.saveNow";
  statusBarItem.show();

  ctx.subscriptions.push(statusBarItem);

  // Save Now
  ctx.subscriptions.push(
    vscode.commands.registerCommand("session-bridge.saveNow", async () => {
      await updateSessionFile("Manual save triggered.");
    }),
  );

  // Log Message
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      "session-bridge.logMessage",
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

        const count = await appendToBuffer(msg);
        vscode.window.showInformationMessage(
          `Logged: "${msg}" (${count}/${MESSAGE_THRESHOLD})`,
        );

        if (count % MESSAGE_THRESHOLD === 0) {
          await updateSessionFile("Auto-save: threshold reached.");
        }
      },
    ),
  );

  // Set API Key
  ctx.subscriptions.push(
    vscode.commands.registerCommand("session-bridge.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter your Gemini API key",
        placeHolder: "AIza...",
        password: true,
        ignoreFocusOut: true,
      });

      if (!key) return;

      await setApiKey(key);
      vscode.window.showInformationMessage("Gemini API key saved securely.");
    }),
  );

  // Clear Buffer
  ctx.subscriptions.push(
    vscode.commands.registerCommand("session-bridge.clearBuffer", async () => {
      await clearBuffer();
      vscode.window.showInformationMessage("Session Bridge: buffer cleared.");
    }),
  );

  vscode.window.showInformationMessage(
    "Session Bridge is active. SESSION.md will be maintained automatically.",
  );
}

// --- Core: Generate and write SESSION.md ---
async function updateSessionFile(trigger: string) {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage("Session Bridge: No workspace folder open.");
    return;
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    const action = await vscode.window.showErrorMessage(
      "Session Bridge: Gemini API key not set.",
      "Set API Key",
    );
    if (action === "Set API Key") {
      await vscode.commands.executeCommand("session-bridge.setApiKey");
    }
    return;
  }

  const buffer = getBuffer();
  const conversationText =
    buffer.length > 0 ? buffer.join("\n") : "No messages logged yet.";

  const sessionPath = path.join(workspacePath, "SESSION.md");
  let existingContext = "";
  if (fs.existsSync(sessionPath)) {
    existingContext = fs.readFileSync(sessionPath, "utf-8");
  }

  const prompt = `
You are maintaining a session handoff document for a software project.

EXISTING SESSION CONTEXT (if any):
${existingContext || "None yet."}

NEW MESSAGES/ACTIVITY SINCE LAST UPDATE:
${conversationText}

Update and return a SESSION.md in exactly this format:

## Problem
[What is being solved]

## Approach
[Technical approach decided]

## Completed
[Bullet list of what is done]

## In Progress
[What is currently being worked on]

## Next Steps
[Exact next actions]

## Key Decisions
[Important choices made and why]

## Files Modified
[List of relevant files]

---
Last updated: ${new Date().toLocaleString()}
Trigger: ${trigger}
`;

  try {
    statusBarItem.text = "$(sync~spin) Saving...";

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "content-type": "application/json" },
        timeout: 15000,
      },
    );

    const summary = response.data.candidates[0].content.parts[0].text;
    fs.writeFileSync(sessionPath, summary, "utf-8");
    await clearBuffer();

    statusBarItem.text = "$(save) Save Context";
    vscode.window.showInformationMessage("SESSION.md updated successfully.");
  } catch (err: any) {
    statusBarItem.text = "$(error) Save Failed";
    const detail = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    vscode.window.showErrorMessage(`Session Bridge error: ${detail}`);
  }
}

export function deactivate() {}
