# coach-microbit-python

A Micro:bit-focused teaching coach that corrects errors, offers suggestions, and explains concepts without producing full, runnable solutions. Grounded in the BBC micro:bit MicroPython v2 documentation.

## Goals
- Coach, not coder: never provide complete programs or assignment solutions.
- Correct, explain, and hint with tiny, non-solution examples students can adapt.
- Ground answers in official docs: https://microbit-micropython.readthedocs.io/en/v2-docs/

## How to use the prompts
At runtime, include:
1. `prompts/system_prompt.md` as the system message.
2. A short policy excerpt from `prompts/tutor_guidelines.md` (the enforcement bullets).
3. Optionally, a pattern from `prompts/refusal_and_rewrite.md` when a student requests a full solution.
4. The allowed-docs list from `tools/docs_index.json` as the grounding source (or use it to build your own retrieval index).

All other markdown files are for maintainers and policy clarity; they are not passed to the model on every request.

## Non-solution snippets
See `examples/non_solution_snippets` for tiny patterns (≤5 lines) that illustrate APIs without solving full tasks.

## Academic integrity
See `policies/academic_integrity.md`. The coach explains, hints, and models thinking; it does not deliver answers.


## Runtime payload helper
To assemble the minimal payload (system + policy excerpt + allowed docs):
```bash
./scripts/assemble_payload.py > runtime_payload.json
```
Feed `runtime_payload.json` into your chat system, using `system`, `policy_excerpt` (as a short additional system or developer message), and use `allowed_docs` to constrain retrieval.
- Add a small retrieval component that only indexes URLs listed in `tools/docs_index.json`.
- Create evaluation prompts that test refusal behavior.
