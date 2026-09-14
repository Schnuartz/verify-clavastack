# Trust model and independent verification

## What a green result means

The browser reads a user-selected file locally, calculates SHA-256 in chunks, and compares it with a value stored in `release.json`. For releases from v1.4.0 onward, that value was extracted from the official Specter `sha256.signed.txt` file **after** its OpenPGP signature was verified by the repository update script. The browser does not upload the file and does not itself verify OpenPGP signatures.

This establishes a chain *if* the code, catalog, signer-key mapping and site delivery are trustworthy. A compromised site could change both code and expected hashes. A publisher-signed release can still have security bugs. No web page can prove the physical hardware is untampered, prove a signing key was held safely, or prove a binary corresponds to source unless you independently reproduce the build.

The upstream Specter firmware manifests are signed; the ClavaStack website source is **not yet signed with a separate ClavaStack PGP key**. The [site-signing procedure](SIGNING.md) is prepared but needs an owner-controlled key and a separately published fingerprint. Do not infer that a green file result authenticates the page itself.

## Verify without trusting this page

1. Get the release asset and `sha256.signed.txt` directly from [Specter's official GitHub releases](https://github.com/cryptoadvance/specter-diy/releases).
2. Get the signing key independently and compare its **complete** fingerprint with the release notes or [Specter's security policy](https://github.com/cryptoadvance/specter-diy/blob/master/SECURITY.md). The key used by the signed hash manifest has changed over time:

   | Release | Manifest signer | Fingerprint |
   | --- | --- | --- |
   | v1.4.0–v1.9.0 | Stepan Snigirev | `6F16 E354 F833 93D6 E52E C25F 36ED 357A B24B 915F` |
   | v1.10.3 | Specter Signer 2026 | `9DC3 3CA8 3058 9DE3 B322 5C26 EEF5 756B 2EA4 2349` |
   | v1.10.5 | Mike Tolkachev | `F2DB C4C6 14C1 13E2 B15F 879A DD5C 1264 EBD6 45BE` |

3. In a directory containing the downloaded firmware and manifest:

   ```sh
   gpg --import signing-key.asc
   gpg --fingerprint FULL_FINGERPRINT
   gpg --verify sha256.signed.txt
   gpg --decrypt sha256.signed.txt > sha256.verified.txt
   sha256sum -c sha256.verified.txt
   ```

   On macOS use `shasum -a 256 -c sha256.verified.txt`. Older manifest lines may begin with `./`; that is normal when files are in the same directory. The manifest also names `unsigned` build artifacts on recent releases, but these are **not** offered by this site for regular installation.

4. For a stronger check, follow the [official reproducible-build instructions](https://github.com/cryptoadvance/specter-diy/blob/master/docs/reproducible-build.md) and compare resulting bytes/hashes yourself.

## Firmware update caveats

- The [v1.10.3 release notes](https://github.com/cryptoadvance/specter-diy/releases/tag/v1.10.3) state that devices running v1.9.0 or earlier must install v1.10.3 before later SD upgrades, due to a bootloader signing-key rotation.
- The [official quickstart](https://github.com/cryptoadvance/specter-diy/blob/master/docs/quickstart.md) says devices below v1.4.0 or blank boards use `initial_firmware_<version>.bin` over Mini-USB, with jumper JP2 set to `STLK`. This is not a routine update and may overwrite device storage.
- For a normal SD upgrade, Specter's secure bootloader verifies signatures on the upgrade file. The page's local hash check is additional defense and identification, not a replacement for that check.
- If the current version is unknown, the page shows the entire decision path instead of guessing.

## Historical releases

The original upstream assets for v1.0.0–v1.3.0 and the prereleases have no signed hash manifest. Their `release.json` values are hashes of the assets obtained from GitHub during catalog generation. They support identifying a legacy file, but **cannot authenticate it as an official publisher-signed release**. Do not use a legacy match as a green light for storing funds.

## Privacy and network requests

The page loads local CSS, JavaScript, images, keys, and catalog; it sends only a read-only request to GitHub's `releases/latest` API to learn whether a newer version exists. Clicking a download opens an official GitHub URL. A selected file stays in the browser, with no server upload. The Specter Metal YouTube embed is opt-in and loads only when clicked. This repository includes no analytics, cookies, or signup form; the newsletter link opens ClavaStack's existing signup page.
