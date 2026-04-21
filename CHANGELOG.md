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
