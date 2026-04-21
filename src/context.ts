import * as cp from "child_process";
import * as vscode from "vscode";

export function getGitDiff(workspacePath: string): string {
  try {
    const stat = cp
      .execSync("git diff HEAD --stat", {
        cwd: workspacePath,
        timeout: 5000,
      })
      .toString()
      .trim();

    if (!stat) {
      const untracked = cp
        .execSync("git status --short", {
          cwd: workspacePath,
          timeout: 5000,
        })
        .toString()
        .trim();
      if (!untracked) return "No git changes detected.";
      return `Untracked/staged changes:\n${untracked}`;
    }

    const diff = cp
      .execSync(
        'git diff HEAD -- . ":(exclude)package-lock.json" ":(exclude)*.lock"',
        { cwd: workspacePath, timeout: 5000 },
      )
      .toString()
      .trim();

    const truncated =
      diff.length > 3000
        ? diff.substring(0, 3000) + "\n... (truncated for brevity)"
        : diff;

    return `Stat:\n${stat}\n\nDiff:\n${truncated}`;
  } catch {
    try {
      const status = cp
        .execSync("git status --short", {
          cwd: workspacePath,
          timeout: 5000,
        })
        .toString()
        .trim();
      return status ? `Git status:\n${status}` : "No git changes detected.";
    } catch {
      return "Git unavailable (not a git repo or no commits yet).";
    }
  }
}

export function getOpenFiles(): string {
  const editors = vscode.window.visibleTextEditors;
  if (editors.length === 0) return "No files currently open.";

  const results = editors
    .filter((e) => !e.document.isUntitled)
    .map((e) => {
      const fileName = vscode.workspace.asRelativePath(e.document.uri);
      const lineCount = e.document.lineCount;
      const lang = e.document.languageId;
      const previewLines = Math.min(50, lineCount);
      const preview = e.document.getText(
        new vscode.Range(0, 0, previewLines, 0),
      );
      return `### ${fileName} (${lang}, ${lineCount} lines)\n\`\`\`${lang}\n${preview}\n\`\`\``;
    });

  return results.length > 0
    ? results.join("\n\n")
    : "No named files currently open.";
}
