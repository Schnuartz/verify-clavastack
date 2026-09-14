# Signing this verifier's source snapshot

Bitsaga signs a SHA-256 manifest of its website files with its own OpenPGP key. This repository includes an equivalent deterministic manifest generator, but **no ClavaStack signature is claimed or published yet**. There is no ClavaStack secret signing key available in this workspace. Never use the upstream Specter firmware signing keys for this website, and never commit a private key.

After the ClavaStack owner chooses a dedicated OpenPGP signing key and independently publishes its full fingerprint:

```sh
python tools/make_site_manifest.py --write
gpg --local-user YOUR_FULL_FINGERPRINT --detach-sign --armor --output signatures/site-manifest.txt.asc signatures/site-manifest.txt
gpg --verify signatures/site-manifest.txt.asc signatures/site-manifest.txt
python tools/make_site_manifest.py --check
```

Commit `signatures/site-manifest.txt`, `signatures/site-manifest.txt.asc`, and the **public** key. A reviewer should verify the fingerprint from a separate ClavaStack channel, then verify the signature and compare the manifest with the files actually served from `clavastack.com`. The manifest excludes `signatures/` to avoid hashing itself; the upstream Specter manifests in that directory are checked by `python tools/check_catalog.py`.

There is a deliberate tradeoff: `release.json` is part of this full-site manifest, while GitHub Actions updates that catalog automatically when a new trusted upstream release appears. Such a change makes an old ClavaStack site signature stale. Do not continue displaying “signed by ClavaStack” after that happens. Fully automatic re-signing requires a separate, tightly scoped CI signing key stored as a secret and an explicit decision to trust GitHub Actions with it. An offline owner-held key instead requires manual signing after each catalog change. Until that decision is made, the site only claims the **upstream firmware-manifest** checks described in `TRUST.md`.
