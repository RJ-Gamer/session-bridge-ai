<div align="center">

# 🌉 Session Bridge AI

### Never lose your AI coding context again.

![VS Code](https://img.shields.io/badge/VS%20CODE-EXTENSION-4f8ef7?style=for-the-badge&logo=visualstudiocode&logoColor=white)
![Version](https://img.shields.io/badge/VERSION-0.4.0-4f8ef7?style=for-the-badge)
![License](https://img.shields.io/badge/LICENSE-MIT-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-ACTIVE-brightgreen?style=for-the-badge)
![Providers](https://img.shields.io/badge/PROVIDERS-GEMINI%20%7C%20CLAUDE%20%7C%20OPENAI-orange?style=for-the-badge)
![PRs](https://img.shields.io/badge/PRS-WELCOME-blueviolet?style=for-the-badge&logo=github)
[![Sponsor](https://img.shields.io/badge/SPONSOR-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/RJ-Gamer)

</div>

---

## The Problem

You're deep into solving a problem with Claude Code. Credits run out — no warning, mid-sentence. You switch to Gemini. Now you have to explain everything again from scratch.

**Session Bridge AI fixes this.**

It maintains a running `SESSION.md` in your project — automatically capturing git diffs, open files, and your progress notes — always ready to hand off to any AI tool so you continue exactly where you left off.

---

## Features

- **🤖 Multi-provider** — works with Gemini, Claude, and OpenAI
- **📂 Git diff capture** — automatically includes recent code changes
- **👁️ Open files capture** — includes context from your currently open files
- **⚡ Auto-save** — context saved automatically every N logged messages
- **💾 Manual save** — save anytime via status bar button or command palette
- **📋 One-click handoff** — copies full handoff prompt to clipboard instantly
- **📊 Token Dashboard** — visualize your Claude Code token usage and costs
- **🔒 Secure key storage** — API keys stored in VS Code secret storage, never in plaintext
- **📦 Persistent buffer** — context survives VS Code restarts
- **⚙️ Configurable threshold** — set auto-save threshold to any value (minimum 2)

---

## Setup

**1. Install the extension**

Search `Session Bridge AI` in VS Code Extensions or install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=RajatJog.session-bridge-ai).

**2. Get a free API key**

| Provider | Free Tier | Link |
|----------|-----------|------|
| Gemini | ✅ Yes | [Google AI Studio](https://aistudio.google.com/apikey) |
| Claude | ❌ Credits needed | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| OpenAI | ❌ Credits needed | [OpenAI Platform](https://platform.openai.com/api-keys) |

**3. Set your provider and API key**

```
Ctrl+Shift+P → Session Bridge: Set Gemini API Key
```

---

## Commands

| Command | Action |
|---------|--------|
| `Session Bridge: Log Message` | Log what you're currently working on |
| `Session Bridge: Save Context Now` | Generate/update SESSION.md immediately |
| `Session Bridge: Start New Session` | Copy full handoff prompt to clipboard |
| `Session Bridge: Set AI Provider & API Key` | Set provider and API key |
| `Session Bridge: Clear Buffer` | Clear the current message buffer |
| `Session Bridge: Open Token Dashboard` | View token usage and cost analytics |

Or click **`Save Context`** in the bottom right status bar.

---

## Token Dashboard

Session Bridge AI reads Claude Code's local telemetry files to show you exactly how many tokens you're burning and what it costs.

Open it with:

```
Ctrl+Shift+P → Session Bridge: Open Token Dashboard
```
**What you'll see:**
- Total tokens, input tokens, output tokens, cache reads
- Estimated cost per project and overall
- Daily usage bar chart (last 7 days)
- Per-project breakdown with turn counts
- Model usage breakdown

**Requirements:** Claude Code must be installed and used at least once.

**Custom installation:** If you installed Claude Code in a non-standard location, set the `CLAUDE_CONFIG_DIR` environment variable to point to your `.claude` directory.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `session-bridge.provider` | `gemini` | AI provider — `gemini`, `claude`, or `openai` |
| `session-bridge.messageThreshold` | `5` | Messages before auto-save (min 2) |
| `session-bridge.captureGitDiff` | `true` | Include git diff in context |
| `session-bridge.captureOpenFiles` | `true` | Include open files in context |

---

## Workflow
1. Start working with Claude Code / Codex / Gemini / Amazon Q
2. Log progress every few exchanges:
3. Ctrl+Shift+P → "Session Bridge: Log Message"
Credits die unexpectedly? → Open SESSION.md → Paste it as the first message to your next AI tool → Continue exactly where you left off

---

## Example SESSION.md Output

```markdown
## Problem
Implement JWT-based authentication for a REST API

## Approach
Express.js + PostgreSQL, bcrypt for password hashing, JWT for stateless auth

## Completed
- POST /register — complete
- POST /login — complete, returns access + refresh tokens
- DB schema — finalized

## In Progress
- GET /me endpoint — needs auth middleware

## Next Steps
- Complete auth middleware
- Add token refresh endpoint
- Write integration tests

## Key Decisions
- Chose JWT over sessions for statelessness
- Refresh tokens stored in DB for revocation support

## Files Modified
- src/routes/auth.ts
- src/middleware/authenticate.ts
- src/db/schema.sql
```

---

## Requirements

- VS Code 1.116.0 or higher
- A free [Gemini API key](https://aistudio.google.com/apikey)

---

## Privacy

Session data is sent to Google's Gemini API to generate summaries. Your API key is stored securely using VS Code's built-in secret storage and never written to disk in plaintext.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

1. Fork the repo
2. Create your branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Save, then push to GitHub:

```
git add .
git commit -m "docs: add README with badges and sponsor link"
git push
```

---

## Support

If Session Bridge AI saves you time, consider sponsoring:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor%20on%20GitHub-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/RJ-Gamer)

---

<div align="center">

Made with ❤️ by [RJ-Gamer](https://github.com/RJ-Gamer)

</div>
