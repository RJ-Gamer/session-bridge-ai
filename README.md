# Session Bridge

Never lose your AI coding context again.

When working across multiple AI tools (Claude Code, Gemini, Codex, Amazon Q), 
credits run out without warning and you lose all context. Session Bridge 
maintains a running `SESSION.md` in your project that you can instantly hand 
off to any AI tool to continue exactly where you left off.

## Features

- **Auto-save** — context saved automatically every 5 messages
- **Manual save** — save anytime via status bar button or command
- **Smart summaries** — Gemini AI generates structured handoff documents
- **Secure key storage** — API key stored in VS Code secret storage, never in plaintext
- **Persistent buffer** — context survives VS Code restarts

## Setup

1. Install the extension
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run `Session Bridge: Set Gemini API Key`
4. Paste your [Gemini API key](https://aistudio.google.com/apikey) (free)

## Usage

| Action | How |
|--------|-----|
| Log what you're working on | `Ctrl+Shift+P` → `Session Bridge: Log Message` |
| Save context now | Click `Save Context` in status bar or `Ctrl+Shift+P` → `Session Bridge: Save Context Now` |
| Clear buffer | `Ctrl+Shift+P` → `Session Bridge: Clear Buffer` |
| Update API key | `Ctrl+Shift+P` → `Session Bridge: Set Gemini API Key` |

## Workflow

1. Start working with any AI tool
2. Log progress every few exchanges using `Log Message`
3. If credits run out, open `SESSION.md` and paste it as the first message to your next AI tool
4. Continue exactly where you left off

## Requirements

- A free [Gemini API key](https://aistudio.google.com/apikey)
- VS Code 1.116.0 or higher

## Privacy

Your code and session data is sent to Google's Gemini API to generate summaries.
Your API key is stored securely using VS Code's built-in secret storage and never 
written to disk in plaintext.