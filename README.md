# Specter firmware verification · ClavaStack

An independent, static, bilingual (German/English) guide for checking and installing [Specter DIY](https://github.com/cryptoadvance/specter-diy) firmware. Maintained in the [ClavaStack owner's repository](https://github.com/Schnuartz/verify-clavastack). The site can be deployed beneath `clavastack.com` as a directory with a trailing slash, for example `/specter-verify/`. A GitHub repository alone does not change the live website or DNS.

The user flow follows the four-step structure of [Bitsaga's SeedSigner verifier](https://github.com/bitsagarob/seedsigner-verify) (MIT), adapted to Specter's distinct initial-flash and SD-upgrade paths. The layout uses the supplied Specter brand palette and Montserrat heading font. All firmware links go to upstream GitHub; no firmware binary is shipped or uploaded here.

## What the checker does

1. Ask whether the device is blank or already running; ask for its case and optionally its installed version.
2. Link to the correct official upstream firmware asset. A version below v1.4.0 calls for initial flashing; v1.4.0–v1.9.0 requires the v1.10.3 intermediate SD upgrade before the latest release. If the installed version is unknown, show all branches without suggesting an unsafe single step.
3. Hash a user-selected `.bin` locally in 4 MiB chunks. Match against the pinned catalog of all upstream releases. The file never leaves the browser.
4. Show case-specific instructions for the five Specter 1 variants, including a marked JP2/STLK photograph. Specter 2 is a coming-soon panel linked to the existing ClavaStack newsletter.

The three detail levels do not change the cryptographic check: **Easy** shows the essentials; **Advanced** additionally exposes hashes, release facts and trust boundaries; **Cypherpunk** additionally gives commands for independent signature/file checks. The header's `i` button explains this on the page.

The page checks `https://api.github.com/repos/cryptoadvance/specter-diy/releases/latest` when loaded. If GitHub reports a newer release than the locally verified catalog, it stops recommending the older binary as “latest” and points to GitHub. If the live request fails, the status is explicitly unconfirmed.

## Trust boundary

`release.json` contains 41 upstream releases as of 2026-09-14. For the 27 releases from v1.4.0 onward, the repository includes the original `sha256.signed.txt` assets. `tools/update_releases.py` verified each OpenPGP signature with an isolated GnuPG keyring and pinned signer fingerprints before extracting hashes. The page itself **does not perform OpenPGP verification in the browser**; it checks the user file's hash against those pinned values. See [TRUST.md](TRUST.md) for independent checks and limitations.

The 14 older releases and prereleases lack an official signed manifest. Their hashes were computed from upstream GitHub downloads for historical identification only. A hash match on those files is **not** a publisher-authenticity claim. They are never recommended as current installation firmware.

## Run locally

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. No install/build step or package manager is required. A local HTTP server is necessary for `fetch('./release.json')` and module loading; `file://` is not supported.

The local page makes one live request to the GitHub releases API for newest-version status. If that request fails or is rate-limited, it explicitly reports that freshness is unconfirmed. The firmware file remains entirely local.

## Publishing

The static site consists of `index.html`, `app.js`, `style.css`, `release.json`, `assets/`, `vendor/`, `keys/`, `signatures/` and the linked Markdown documents. Serve those files together at a path ending in `/` so relative URLs resolve correctly. Use HTTPS and make sure the web host does not rewrite or cache old `release.json` indefinitely. The included CI workflow checks every committed signed manifest, JavaScript syntax, local image paths and the repository link on pushes and pull requests. Publishing to `clavastack.com` still requires a deployment route from this repository to that host; no secret or custom domain is configured in this repository.

GitHub Pages availability depends on repository visibility and the owner's plan. A private GitHub repository on GitHub Free cannot be used for Pages, while a public repository can. Changing visibility or connecting a custom domain is an owner decision; neither is done by these files.

For Hostinger's hPanel Git deployment, connect the `main` branch to the verified document root of the dedicated subdomain. After its first deployment, store Hostinger's auto-deployment webhook URL as the repository Actions secret `HOSTINGER_DEPLOY_WEBHOOK`. The included deployment workflow calls that webhook only after the latest `main` commit passes the catalog and source checks. Never commit the webhook URL or hosting credentials. A successful webhook call only requests a Hostinger deployment; confirm the deployment log and live HTTPS page separately.

## Update the release catalog

GnuPG and Python 3.11+ must be on `PATH`. Review signer keys and release notes first, then run:

```sh
python tools/update_releases.py
python tools/check_catalog.py
```

This refreshes the data and signed-manifest copies; it does not push, publish or deploy. For a new signing identity, review its independent publication source and deliberately add its fingerprint to `tools/update_releases.py` before running. Never silently treat a new key as trusted.

The included GitHub Actions workflow checks upstream daily and commits a catalog change only when all manifests still validate. It discovers the actual signer from each manifest among pinned public keys, so new releases from those signers need no manual version-number edits. It refreshes the checked timestamp at least every 30 days even if no release has changed, reducing the risk of GitHub disabling this public repository's schedule for inactivity. A genuinely new signing key, changed asset naming, upstream outage or disabled GitHub Actions schedule still requires attention; it never silently trusts a new key. The page checks GitHub live on every visit and warns immediately if a newer release has appeared before the next catalog refresh. See [GitHub's schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Site-source signing

Bitsaga also signs a manifest of its own website files. `tools/make_site_manifest.py` provides the equivalent deterministic manifest and check here, but **this ClavaStack site is not yet PGP-signed**: no owner-controlled secret key is available. [SIGNING.md](SIGNING.md) explains the independent fingerprint and signing steps, including the conflict between a full-site signature and automatic catalog changes. Do not present upstream firmware signatures as a signature of this website.

## Credits and assets

- `vendor/bitsaga/sha256.js`: streaming SHA-256 by Bitsaga, MIT; its license is included at `vendor/bitsaga/LICENSE`.
- Product photographs and logos: ClavaStack and Specter, with original source URLs in [ASSETS.md](ASSETS.md).
- STM32F469I-DISCO photo/board layout: Waveshare. The JP2/STLK instruction is cross-checked against [ST's user manual](https://www.st.com/resource/en/user_manual/dm00218846-discovery-kit-with-stm32f469ni-mcu-stmicroelectronics.pdf) and [Specter's quickstart](https://github.com/cryptoadvance/specter-diy/blob/master/docs/quickstart.md).
- The Metal assembly video is from the [Specter Wallet YouTube channel](https://www.youtube.com/watch?v=qKhnB6VP4jA). It is embedded only after a user clicks to load it.

This is not the official Specter Association firmware site. Review the upstream release notes before changing a device that protects real funds.

The original code and documentation in this repository are [MIT-licensed](LICENSE); product photographs and third-party assets retain their own ownership and licenses.
