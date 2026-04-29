# Changelog

## [0.0.1] - 2026-04-21

### Added
- Initial release
- Auto-save context every 5 logged messages
- Manual save via status bar button
- Gemini AI powered SESSION.md generation
- Secure API key storage using VS Code secret storage
- Persistent buffer that survives VS Code restarts
- Input box for logging current work
- Clear buffer command

---

## [0.1.0] - 2026-04-21

### Added
- Multi-provider support — Gemini, Claude, and OpenAI
- Automatic git diff capture in SESSION.md
- Automatic open files capture in SESSION.md
- Configurable auto-save threshold (minimum 2 messages)
- Modular architecture — split into constants, config, buffer, context, providers, session

### Fixed
- SESSION.md conflict bug when file already exists
- Atomic file write using temp file + rename to prevent corruption

---


## [0.2.0] - 2026-04-22

### Added
- Start New Session command — auto-copies handoff prompt to clipboard
- Handoff prompt wraps SESSION.md with instructions for the next AI tool
- Status bar flashes confirmation when context is copied
- Option to open SESSION.md directly from the notification


## [0.4.0] - 2026-04-23

### Added
- Token Dashboard — real-time visualization of Claude Code token usage
- Reads local JSONL telemetry from ~/.claude/projects automatically
- Per-project token breakdown — input, output, cache reads, estimated cost
- Daily usage bar chart (last 7 days)
- Model usage breakdown — see which Claude models you use most
- Refresh button to reload latest data without reopening dashboard
- Empty state — clear message when no Claude Code data found
- Warning banner — shown when some JSONL entries have unexpected format

### Fixed
- Cache read tokens now correctly billed at 10% of input rate
- Async file reading — large JSONL files no longer freeze VS Code
- CLAUDE_CONFIG_DIR environment variable support for custom installations
- Graceful error state with fix instructions when Claude Code not installed
- Handles unreadable files and malformed JSONL lines silently


## [0.5.0] - 2026-04-23

### Added
- Keyboard shortcuts — Ctrl+Alt+L (log), Ctrl+Alt+S (save), Ctrl+Alt+N (new session)
- Onboarding panel — shown automatically on first install with setup guide
- Token dashboard date range selector — 7, 14, 30, 60, 90 days
- Model recommendation in SESSION.md — suggests Haiku/Sonnet/Opus based on task complexity
- Peak hour warning — alerts during high-demand Claude hours (8AM-2PM ET) with save prompt
- Custom pricing overrides — set your own token costs via session-bridge.customPricing setting

### Fixed
- Project name leak — observer-sessions and similar system paths now resolved correctly
- Peak hour interval properly disposed on extension deactivate

## [0.6.0] - 2026-04-29

### Added
- Budget alerts — set daily and weekly token spend budgets
- Popup warnings at 50%, 80%, and 100% of budget — fires once per threshold per period
- Status bar budget indicator — shows current spend vs budget at a glance
- Click status bar budget to open Token Dashboard
- Check Budget Status command in command palette
- Midnight reset — cleans up old alert records automatically
- Budget settings: session-bridge.dailyBudget, session-bridge.weeklyBudget, session-bridge.budgetAlerts