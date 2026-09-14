#!/usr/bin/env python3
"""Refresh Specter release data from upstream, failing closed on signatures.

Only the official cryptoadvance/specter-diy release assets are used. Official
clear-signed manifests are verified with GnuPG in an isolated temporary home
against fingerprints pinned below. Older, unsigned binaries are hashed as
historical identification aids and are never promoted to authenticated data.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.github.com/repos/cryptoadvance/specter-diy/releases?per_page=100"
UPSTREAM = "https://github.com/cryptoadvance/specter-diy"
KEYS = {
    "stepan": {
        "fingerprint": "6F16E354F83393D6E52EC25F36ED357AB24B915F",
        "url": "https://stepansnigirev.com/ss-specter-release.asc",
        "label": "Stepan Snigirev",
    },
    "specter2026": {
        "fingerprint": "9DC33CA830589DE3B3225C26EEF5756B2EA42349",
        "url": "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9DC33CA830589DE3B3225C26EEF5756B2EA42349",
        "label": "Specter Signer 2026",
    },
    "mike": {
        "fingerprint": "F2DBC4C614C113E2B15F879ADD5C1264EBD645BE",
        "url": "https://keys.openpgp.org/vks/v1/by-fingerprint/F2DBC4C614C113E2B15F879ADD5C1264EBD645BE",
        "label": "Mike Tolkachev",
    },
}
HASH_LINE = re.compile(r"^([0-9a-f]{64})  (?:\./)?([A-Za-z0-9_.-]+\.(?:bin|txt))$")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "ClavaStack-Specter-Verify/1.0", "Accept": "application/vnd.github+json" if url.startswith("https://api.github.com/") else "*/*"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def fetch_digest(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "ClavaStack-Specter-Verify/1.0"})
    digest = hashlib.sha256()
    with urllib.request.urlopen(request, timeout=60) as response:
        while chunk := response.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def key_for(tag: str) -> str:
    if tag == "v1.10.5":
        return "mike"
    if tag == "v1.10.3":
        return "specter2026"
    return "stepan"


def verify_manifest(gpg_home: Path, path: Path, expected: str) -> None:
    proc = subprocess.run(
        ["gpg", "--homedir", str(gpg_home), "--batch", "--no-tty", "--status-fd", "1", "--verify", str(path)],
        capture_output=True, text=True, errors="replace", check=False,
    )
    valid = re.findall(r"^\[GNUPG:\] VALIDSIG ([0-9A-F]+)", proc.stdout, re.M)
    if proc.returncode or expected not in valid:
        raise RuntimeError(f"Signature validation failed for {path.name}: {proc.stdout} {proc.stderr}")


def hashes_from_manifest(data: bytes) -> dict[str, str]:
    text = data.decode("utf-8")
    if not text.startswith("-----BEGIN PGP SIGNED MESSAGE-----") or "-----BEGIN PGP SIGNATURE-----" not in text:
        raise ValueError("Not a clear-signed OpenPGP manifest")
    signed_body = text.split("\n\n", 1)[1].split("-----BEGIN PGP SIGNATURE-----", 1)[0]
    result = {}
    for line in signed_body.splitlines():
        if not line.strip():
            continue
        match = HASH_LINE.fullmatch(line)
        if not match or match.group(2) in result:
            raise ValueError(f"Invalid or duplicate manifest line: {line!r}")
        result[match.group(2)] = match.group(1)
    if not result:
        raise ValueError("Empty manifest")
    return result


def main() -> None:
    releases = json.loads(fetch(API))
    if not isinstance(releases, list) or len(releases) < 30:
        raise RuntimeError("Upstream release list is unexpectedly short")
    (ROOT / "keys").mkdir(exist_ok=True)
    (ROOT / "signatures").mkdir(exist_ok=True)
    key_files = {}
    with tempfile.TemporaryDirectory(prefix="specter-verify-") as temp:
        gpg_home = Path(temp) / "gnupg"
        gpg_home.mkdir()
        for name, spec in KEYS.items():
            key_data = fetch(spec["url"])
            path = Path(temp) / f"{name}.asc"
            path.write_bytes(key_data)
            proc = subprocess.run(["gpg", "--homedir", str(gpg_home), "--batch", "--import", str(path)], capture_output=True, text=True, errors="replace")
            if proc.returncode:
                raise RuntimeError(f"Could not import {name}: {proc.stderr}")
            proc = subprocess.run(["gpg", "--homedir", str(gpg_home), "--batch", "--with-colons", "--fingerprint", spec["fingerprint"]], capture_output=True, text=True, errors="replace")
            if f"fpr:::::::::{spec['fingerprint']}:" not in proc.stdout:
                raise RuntimeError(f"Unexpected public key for {name}")
            key_files[name] = key_data

        catalog = []
        signature_files = {}
        for release in releases:
            tag = release["tag_name"]
            assets = {asset["name"]: asset for asset in release["assets"]}
            item = {
                "tag": tag,
                "date": release["published_at"],
                "prerelease": bool(release["prerelease"]),
                "url": release["html_url"],
                "authenticity": "unsigned-legacy",
                "signer": None,
                "manifest": None,
                "files": [],
            }
            if "sha256.signed.txt" in assets:
                key_name = key_for(tag)
                signed = fetch(assets["sha256.signed.txt"]["browser_download_url"])
                path = Path(temp) / f"{tag}-sha256.signed.txt"
                path.write_bytes(signed)
                verify_manifest(gpg_home, path, KEYS[key_name]["fingerprint"])
                hashes = hashes_from_manifest(signed)
                for kind, prefix in (("initial", "initial_firmware_"), ("upgrade", "specter_upgrade_")):
                    name = f"{prefix}{tag}.bin"
                    if name not in assets or name not in hashes:
                        raise RuntimeError(f"Missing signed {kind} asset for {tag}")
                    github_digest = assets[name].get("digest")
                    if github_digest and github_digest != f"sha256:{hashes[name]}":
                        raise RuntimeError(f"GitHub digest disagrees with signed manifest for {name}")
                    item["files"].append({"kind": kind, "name": name, "sha256": hashes[name], "size": assets[name]["size"], "url": assets[name]["browser_download_url"]})
                item["authenticity"] = "upstream-signed-manifest"
                item["signer"] = key_name
                item["manifest"] = f"signatures/{tag}/sha256.signed.txt"
                signature_files[tag] = signed
            else:
                # No upstream publisher signature exists for these early releases.
                for name, asset in assets.items():
                    if name != "specter-diy.bin":
                        continue
                    digest = fetch_digest(asset["browser_download_url"])
                    github_digest = asset.get("digest")
                    if github_digest and github_digest != f"sha256:{digest}":
                        raise RuntimeError(f"GitHub digest disagrees for {tag}")
                    item["files"].append({"kind": "legacy", "name": name, "sha256": digest, "size": asset["size"], "url": asset["browser_download_url"]})
                if not item["files"]:
                    raise RuntimeError(f"No supported assets for legacy release {tag}")
            catalog.append(item)
            print(f"{tag}: {item['authenticity']}")

    # Publish only after the entire catalog has passed validation.
    for name, data in key_files.items():
        (ROOT / "keys" / f"{name}.asc").write_bytes(data)
    for tag, data in signature_files.items():
        directory = ROOT / "signatures" / tag
        directory.mkdir(exist_ok=True)
        (directory / "sha256.signed.txt").write_bytes(data)
    result = {
        "schema": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": UPSTREAM,
        "keys": {name: {"fingerprint": spec["fingerprint"], "label": spec["label"], "source": spec["url"], "file": f"keys/{name}.asc"} for name, spec in KEYS.items()},
        "releases": catalog,
    }
    existing_path = ROOT / "release.json"
    if existing_path.exists():
        try:
            previous = json.loads(existing_path.read_text(encoding="utf-8"))
            if all(previous.get(field) == result[field] for field in ("schema", "source", "keys", "releases")):
                result["generatedAt"] = previous["generatedAt"]
        except (OSError, ValueError, KeyError, TypeError):
            pass
    (ROOT / "release.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(catalog)} releases and {len(signature_files)} verified signed manifests")


if __name__ == "__main__":
    main()
