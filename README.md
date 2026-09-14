# Specter firmware verification · ClavaStack

An independent, static, bilingual (German/English) guide for checking and installing [Specter DIY](https://github.com/cryptoadvance/specter-diy) firmware. Designed for later deployment beneath `clavastack.com` as a directory with a trailing slash, for example `/specter-verify/`. No hosting or DNS change is made by this repository.

The user flow follows the four-step structure of [Bitsaga's SeedSigner verifier](https://github.com/bitsagarob/seedsigner-verify) (MIT), adapted to Specter's distinct initial-flash and SD-upgrade paths. The layout uses the supplied Specter brand palette and Montserrat heading font. All firmware links go to upstream GitHub; no firmware binary is shipped or uploaded here.

## What the checker does

1. Ask whether the device is blank or already running; ask for its case and optionally its installed version.
2. Link to the correct official upstream firmware asset. A version below v1.4.0 calls for initial flashing; v1.4.0–v1.9.0 requires the v1.10.3 intermediate SD upgrade before the latest release. If the installed version is unknown, show all branches without suggesting an unsafe single step.
3. Hash a user-selected `.bin` locally in 4 MiB chunks. Match against the pinned catalog of all upstream releases. The file never leaves the browser.
4. Show case-specific instructions for the five Specter 1 variants, including a marked JP2/STLK photograph. Specter 2 is a coming-soon panel linked to the existing ClavaStack newsletter.

The page checks `https://api.github.com/repos/cryptoadvance/specter-diy/releases/latest` when loaded. If GitHub reports a newer release than the locally verified catalog, it stops recommending the older binary as “latest” and points to GitHub. If the live request fails, the status is explicitly unconfirmed.

## Trust boundary

`release.json` contains 41 upstream releases as of 2026-09-14. For the 27 releases from v1.4.0 onward, the repository includes the original `sha256.signed.txt` assets. `tools/update_releases.py` verified each OpenPGP signature with an isolated GnuPG keyring and pinned signer fingerprints before extracting hashes. The page itself **does not perform OpenPGP verification in the browser**; it checks the user file's hash against those pinned values. See [TRUST.md](TRUST.md) for independent checks and limitations.

The 14 older releases and prereleases lack an official signed manifest. Their hashes were computed from upstream GitHub downloads for historical identification only. A hash match on those files is **not** a publisher-authenticity claim. They are never recommended as current installation firmware.

## Run locally

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. No install/build step or package manager is required. A local HTTP server is necessary for `fetch('./release.json')` and module loading; `file://` is not supported.

## Update the release catalog

GnuPG and Python 3.11+ must be on `PATH`. Review signer keys and release notes first, then run:

```sh
python tools/update_releases.py
python tools/check_catalog.py
```

This refreshes the data and signed-manifest copies; it does not push, publish or deploy. For a new signing identity, review its independent publication source and deliberately add its fingerprint to `tools/update_releases.py` before running. Never silently treat a new key as trusted.

The included GitHub Actions workflow checks upstream daily and commits a catalog change only when all manifests still validate. A new or unexpected signing key causes the workflow to fail closed; it does not silently trust the release. The page also checks GitHub live on every visit, so it warns immediately if a newer release has appeared before the next catalog refresh.

## Credits and assets

- `vendor/bitsaga/sha256.js`: streaming SHA-256 by Bitsaga, MIT; its license is included at `vendor/bitsaga/LICENSE`.
- Product photographs and logos: ClavaStack and Specter, with original source URLs in [ASSETS.md](ASSETS.md).
- STM32F469I-DISCO photo/board layout: Waveshare. The JP2/STLK instruction is cross-checked against [ST's user manual](https://www.st.com/resource/en/user_manual/dm00218846-discovery-kit-with-stm32f469ni-mcu-stmicroelectronics.pdf) and [Specter's quickstart](https://github.com/cryptoadvance/specter-diy/blob/master/docs/quickstart.md).
- The Metal assembly video is from the [Specter Wallet YouTube channel](https://www.youtube.com/watch?v=qKhnB6VP4jA). It is embedded only after a user clicks to load it.

This is not the official Specter Association firmware site. Review the upstream release notes before changing a device that protects real funds.
