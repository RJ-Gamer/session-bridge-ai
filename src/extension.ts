import * as vscode from "vscode";
import { appendToBuffer, initBuffer } from "./buffer";
import { getConfig, setProvider } from "./config";
import { COMMANDS, MESSAGES, SECRET_KEY, STATUS_BAR } from "./constants";
import { updateSessionFile } from "./session";

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

export function activate(extCtx: vscode.ExtensionContext) {
  ctx = extCtx;
  initBuffer(ctx);

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = STATUS_BAR.IDLE;
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
  vscode.window.showInformationMessage(MESSAGES.ACTIVE);
}

export function deactivate() {}
