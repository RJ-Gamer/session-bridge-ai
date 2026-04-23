import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { clearBuffer, getBuffer } from "./buffer";
import { getConfig } from "./config";
import {
  HANDOFF_PROMPT,
  MESSAGES,
  NO_SESSION_FILE,
  SESSION_COPIED,
  SESSION_FILE,
  STATUS_BAR,
} from "./constants";
import { getGitDiff, getOpenFiles } from "./context";
import { callAI } from "./providers";

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

    await clearBuffer();
    statusBarItem.text = STATUS_BAR.IDLE;
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
      statusBarItem.text = STATUS_BAR.IDLE;
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
