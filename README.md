# coach-microbit-python

Codio Custom Assistant ("Microbit Coach") for middle school students learning BBC micro:bit MicroPython at Milton Academy.

A single `index.js` + `metadata.json`, no build step. On every question it reads the student's open editor files plus all project `.py` files (via `codioIDE.files`), the assignment guide, and answers grounded in the official MicroPython v2 docs — without writing full solutions. The system prompt includes a "diagnosing vs. solving" Socratic section: direct help for errors and typos, guided questions for design problems, and a refusal + plan + tiny-example template for "write it for me" requests (snippets capped at ~5 lines).

The old `prompts/`, `policies/`, and `examples/` markdown files were never wired into the runtime and now live in `coaches/deprecated/coach-microbit-python-unwired-prompts/` for reference — everything active is inside `index.js`.

## Development

```bash
node --check index.js
```

See the parent `coaches/CLAUDE.md` for the shared coach architecture and API quirks. Deployment: bump `VERSION` in `index.js`, commit, then run `../publish_coaches.sh --publish` from the parent folder and Check for Updates in Codio. Typing `version` at any coach prompt confirms the release propagated.
