#!/usr/bin/env python3
"""Vérifie l’absence de chaînes réseau interdites dans frontend-react."""
from __future__ import annotations

import pathlib
import re


ROOT = pathlib.Path(__file__).resolve().parents[1]
FORBIDDEN = [
    "localhost:8080",
    "localhost:8090",
    "gateway-service:8080",
    "/api/api",
]
PATTERN = re.compile("|".join(map(re.escape, FORBIDDEN)))
SCAN_FOLDERS = [ROOT / 'src']
EXTRA_FILES = [ROOT / 'index.html']
SKIP_SUFFIXES = {'.pyc', '.png', '.jpg', '.jpeg', '.gif', '.svg'}
FORBIDDEN_FILES = []


def iter_files():
    for extra in EXTRA_FILES:
        if extra.exists():
            yield extra
    for folder in SCAN_FOLDERS:
        if not folder.exists():
            continue
        for path in folder.rglob('*'):
            if path.is_file():
                yield path


for path in iter_files():
    if path.suffix in SKIP_SUFFIXES:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    rel_path = path.relative_to(ROOT)
    for line_no, line in enumerate(text.splitlines(), 1):
        if PATTERN.search(line):
            FORBIDDEN_FILES.append((rel_path, line_no, line.strip()))

if FORBIDDEN_FILES:
    print('Chaînes interdites détectées:')
    for rel_path, line_no, line in FORBIDDEN_FILES:
        print(f"- {rel_path}:{line_no}: {line}")
    raise SystemExit(1)

print('✅ Aucun endpoint interdit dans frontend-react.')
