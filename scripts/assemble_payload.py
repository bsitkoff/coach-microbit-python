#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

system_prompt = (ROOT / 'prompts' / 'system_prompt.md').read_text(encoding='utf-8')

guidelines = (ROOT / 'prompts' / 'tutor_guidelines.md').read_text(encoding='utf-8')
# Extract the enforcement bullets under the first heading
excerpt_lines = []
record = False
for line in guidelines.splitlines():
    if line.strip().startswith('# '):
        record = True
        continue
    if record and line.strip().startswith('## '):
        break
    if record:
        excerpt_lines.append(line)
policy_excerpt = '\n'.join(excerpt_lines).strip()

allowed_docs = json.loads((ROOT / 'tools' / 'docs_index.json').read_text(encoding='utf-8')).get('allowed_docs', [])

payload = {
    'system': system_prompt,
    'policy_excerpt': policy_excerpt,
    'allowed_docs': allowed_docs,
}

print(json.dumps(payload, ensure_ascii=False, indent=2))
