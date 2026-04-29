export const EXTENSION_ID = "session-bridge";

export const COMMANDS = {
  SAVE_NOW: "session-bridge.saveNow",
  LOG_MESSAGE: "session-bridge.logMessage",
  SET_API_KEY: "session-bridge.setApiKey",
  CLEAR_BUFFER: "session-bridge.clearBuffer",
};

export const STORAGE_KEYS = {
  BUFFER: "sessionBridgeBuffer",
  COUNT: "sessionBridgeCount",
};

export const SECRET_KEY = (provider: string) =>
  `session-bridge.${provider}.apiKey`;

export const SESSION_FILE = "SESSION.md";

export const PROVIDERS = {
  GEMINI: "gemini",
  CLAUDE: "claude",
  OPENAI: "openai",
};

export const API_URLS = {
  GEMINI: (key: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
  CLAUDE: "https://api.anthropic.com/v1/messages",
  OPENAI: "https://api.openai.com/v1/chat/completions",
};

export const API_MODELS = {
  CLAUDE: "claude-haiku-4-5-20251001",
  OPENAI: "gpt-4o-mini",
};

export const STATUS_BAR = {
  IDLE: "$(save) Save Context",
  SAVING: "$(sync~spin) Saving...",
  ERROR: "$(error) Save Failed",
  withCount: (count: number, threshold: number): string =>
    count > 0 && threshold > 0
      ? `$(save) Save Context (${count}/${threshold})`
      : "$(save) Save Context",
};

export const MESSAGES = {
  ACTIVE:
    "Session Bridge AI is active. SESSION.md will be maintained automatically.",
  KEY_SAVED: (provider: string) => `Session Bridge: ${provider} API key saved.`,
  UPDATED: (provider: string) => `SESSION.md updated via ${provider}.`,
  NO_WORKSPACE: "Session Bridge: No workspace folder open.",
  NO_API_KEY: (provider: string) =>
    `Session Bridge: No API key set for ${provider}.`,
  BUFFER_CLEARED: "Session Bridge: buffer cleared.",
  SET_API_KEY: "Set API Key",
};

export const HANDOFF_PROMPT = (
  sessionContent: string,
) => `I'm continuing a coding session. Here is my full context from my previous AI session. Please read it carefully and confirm you understand before I give you the next instruction.

---

${sessionContent}

---

Please acknowledge you've read this and tell me:
1. What problem I was solving
2. What has already been completed
3. What the immediate next step is

Then wait for my instruction.`;

export const NO_SESSION_FILE =
  'No SESSION.md found. Run "Save Context Now" first to generate one.';
export const SESSION_COPIED =
  "Context copied to clipboard. Paste it into your next AI tool to continue.";
export const NEW_SESSION = "session-bridge.newSession";

export const OPEN_DASHBOARD = "session-bridge.openDashboard";
export const DASHBOARD_TITLE = "Session Bridge: Open Token Dashboard";

export const PRICING_DOCS_URL = "https://www.anthropic.com/pricing";

export const DEFAULT_PRICING: Record<
  string,
  { input: number; output: number; cacheRead: number }
> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheRead: 0.3 },
  "claude-opus-4-6": { input: 15.0, output: 75.0, cacheRead: 1.5 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0, cacheRead: 0.08 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0, cacheRead: 0.3 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0, cacheRead: 0.08 },
  default: { input: 3.0, output: 15.0, cacheRead: 0.3 },
};

export const CHECK_BUDGET = "session-bridge.checkBudget";
