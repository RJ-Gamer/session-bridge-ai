import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface TurnUsage {
  timestamp: string;
  model: string;
  sessionId: string;
  project: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ProjectSummary {
  project: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalTokens: number;
  totalCost: number;
  turns: number;
  lastUsed: string;
}

export interface TelemetryResult {
  turns: TurnUsage[];
  projects: ProjectSummary[];
  error?: string;
  warning?: string;
  dataPath: string;
}

import { DEFAULT_PRICING } from "./constants";

function getPricing(): Record<
  string,
  { input: number; output: number; cacheRead: number }
> {
  try {
    const config = require("vscode")
      .workspace.getConfiguration("session-bridge")
      .get<Record<string, any>>("customPricing", {});

    return { ...DEFAULT_PRICING, ...config };
  } catch {
    return DEFAULT_PRICING;
  }
}

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
): number {
  const pricing = getPricing();
  const p = pricing[model] || pricing["default"];
  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output +
    (cacheReadTokens / 1_000_000) * p.cacheRead
  );
}

// Resolve Claude projects path — respects CLAUDE_CONFIG_DIR env var
export function getClaudeProjectsPath(): string {
  const envPath = process.env.CLAUDE_CONFIG_DIR;
  if (envPath && fs.existsSync(envPath)) {
    return path.join(envPath, "projects");
  }

  // Fallback: check common locations in order
  const candidates = [
    path.join(os.homedir(), ".claude", "projects"),
    path.join(os.homedir(), ".config", "claude", "projects"), // some Linux setups
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Return default even if it doesn't exist — caller handles missing
  return candidates[0];
}

function resolveProjectName(cwd: string, fallback: string): string {
  if (!cwd) return fallback;

  // Get the basename of the cwd path — most meaningful project name
  const base = path.basename(cwd);

  // Filter out system/user directories that aren't project names
  const systemDirs = [
    "users",
    "home",
    "sammyak",
    "desktop",
    "documents",
    "downloads",
    "appdata",
    "roaming",
    "local",
    "temp",
    "src",
    "dist",
    "node_modules",
    "out",
  ];

  if (systemDirs.includes(base.toLowerCase())) return fallback;
  if (base.length <= 1) return fallback;

  return base;
}

function parseJsonlFile(
  filePath: string,
  cutoff: Date,
  project: string,
): TurnUsage[] {
  const results: TurnUsage[] = [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return results; // unreadable file — skip silently
  }

  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // malformed line — skip
    }

    // Only process assistant messages with usage data
    if (entry.type !== "assistant") continue;

    const usage = entry.message?.usage;
    if (!usage) continue;

    // Validate timestamp
    const ts = new Date(entry.timestamp);
    if (isNaN(ts.getTime()) || ts < cutoff) continue;

    // Validate usage fields exist — detect format changes
    if (
      typeof usage.input_tokens === "undefined" &&
      typeof usage.output_tokens === "undefined"
    )
      continue; // unexpected format — skip

    const inputTokens =
      (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
    const outputTokens = usage.output_tokens || 0;
    const cacheReadTokens = usage.cache_read_input_tokens || 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
    const model = entry.message?.model || "unknown";

    // Derive project name from cwd field if available
    const cwd = entry.cwd || "";
    const projectName = resolveProjectName(cwd, project);

    results.push({
      timestamp: entry.timestamp,
      model,
      sessionId: entry.sessionId || "",
      project: projectName,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: estimateCost(
        model,
        inputTokens,
        outputTokens,
        cacheReadTokens,
      ),
    });
  }

  return results;
}

export async function readTelemetryAsync(
  maxDays: number = 30,
): Promise<TelemetryResult> {
  const dataPath = getClaudeProjectsPath();

  // Handle missing Claude Code installation
  if (!fs.existsSync(dataPath)) {
    return {
      turns: [],
      projects: [],
      dataPath,
      error: `Claude Code data not found at: ${dataPath}\n\nMake sure Claude Code is installed and you have used it at least once.\n\nIf you installed Claude Code in a custom location, set the CLAUDE_CONFIG_DIR environment variable.`,
    };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);

  let projectDirs: string[];
  try {
    projectDirs = fs.readdirSync(dataPath);
  } catch (err: any) {
    return {
      turns: [],
      projects: [],
      dataPath,
      error: `Cannot read Claude data directory: ${err.message}`,
    };
  }

  // Process files asynchronously in chunks to avoid blocking
  const allTurns: TurnUsage[] = [];
  let formatWarning = false;

  await new Promise<void>((resolve) => {
    let i = 0;

    function processNext() {
      if (i >= projectDirs.length) {
        resolve();
        return;
      }

      const projectDir = projectDirs[i++];
      const projectPath = path.join(dataPath, projectDir);

      try {
        if (!fs.statSync(projectPath).isDirectory()) {
          setImmediate(processNext);
          return;
        }

        const files = fs
          .readdirSync(projectPath)
          .filter((f) => f.endsWith(".jsonl"));

        const projectName = projectDir
          .replace(/^[a-zA-Z]--/, "")
          .replace(/-/g, "/");

        for (const file of files) {
          const filePath = path.join(projectPath, file);
          const turns = parseJsonlFile(filePath, cutoff, projectName);
          allTurns.push(...turns);
        }
      } catch {
        // skip unreadable project directory
      }

      // yield to event loop between project directories
      setImmediate(processNext);
    }

    processNext();
  });

  const turns = allTurns.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const projects = summarizeByProject(turns);

  return {
    turns,
    projects,
    dataPath,
    warning: formatWarning
      ? "Some JSONL entries had unexpected format and were skipped."
      : undefined,
  };
}

export function summarizeByProject(turns: TurnUsage[]): ProjectSummary[] {
  const map = new Map<string, ProjectSummary>();

  for (const turn of turns) {
    const existing = map.get(turn.project) || {
      project: turn.project,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      turns: 0,
      lastUsed: turn.timestamp,
    };

    existing.totalInputTokens += turn.inputTokens;
    existing.totalOutputTokens += turn.outputTokens;
    existing.totalCacheReadTokens += turn.cacheReadTokens;
    existing.totalCacheCreationTokens += turn.cacheCreationTokens;
    existing.totalTokens += turn.totalTokens;
    existing.totalCost += turn.estimatedCost;
    existing.turns += 1;

    if (new Date(turn.timestamp) > new Date(existing.lastUsed)) {
      existing.lastUsed = turn.timestamp;
    }

    map.set(turn.project, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens);
}
