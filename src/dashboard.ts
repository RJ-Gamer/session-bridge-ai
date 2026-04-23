import * as vscode from "vscode";
import { ProjectSummary, readTelemetryAsync, TurnUsage } from "./telemetry";

export function openDashboard(context: vscode.ExtensionContext): void {
  const panel = vscode.window.createWebviewPanel(
    "sessionBridgeDashboard",
    "Session Bridge — Token Dashboard",
    vscode.ViewColumn.One,
    { enableScripts: true },
  );

  let currentDays = 30;

  function loadData(days: number) {
    panel.webview.html = getLoadingHtml();
    readTelemetryAsync(days)
      .then((result) => {
        if (result.error) {
          panel.webview.html = getErrorHtml(result.error, result.dataPath);
          return;
        }
        panel.webview.html = getDashboardHtml(
          result.turns,
          result.projects,
          result.dataPath,
          days,
          result.warning,
        );
      })
      .catch((err) => {
        panel.webview.html = getErrorHtml(err.message, "");
      });
  }

  loadData(currentDays);

  panel.webview.onDidReceiveMessage(
    (msg) => {
      if (msg.command === "refresh") {
        loadData(currentDays);
      }
      if (msg.command === "setDays") {
        currentDays = msg.days;
        loadData(currentDays);
      }
    },
    undefined,
    context.subscriptions,
  );
}

function getLoadingHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #1e1e1e; color: #ccc; font-family: sans-serif;
         display: flex; flex-direction: column; align-items: center;
         justify-content: center; height: 100vh; margin: 0; gap: 1rem; }
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid #333;
    border-top-color: #4f8ef7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="spinner"></div>
  <p>Reading Claude Code telemetry...</p>
  <p style="color:#555;font-size:12px">Large projects may take a moment</p>
</body>
</html>`;
}

function getErrorHtml(msg: string, dataPath: string): string {
  const escapedMsg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedPath = dataPath.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #1e1e1e; color: #d4d4d4; font-family: sans-serif; padding: 2rem; }
  .error-box { background: #2d1b1b; border: 1px solid #5a2020; border-radius: 8px; padding: 1.5rem; margin-top: 1rem; }
  h2 { color: #f88; margin-bottom: 1rem; }
  pre { white-space: pre-wrap; color: #ccc; font-size: 12px; line-height: 1.6; }
  .path { color: #888; font-size: 12px; margin-top: 1rem; }
  .fix { margin-top: 1.5rem; background: #1e2a1e; border: 1px solid #2a5a2a; border-radius: 8px; padding: 1rem; }
  .fix h3 { color: #6f6; margin-bottom: 0.5rem; font-size: 13px; }
  .fix code { color: #9f9; font-size: 12px; }
</style>
</head>
<body>
  <h2>🌉 Session Bridge — Token Dashboard</h2>
  <div class="error-box">
    <h2>Could not load telemetry data</h2>
    <pre>${escapedMsg}</pre>
    ${dataPath ? `<p class="path">Expected path: <code>${escapedPath}</code></p>` : ""}
  </div>
  <div class="fix">
    <h3>How to fix this:</h3>
    <p style="font-size:12px;color:#ccc;margin-bottom:0.5rem">
      1. Make sure <code>Claude Code</code> is installed and you have used it at least once.<br>
      2. If installed in a custom location, set the environment variable:<br>
      <code>CLAUDE_CONFIG_DIR=/path/to/your/.claude</code><br>
      3. Restart VS Code after setting the environment variable.
    </p>
  </div>
</body>
</html>`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatCost(n: number): string {
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

function getDashboardHtml(
  turns: TurnUsage[],
  projects: ProjectSummary[],
  dataPath: string,
  days: number,
  warning?: string,
): string {
  const totalTokens = turns.reduce((s, t) => s + t.totalTokens, 0);
  const totalCost = turns.reduce((s, t) => s + t.estimatedCost, 0);
  const totalTurns = turns.length;
  const totalInputTokens = turns.reduce((s, t) => s + t.inputTokens, 0);
  const totalOutputTokens = turns.reduce((s, t) => s + t.outputTokens, 0);
  const totalCacheRead = turns.reduce((s, t) => s + t.cacheReadTokens, 0);

  // Last 7 days daily breakdown
  const dailyMap = new Map<string, number>();
  for (const turn of turns) {
    const day = turn.timestamp.substring(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + turn.totalTokens);
  }
  const dailyBars = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);

  const maxDayTokens = Math.max(...dailyBars.map((d) => d[1]), 1);
  const projectRows = projects
    .slice(0, 10)
    .map(
      (p) => `
    <tr>
      <td>${p.project}</td>
      <td>${formatNumber(p.totalTokens)}</td>
      <td>${formatNumber(p.totalInputTokens)}</td>
      <td>${formatNumber(p.totalOutputTokens)}</td>
      <td>${formatNumber(p.totalCacheReadTokens)}</td>
      <td>${p.turns}</td>
      <td>${formatCost(p.totalCost)}</td>
    </tr>
  `,
    )
    .join("");

  const barChart = dailyBars
    .map(([day, tokens]: [string, number]) => {
      const pct = Math.round((tokens / maxDayTokens) * 100);
      const label = day.substring(5);
      return `
      <div class="bar-col">
        <div class="bar-wrap">
          <div class="bar" style="height:${pct}%"></div>
        </div>
        <div class="bar-label">${label}</div>
        <div class="bar-val">${formatNumber(tokens)}</div>
      </div>`;
    })
    .join("");

  const modelMap = new Map<string, number>();
  for (const turn of turns) {
    modelMap.set(
      turn.model,
      (modelMap.get(turn.model) || 0) + turn.totalTokens,
    );
  }
  const modelRows = Array.from(modelMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(
      ([model, tokens]) => `
      <div class="model-row">
        <span class="model-name">${model}</span>
        <span class="model-tokens">${formatNumber(tokens)}</span>
      </div>`,
    )
    .join("");

  const warningBanner = warning
    ? `
    <div class="warning-banner">
      ⚠️ ${warning}
    </div>`
    : "";

  const emptyState =
    turns.length === 0
      ? `
    <div class="empty-state">
      <p>No Claude Code usage found in the last 30 days.</p>
      <p>Start using Claude Code in VS Code and come back here to see your token usage.</p>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    padding: 1.5rem;
  }
  h1 { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 0.25rem; }
  .subtitle { color: #888; font-size: 12px; margin-bottom: 1.5rem; }
  .header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
  .refresh-btn {
    background: #2d2d2d; border: 1px solid #444; color: #ccc;
    padding: 0.3rem 0.75rem; border-radius: 4px; cursor: pointer;
    font-size: 12px;
  }
  .refresh-btn:hover { background: #3a3a3a; border-color: #4f8ef7; color: #4f8ef7; }
  .warning-banner {
    background: #2d2710; border: 1px solid #5a4a10;
    border-radius: 6px; padding: 0.6rem 1rem;
    color: #d4b84a; font-size: 12px; margin-bottom: 1rem;
  }
  .empty-state {
    background: #252526; border: 1px solid #333; border-radius: 8px;
    padding: 3rem; text-align: center; color: #666;
    margin: 2rem 0;
  }
  .empty-state p { margin-bottom: 0.5rem; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .card {
    background: #252526; border: 1px solid #333;
    border-radius: 8px; padding: 1rem;
  }
  .card-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
  .card-value { font-size: 22px; font-weight: 600; color: #4f8ef7; }
  .card-sub { font-size: 11px; color: #666; margin-top: 0.25rem; }
  .section { margin-bottom: 1.5rem; }
  .section-title { font-size: 13px; font-weight: 600; color: #ccc; margin-bottom: 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid #333; }
  .chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; background: #252526; border: 1px solid #333; border-radius: 8px; padding: 1rem; }
  .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
  .bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
  .bar { width: 100%; background: #4f8ef7; border-radius: 3px 3px 0 0; min-height: 2px; }
  .bar-label { font-size: 10px; color: #666; margin-top: 4px; }
  .bar-val { font-size: 10px; color: #888; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.5rem 0.75rem; border-bottom: 1px solid #333; }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #2a2a2a; color: #ccc; }
  tr:hover td { background: #2a2a2a; }
  .model-row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #2a2a2a; }
  .model-name { color: #ccc; }
  .model-tokens { color: #4f8ef7; font-weight: 500; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .note { font-size: 11px; color: #555; margin-top: 1rem; }
  .data-path { font-size: 10px; color: #444; margin-top: 0.25rem; }
  .days-select {
    background: #2d2d2d; border: 1px solid #444; color: #ccc;
    padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer;
    font-size: 12px;
  }
  .days-select:hover { border-color: #4f8ef7; }
</style>
</head>
<body>

<div class="header-row">
  <h1>🌉 Session Bridge — Token Dashboard</h1>
  <div style="display:flex;gap:0.5rem;align-items:center">
<select class="days-select" onchange="setDays(this.value)">
      <option value="7" ${days === 7 ? "selected" : ""}>Last 7 days</option>
      <option value="14" ${days === 14 ? "selected" : ""}>Last 14 days</option>
      <option value="30" ${days === 30 ? "selected" : ""}>Last 30 days</option>
      <option value="60" ${days === 60 ? "selected" : ""}>Last 60 days</option>
      <option value="90" ${days === 90 ? "selected" : ""}>Last 90 days</option>
    </select>
    <button class="refresh-btn" onclick="refresh()">↻ Refresh</button>
  </div>
</div>
<p class="subtitle">Last ${days} days · Claude Code telemetry · ${new Date().toLocaleDateString()}</p>

${warningBanner}
${emptyState}

${
  turns.length > 0
    ? `
<div class="grid">
  <div class="card">
    <div class="card-label">Total Tokens</div>
    <div class="card-value">${formatNumber(totalTokens)}</div>
    <div class="card-sub">${totalTurns} turns</div>
  </div>
  <div class="card">
    <div class="card-label">Input Tokens</div>
    <div class="card-value">${formatNumber(totalInputTokens)}</div>
    <div class="card-sub">prompt + context</div>
  </div>
  <div class="card">
    <div class="card-label">Output Tokens</div>
    <div class="card-value">${formatNumber(totalOutputTokens)}</div>
    <div class="card-sub">generated text</div>
  </div>
  <div class="card">
    <div class="card-label">Cache Reads</div>
    <div class="card-value">${formatNumber(totalCacheRead)}</div>
    <div class="card-sub">est. ${formatCost(totalCost)} total cost</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Daily Token Usage (last 7 days)</div>
  <div class="chart">${barChart || '<p style="color:#555;margin:auto">No recent data</p>'}</div>
</div>

<div class="two-col">
  <div class="section">
    <div class="section-title">Top Projects by Token Usage</div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Total</th>
            <th>Input</th>
            <th>Output</th>
            <th>Cache</th>
            <th>Turns</th>
            <th>Est. Cost</th>
          </tr>
        </thead>
        <tbody>${projectRows}</tbody>
      </table>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Token Usage by Model</div>
    <div class="card">${modelRows || '<p style="color:#555">No data</p>'}</div>
  </div>
</div>
`
    : ""
}

<p class="note">* Cost estimates based on public API pricing. Cache reads billed at ~10% of input rate.</p>
<p class="data-path">Data source: ${dataPath}</p>

<script>
  const vscode = acquireVsCodeApi();
  function refresh() {
    vscode.postMessage({ command: 'refresh' });
  }
  function setDays(days) {
    vscode.postMessage({ command: 'setDays', days: parseInt(days) });
  }
</script>

</body>
</html>`;
}
