import * as vscode from "vscode";
import { readTelemetryAsync } from "./telemetry";

export interface BudgetStatus {
  dailySpend: number;
  weeklySpend: number;
  dailyBudget: number;
  weeklyBudget: number;
  dailyPercent: number;
  weeklyPercent: number;
  dailyAlertLevel: 0 | 50 | 80 | 100;
  weeklyAlertLevel: 0 | 50 | 80 | 100;
}

const ALERT_THRESHOLDS = [50, 80, 100] as const;
const STORAGE_KEY_DAILY = "session-bridge.budget.dailyAlertsFired";
const STORAGE_KEY_WEEKLY = "session-bridge.budget.weeklyAlertsFired";

let ctx: vscode.ExtensionContext;
let statusBarBudget: vscode.StatusBarItem;
let checkInterval: ReturnType<typeof setInterval> | null = null;

export function initBudget(context: vscode.ExtensionContext): void {
  ctx = context;

  // Status bar item for budget
  statusBarBudget = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99, // just left of Save Context button
  );
  statusBarBudget.command = "session-bridge.openDashboard";
  ctx.subscriptions.push(statusBarBudget);

  // Check on startup
  checkBudget();

  // Check every 30 minutes
  checkInterval = setInterval(checkBudget, 30 * 60 * 1000);
  ctx.subscriptions.push({
    dispose: () => {
      if (checkInterval) clearInterval(checkInterval);
    },
  });

  // Reset fired alerts at midnight daily
  scheduleMidnightReset();
}

export async function checkBudget(): Promise<void> {
  const config = vscode.workspace.getConfiguration("session-bridge");
  const alertsEnabled = config.get<boolean>("budgetAlerts", true);
  const dailyBudget = config.get<number>("dailyBudget", 0);
  const weeklyBudget = config.get<number>("weeklyBudget", 0);

  if (!alertsEnabled || (dailyBudget === 0 && weeklyBudget === 0)) {
    statusBarBudget.hide();
    return;
  }

  const status = await getBudgetStatus(dailyBudget, weeklyBudget);
  updateStatusBar(status);
  await fireAlerts(status);
}

export async function getBudgetStatus(
  dailyBudget: number,
  weeklyBudget: number,
): Promise<BudgetStatus> {
  // Get daily spend — last 1 day
  const dailyResult = await readTelemetryAsync(1);
  const dailySpend = dailyResult.turns.reduce((s, t) => s + t.estimatedCost, 0);

  // Get weekly spend — last 7 days
  const weeklyResult = await readTelemetryAsync(7);
  const weeklySpend = weeklyResult.turns.reduce(
    (s, t) => s + t.estimatedCost,
    0,
  );

  const dailyPercent =
    dailyBudget > 0 ? Math.round((dailySpend / dailyBudget) * 100) : 0;

  const weeklyPercent =
    weeklyBudget > 0 ? Math.round((weeklySpend / weeklyBudget) * 100) : 0;

  return {
    dailySpend,
    weeklySpend,
    dailyBudget,
    weeklyBudget,
    dailyPercent,
    weeklyPercent,
    dailyAlertLevel: getAlertLevel(dailyPercent),
    weeklyAlertLevel: getAlertLevel(weeklyPercent),
  };
}

function getAlertLevel(percent: number): 0 | 50 | 80 | 100 {
  if (percent >= 100) return 100;
  if (percent >= 80) return 80;
  if (percent >= 50) return 50;
  return 0;
}

function updateStatusBar(status: BudgetStatus): void {
  const parts: string[] = [];

  if (status.dailyBudget > 0) {
    const icon = getStatusIcon(status.dailyPercent);
    parts.push(
      `${icon} $${status.dailySpend.toFixed(2)}/$${status.dailyBudget} today`,
    );
  }

  if (status.weeklyBudget > 0) {
    const icon = getStatusIcon(status.weeklyPercent);
    parts.push(
      `${icon} $${status.weeklySpend.toFixed(2)}/$${status.weeklyBudget} week`,
    );
  }

  if (parts.length === 0) {
    statusBarBudget.hide();
    return;
  }

  statusBarBudget.text = parts.join("  ");
  statusBarBudget.tooltip = "Click to open Token Dashboard";
  statusBarBudget.show();
}

function getStatusIcon(percent: number): string {
  if (percent >= 100) return "$(error)";
  if (percent >= 80) return "$(warning)";
  if (percent >= 50) return "$(info)";
  return "$(check)";
}

async function fireAlerts(status: BudgetStatus): Promise<void> {
  const today = new Date().toDateString();
  const weekKey = getWeekKey();

  const firedDaily = ctx.globalState.get<Record<string, number[]>>(
    STORAGE_KEY_DAILY,
    {},
  );
  const firedWeekly = ctx.globalState.get<Record<string, number[]>>(
    STORAGE_KEY_WEEKLY,
    {},
  );

  // Daily alerts
  if (status.dailyBudget > 0) {
    const firedTodayThresholds = firedDaily[today] || [];

    for (const threshold of ALERT_THRESHOLDS) {
      if (
        status.dailyPercent >= threshold &&
        !firedTodayThresholds.includes(threshold)
      ) {
        await showBudgetAlert(
          "daily",
          threshold,
          status.dailySpend,
          status.dailyBudget,
        );
        firedTodayThresholds.push(threshold);
        firedDaily[today] = firedTodayThresholds;
        await ctx.globalState.update(STORAGE_KEY_DAILY, firedDaily);
        break; // fire one at a time
      }
    }
  }

  // Weekly alerts
  if (status.weeklyBudget > 0) {
    const firedThisWeek = firedWeekly[weekKey] || [];

    for (const threshold of ALERT_THRESHOLDS) {
      if (
        status.weeklyPercent >= threshold &&
        !firedThisWeek.includes(threshold)
      ) {
        await showBudgetAlert(
          "weekly",
          threshold,
          status.weeklySpend,
          status.weeklyBudget,
        );
        firedThisWeek.push(threshold);
        firedWeekly[weekKey] = firedThisWeek;
        await ctx.globalState.update(STORAGE_KEY_WEEKLY, firedWeekly);
        break;
      }
    }
  }
}

async function showBudgetAlert(
  period: "daily" | "weekly",
  threshold: number,
  spent: number,
  budget: number,
): Promise<void> {
  const remaining = Math.max(0, budget - spent).toFixed(2);
  const periodLabel = period === "daily" ? "today" : "this week";

  let message: string;
  let type: "warning" | "error";

  if (threshold === 100) {
    message = `🚨 ${period === "daily" ? "Daily" : "Weekly"} budget reached — $${spent.toFixed(2)} spent ${periodLabel}. No budget remaining.`;
    type = "error";
  } else {
    message = `⚠️ ${threshold}% of ${period === "daily" ? "daily" : "weekly"} budget used — $${spent.toFixed(2)} of $${budget} spent ${periodLabel}. $${remaining} remaining.`;
    type = "warning";
  }

  const action =
    type === "error"
      ? await vscode.window.showErrorMessage(
          message,
          "View Dashboard",
          "Dismiss",
        )
      : await vscode.window.showWarningMessage(
          message,
          "View Dashboard",
          "Dismiss",
        );

  if (action === "View Dashboard") {
    await vscode.commands.executeCommand("session-bridge.openDashboard");
  }
}

function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7,
  );
  return `${now.getFullYear()}-W${weekNumber}`;
}

function scheduleMidnightReset(): void {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
  );
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    // Clean up old daily alert records older than 7 days
    const firedDaily = ctx.globalState.get<Record<string, number[]>>(
      STORAGE_KEY_DAILY,
      {},
    );
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const cleaned: Record<string, number[]> = {};
    for (const [key, value] of Object.entries(firedDaily)) {
      if (new Date(key) > cutoff) {
        cleaned[key] = value;
      }
    }
    ctx.globalState.update(STORAGE_KEY_DAILY, cleaned);

    // Schedule next midnight reset
    scheduleMidnightReset();
  }, msUntilMidnight);
}
