<div align="center">

# 🌉 Session Bridge AI

### Never lose your AI coding context again.

![VS Code](https://img.shields.io/badge/VS%20CODE-EXTENSION-4f8ef7?style=for-the-badge&logo=visualstudiocode&logoColor=white)
![Version](https://img.shields.io/badge/VERSION-0.0.4-4f8ef7?style=for-the-badge)
![License](https://img.shields.io/badge/LICENSE-MIT-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-ACTIVE-brightgreen?style=for-the-badge)
![AI](https://img.shields.io/badge/POWERED%20BY-GEMINI%20AI-orange?style=for-the-badge&logo=google)
![PRs](https://img.shields.io/badge/PRS-WELCOME-blueviolet?style=for-the-badge&logo=github)
[![Sponsor](https://img.shields.io/badge/SPONSOR-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/RJ-Gamer)


</div>

---

## The Problem

You're deep into solving a problem with Claude Code. Credits run out — no warning, mid-sentence. You switch to Gemini. Now you have to explain everything again from scratch.

**Session Bridge AI fixes this.**

It maintains a running `SESSION.md` in your project — continuously updated, always ready to hand off to any AI tool so you can continue exactly where you left off.

---

## Features

- **🤖 AI-powered summaries** — Gemini generates rich, structured handoff documents
- **⚡ Auto-save** — context saved automatically every 5 logged messages
- **💾 Manual save** — save anytime via status bar button or command palette
- **🔒 Secure key storage** — API key stored in VS Code secret storage, never in plaintext
- **📦 Persistent buffer** — context survives VS Code restarts
- **🧹 Clear buffer** — reset and start fresh anytime

---

## Setup

**1. Install the extension**

Search `Session Bridge AI` in VS Code Extensions or install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=RajatJog.session-bridge-ai).

**2. Get a free Gemini API key**

Go to [Google AI Studio](https://aistudio.google.com/apikey) and create a free API key.

**3. Set your API key**

```
Ctrl+Shift+P → Session Bridge: Set Gemini API Key
```

---

## Usage

| Command | Action |
|--------|-----|
| `Session Bridge: Log Message` | Log what you're currently working on |
| `Session Bridge: Save Context Now` | Generate/update SESSION.md immediately |
| `Session Bridge: Set Gemini API Key` | Set or update your Gemini API key |
| `Session Bridge: Clear Buffer` | Clear the current message buffer |

Or click the **`Save Context`** button in the bottom right status bar.

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

