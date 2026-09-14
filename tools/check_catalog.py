#!/usr/bin/env python3
"""Offline consistency and OpenPGP verification of the committed catalog."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

from update_releases import ROOT, KEYS, hashes_from_manifest, key_for, verify_manifest


def main() -> None:
    data = json.loads((ROOT / "release.json").read_text(encoding="utf-8"))
    releases = data["releases"]
    assert data["schema"] == 1
    assert len(releases) == 41, "Review upstream release count changes before updating this assertion"
    assert len({item["tag"] for item in releases}) == len(releases)
    signed = 0
    unsigned = 0
    with tempfile.TemporaryDirectory(prefix="specter-catalog-check-") as temp:
        home = Path(temp) / "gnupg"
        home.mkdir()
        for name, spec in KEYS.items():
            key_file = ROOT / "keys" / f"{name}.asc"
            assert key_file.is_file()
            proc = subprocess.run(["gpg", "--homedir", str(home), "--batch", "--import", str(key_file)], capture_output=True)
            assert proc.returncode == 0, f"Could not import {name}"
            assert data["keys"][name]["fingerprint"] == spec["fingerprint"]
        for item in releases:
            tag = item["tag"]
            assert item["url"] == f"https://github.com/cryptoadvance/specter-diy/releases/tag/{tag}"
            assert item["files"]
            if item["authenticity"] == "upstream-signed-manifest":
                signed += 1
                assert item["signer"] == key_for(tag)
                assert item["manifest"] == f"signatures/{tag}/sha256.signed.txt"
                path = ROOT / item["manifest"]
                assert path.is_file()
                verify_manifest(home, path, KEYS[item["signer"]]["fingerprint"])
                hashes = hashes_from_manifest(path.read_bytes())
                assert {file["kind"] for file in item["files"]} == {"initial", "upgrade"}
                for file in item["files"]:
                    assert file["name"] in hashes and hashes[file["name"]] == file["sha256"]
            else:
                unsigned += 1
                assert item["authenticity"] == "unsigned-legacy"
                assert item["signer"] is None and item["manifest"] is None
                assert all(file["kind"] == "legacy" for file in item["files"])
            for file in item["files"]:
                assert re.fullmatch(r"[0-9a-f]{64}", file["sha256"])
                assert file["size"] > 0
                assert file["url"] == f"https://github.com/cryptoadvance/specter-diy/releases/download/{tag}/{file['name']}"
    assert signed == 27 and unsigned == 14
    assert releases[0]["tag"] == "v1.10.5"
    print(f"OK: {len(releases)} releases, {signed} verified OpenPGP manifests, {unsigned} unsigned historical releases")


if __name__ == "__main__":
    main()
