#!/usr/bin/env python3
"""Build or check a deterministic SHA-256 manifest of the verifier source.

The signatures directory is intentionally excluded to avoid a circular hash:
it contains upstream OpenPGP manifests and this site's optional detached
signature. Upstream manifests are checked separately by check_catalog.py.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "signatures" / "site-manifest.txt"
ROOT_FILES = ("index.html", "app.js", "style.css", "release.json", "README.md", "TRUST.md", "SIGNING.md", "ASSETS.md", "LICENSE", ".gitignore")
DIRECTORIES = ("assets", "keys", "vendor", "tools", ".github")


def site_files() -> list[Path]:
    paths = [ROOT / name for name in ROOT_FILES]
    for directory in DIRECTORIES:
        paths.extend(path for path in (ROOT / directory).rglob("*") if path.is_file())
    paths = [path for path in paths if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc"]
    return sorted(paths, key=lambda path: path.relative_to(ROOT).as_posix().encode("utf-8"))


def build() -> str:
    lines = []
    for path in site_files():
        with path.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        lines.append(f"{digest}  {path.relative_to(ROOT).as_posix()}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write", action="store_true", help="write signatures/site-manifest.txt")
    group.add_argument("--check", action="store_true", help="compare with the committed manifest")
    args = parser.parse_args()
    current = build()
    if args.write:
        MANIFEST.parent.mkdir(exist_ok=True)
        MANIFEST.write_text(current, encoding="utf-8", newline="\n")
        print(f"Wrote {MANIFEST.relative_to(ROOT)} with {len(current.splitlines())} files")
    elif args.check:
        if not MANIFEST.is_file() or MANIFEST.read_text(encoding="utf-8") != current:
            raise SystemExit("Site manifest is absent or stale; regenerate and re-sign after reviewing changes")
        print(f"OK: site manifest covers {len(current.splitlines())} files")
    else:
        print(current, end="")


if __name__ == "__main__":
    main()
