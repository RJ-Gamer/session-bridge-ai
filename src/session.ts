import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { clearBuffer, getBuffer } from "./buffer";
import { getConfig } from "./config";
import {
  HANDOFF_PROMPT,
  MAX_HISTORY_FILES,
  MESSAGES,
  NO_SESSION_FILE,
  SESSION_COPIED,
  SESSION_FILE,
  SESSION_HISTORY_DIR,
  STATUS_BAR,
} from "./constants";
import { getGitDiff, getOpenFiles } from "./context";
import { callAI } from "./providers";
function saveToHistory(workspacePath: string, content: string): void {
  try {
    const historyDir = path.join(workspacePath, SESSION_HISTORY_DIR);

    // Create history dir if it doesn't exist
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });

      // Auto-add to .gitignore
      const gitignorePath = path.join(workspacePath, ".gitignore");
      const gitignoreEntry =
        "\n# Session Bridge AI history\n.session-history/\n";
      try {
        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, "utf-8");
          if (!content.includes(".session-history")) {
            fs.appendFileSync(gitignorePath, gitignoreEntry);
          }
        } else {
          fs.writeFileSync(gitignorePath, gitignoreEntry.trim(), "utf-8");
        }
      } catch {
        // .gitignore update failure should never block history save
      }
    }

    // Write snapshot with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const snapshotPath = path.join(historyDir, `SESSION-${timestamp}.md`);
    fs.writeFileSync(snapshotPath, content, "utf-8");

    // Prune old snapshots — keep only last MAX_HISTORY_FILES
    const files = fs
      .readdirSync(historyDir)
      .filter((f) => f.startsWith("SESSION-") && f.endsWith(".md"))
      .sort() // ISO timestamps sort chronologically
      .reverse(); // newest first

    if (files.length > MAX_HISTORY_FILES) {
      const toDelete = files.slice(MAX_HISTORY_FILES);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(historyDir, file));
      }
    }
  } catch {
    // History save failure should never block the main save
  }
}

export async function updateSessionFile(
  trigger: string,
  statusBarItem: vscode.StatusBarItem,
  getApiKey: (provider: string) => Promise<string | undefined>,
  executeSetApiKey: () => Promise<void>,
): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage(MESSAGES.NO_WORKSPACE);
    return;
  }

  const { provider, captureGitDiff, captureOpenFiles } = getConfig();
  const apiKey = await getApiKey(provider);

  if (!apiKey) {
    const action = await vscode.window.showErrorMessage(
      MESSAGES.NO_API_KEY(provider),
      MESSAGES.SET_API_KEY,
    );
    if (action === MESSAGES.SET_API_KEY) {
      await executeSetApiKey();
    }
    return;
  }

  const buffer = getBuffer();
  const conversationText =
    buffer.length > 0 ? buffer.join("\n") : "No messages logged yet.";

  const sessionPath = path.join(workspacePath, SESSION_FILE);

  // Fix: safely read existing SESSION.md
  let existingContext = "";
  try {
    if (fs.existsSync(sessionPath)) {
      existingContext = fs.readFileSync(sessionPath, "utf-8");
    }
  } catch {
    existingContext = "";
  }

  const gitDiff = captureGitDiff
    ? getGitDiff(workspacePath)
    : "Git diff capture disabled.";

  const openFiles = captureOpenFiles
    ? getOpenFiles()
    : "Open file capture disabled.";

  const prompt = `
You are maintaining a session handoff document for a software project.
Your job is to generate a comprehensive SESSION.md that allows any AI tool to
immediately understand the project state and continue the work.

EXISTING SESSION CONTEXT:
${existingContext || "None yet."}

MANUALLY LOGGED MESSAGES:
${conversationText}

CURRENTLY OPEN FILES:
${openFiles}

GIT DIFF (recent changes):
${gitDiff}

Generate a comprehensive SESSION.md in exactly this format:

## Problem
[Clear description of what is being solved]

## Approach
[Technical approach, stack, architecture decisions]

## Completed
[Bullet list of what is fully done with file references]

## In Progress
[What is currently being worked on with specific details]

## Next Steps
[Exact next actions in order of priority]

## Key Decisions
[Important technical choices made and why]

## Files Modified
[List of files changed with brief description of each change]

## Code Context
[Brief summary of the most important code patterns or snippets relevant to continuing the work]

## How To Continue
[A clear 2-3 sentence instruction for the next AI tool to immediately pick up where we left off]

## Recommended Model
[Based on task complexity, recommend one of:
- Claude Haiku — simple edits, quick questions, formatting tasks
- Claude Sonnet — standard development tasks (default recommendation)
- Claude Opus — complex architecture, multi-file refactoring, hard bugs
Explain why in one sentence.]
---
Provider: ${provider}
Last updated: ${new Date().toLocaleString()}
Trigger: ${trigger}
`;

  try {
    statusBarItem.text = STATUS_BAR.SAVING;
    const summary = await callAI(provider, apiKey, prompt);

    // Fix: write to temp file first then rename — prevents corruption
    const tempPath = sessionPath + ".tmp";
    fs.writeFileSync(tempPath, summary, "utf-8");
    fs.renameSync(tempPath, sessionPath);

    // Save snapshot to history
    saveToHistory(workspacePath, summary);

    await clearBuffer();
    const { getConfig } = require("./config");
    const { threshold } = getConfig();
    statusBarItem.text = STATUS_BAR.withCount(0, threshold);

    vscode.window.showInformationMessage(MESSAGES.UPDATED(provider));
  } catch (err: any) {
    statusBarItem.text = STATUS_BAR.ERROR;
    const detail = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    vscode.window.showErrorMessage(`Session Bridge error: ${detail}`);
  }
}

export async function startNewSession(
  statusBarItem: vscode.StatusBarItem,
): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage(MESSAGES.NO_WORKSPACE);
    return;
  }

  const sessionPath = path.join(workspacePath, SESSION_FILE);

  if (!fs.existsSync(sessionPath)) {
    vscode.window.showErrorMessage(NO_SESSION_FILE);
    return;
  }

  try {
    const sessionContent = fs.readFileSync(sessionPath, "utf-8");

    if (!sessionContent.trim()) {
      vscode.window.showErrorMessage(NO_SESSION_FILE);
      return;
    }

    const handoff = HANDOFF_PROMPT(sessionContent);
    await vscode.env.clipboard.writeText(handoff);

    statusBarItem.text = "$(check) Context Copied!";
    setTimeout(() => {
      statusBarItem.text = STATUS_BAR.withCount(0, 0);
    }, 3000);

    const action = await vscode.window.showInformationMessage(
      SESSION_COPIED,
      "Open SESSION.md",
    );
    if (action === "Open SESSION.md") {
      const doc = await vscode.workspace.openTextDocument(sessionPath);
      await vscode.window.showTextDocument(doc);
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Session Bridge: ${err.message}`);
  }
}

export async function restoreFromHistory(
  workspacePath?: string,
): Promise<void> {
  const wsPath =
    workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!wsPath) {
    vscode.window.showErrorMessage(MESSAGES.NO_WORKSPACE);
    return;
  }

  const historyDir = path.join(wsPath, SESSION_HISTORY_DIR);

  if (!fs.existsSync(historyDir)) {
    vscode.window.showErrorMessage(
      "No session history found. Save context at least once to create history.",
    );
    return;
  }

  const files = fs
    .readdirSync(historyDir)
    .filter((f) => f.startsWith("SESSION-") && f.endsWith(".md"))
    .sort()
    .reverse(); // newest first

  if (files.length === 0) {
    vscode.window.showErrorMessage("No session history files found.");
    return;
  }

  // Build quick pick items with human readable labels
  const items = files.map((file) => {
    const ts = file
      .replace("SESSION-", "")
      .replace(".md", "")
      .replace("T", " ")
      .replace(/-/g, (m, offset) => (offset > 9 ? ":" : "-"));

    const filePath = path.join(historyDir, file);
    const size = fs.statSync(filePath).size;
    const sizeLabel =
      size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;

    return {
      label: `$(history) ${ts}`,
      description: sizeLabel,
      file,
    };
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder:
      "Select a snapshot to restore — this will overwrite SESSION.md",
    matchOnDescription: true,
  });

  if (!selected) return;

  // Confirm before overwriting
  const confirm = await vscode.window.showWarningMessage(
    `Restore SESSION.md from ${selected.label.replace("$(history) ", "")}? This will overwrite your current SESSION.md.`,
    "Restore",
    "Cancel",
  );

  if (confirm !== "Restore") return;

  try {
    const snapshotPath = path.join(historyDir, selected.file);
    const content = fs.readFileSync(snapshotPath, "utf-8");
    const sessionPath = path.join(wsPath, SESSION_FILE);

    // Backup current SESSION.md before restoring
    if (fs.existsSync(sessionPath)) {
      saveToHistory(wsPath, fs.readFileSync(sessionPath, "utf-8"));
    }

    fs.writeFileSync(sessionPath, content, "utf-8");
    vscode.window.showInformationMessage(
      `SESSION.md restored from ${selected.label.replace("$(history) ", "")}`,
    );

    // Open the restored file
    const doc = await vscode.workspace.openTextDocument(sessionPath);
    await vscode.window.showTextDocument(doc);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Restore failed: ${err.message}`);
  }
}
