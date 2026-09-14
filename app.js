import { hashFile, selfTest, crossCheck } from './vendor/bitsaga/sha256.js';

const app = document.getElementById('app');
const state = {
  lang: navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en',
  mode: 'easy',
  phase: null,
  device: null,
  current: '',
  catalog: null,
  live: { status: 'checking', tag: null },
  hashReady: false,
  file: null,
  computed: null,
  progress: 0,
  error: null,
  busy: false,
  videoLoaded: false,
};

const hardware = [
  { id: 'barebone', label: 'Barebone', image: 'barebone.png', de: 'Offenes Board / Barebone-Case', en: 'Open board / barebone case' },
  { id: 'snapcase', label: 'Specter DIY Snap Case', image: 'snapcase.png', de: 'Steckgehäuse ohne Secure Element', en: 'Snap case without secure element' },
  { id: 'lite', label: 'Specter Shield Lite', image: 'shield-lite.webp', de: 'Kunststoffgehäuse mit Smartcard', en: 'Plastic case with smartcard' },
  { id: 'shield', label: 'Specter Shield', image: 'shield.png', de: 'Kunststoffgehäuse mit Akku', en: 'Plastic case with battery' },
  { id: 'metal', label: 'Specter Shield Metal', image: 'shield-metal.webp', de: 'Metallgehäuse mit Akku', en: 'Metal case with battery' },
];

const copy = {
  de: {
    skip: 'Zum Inhalt springen', download: 'Download', verify: 'Prüfen', install: 'Flashen', finish: 'Starten',
    easy: 'Einfach', advanced: 'Erweitert', cypherpunk: 'Cypherpunk',
    eyebrow: 'Specter DIY · Firmware-Verifikation', hero1: 'Prüfe deinen', hero2: 'Specter.',
    lead: 'Firmware herunterladen, lokal verifizieren und passend zu deinem Gerät installieren.',
    heroMeta1: 'Originaldateien von Specter auf GitHub', heroMeta2: 'Deine Datei verlässt deinen Browser nicht', heroMeta3: 'Offener Quellcode',
    startTitle: 'Welchen Specter hast du?', startIntro: 'Zuerst klären wir, ob du ein leeres Gerät zum ersten Mal flashst oder einen bereits eingerichteten Specter aktualisierst.',
    phaseQuestion: 'Ist dein Specter bereits geflasht?', phaseNew: 'Nein, noch nicht', phaseNewSub: 'Erstinstallation oder Wiederherstellung per Mini-USB', phaseExisting: 'Ja, er läuft bereits', phaseExistingSub: 'Normales Update über die microSD-Karte',
    generation1: 'Specter 1 · Gehäuse wählen', generation2: 'Specter 2', soon: 'Coming soon', soonText: 'Die zweite Generation ist noch nicht veröffentlicht. Updates zu Entwicklung und Verfügbarkeit bekommst du über den Specter-2-Newsletter.', newsletter: 'Für Updates anmelden',
    versionQuestion: 'Welche Firmware läuft aktuell auf deinem Gerät?', versionHelp: 'Du findest die Version unter „Device settings“. Du kannst diesen Schritt überspringen; dann zeigen wir alle möglichen Wege, empfehlen aber keinen ungesicherten Einzelschritt.', versionPlaceholder: 'Bitte wählen oder überspringen', versionSkip: 'Ich weiß es nicht / überspringen',
    step1Title: 'Offizielle Firmware laden', step1Intro: 'Die Binärdatei kommt direkt aus dem offiziellen Specter-DIY-Release. Diese Website hostet keine Firmware.',
    chooseFirst: 'Bitte wähle oben zuerst Erstinstallation oder Update und dein Gehäuse.',
    latestPinned: 'Neueste im Katalog geprüfte Version', latestConfirmed: 'Aktuell neueste Version', latestUnknown: 'Live-Abfrage nicht möglich', latestNewer: 'Neueres Release verfügbar',
    staleWarning: 'GitHub meldet ein neueres Release als der lokale Prüfkatalog. Lade es nur von der offiziellen Release-Seite herunter; diese Seite kann es noch nicht verifizieren.',
    offlineWarning: 'Die aktuelle GitHub-Version konnte nicht live abgefragt werden. Die hier angezeigte Version ist die neueste im lokal geprüften Katalog, nicht zwingend die aktuellste Veröffentlichung.',
    initialFile: 'Initial-Firmware', upgradeFile: 'Upgrade-Firmware', directDownload: 'Datei direkt von GitHub laden', releasePage: 'Release-Seite öffnen',
    noVersionTitle: 'Version unbekannt: erst den passenden Weg bestimmen', noVersionText: 'Unter v1.4.0 ist Mini-USB-Erstflash nötig. Von v1.4.0 bis v1.9.0 zuerst v1.10.3 per SD installieren, danach die neueste Version. Ab v1.10.3 genügt das neueste SD-Upgrade. Prüfe die Versionsanzeige am Gerät, bevor du eine Datei auf die SD-Karte kopierst.',
    migrationTitle: 'Pflicht-Zwischenschritt: v1.10.3', migrationText: 'Der Bootloader bekam neue Signaturschlüssel. Geräte mit v1.9.0 oder älter müssen zuerst v1.10.3 per SD installieren. Erst nach dem Neustart darf das neueste Upgrade folgen.',
    legacyCurrentTitle: 'Alte Firmware: kein normales SD-Upgrade', legacyCurrentText: 'Versionen unter v1.4.0 benötigen laut Specter eine Initial-Firmware per Mini-USB. Sichere vorher alle notwendigen Wallet-Informationen; ein Erstflash ist kein normales Update und kann Gerätespeicher überschreiben.', initialRisk: 'Sichere alle benötigten Wallet-Informationen. Ein Erstflash oder Recovery ist kein normales Update und kann den Gerätespeicher überschreiben.',
    latestStep: 'Danach: neueste Upgrade-Firmware', unsignedNever: 'Die Datei mit „unsigned“ im Namen ist nicht für die normale Installation gedacht und wird hier nicht angeboten.',
    step2Title: 'Datei lokal prüfen', step2Intro: 'Zieh die heruntergeladene .bin-Datei hierher. SHA-256 wird nur in diesem Browser berechnet; die Datei wird nicht hochgeladen.',
    drop: 'Firmware-Datei hier ablegen', chooseFile: 'Oder Datei auswählen', privacy: 'Kein Upload · keine Anmeldung · kein Tracking', checking: 'Berechne SHA-256',
    matchTitle: 'Datei erkannt – Hash stimmt überein', mismatchTitle: 'Keine Übereinstimmung', mismatchText: 'Der berechnete Hash stimmt mit keinem Eintrag im Prüfkatalog überein. Diese Datei nicht flashen. Lade sie erneut direkt vom offiziellen Release.',
    unsignedTitle: 'Historische Datei erkannt – nicht authentifiziert', unsignedText: 'Dieser alte Release hat kein offizielles signiertes Hash-Manifest. Der Vergleich zeigt nur, dass die Datei mit dem hier archivierten GitHub-Download übereinstimmt. Er beweist nicht die Herkunft vom Hersteller.',
    signedText: 'Der lokale Hash stimmt mit dem Wert aus dem offiziellen signierten Specter-Manifest überein. Die Manifest-Signatur wurde beim Aktualisieren dieses Repositories mit dem unten genannten Fingerprint geprüft; im Browser wird die OpenPGP-Signatur nicht erneut geprüft.',
    notLatest: 'Diese Datei ist nicht die neueste Version.', thisLatest: 'Diese Datei entspricht der aktuell neuesten Version.', latestUncertain: 'Ob diese Datei die neueste Version ist, kann gerade nicht live bestätigt werden.',
    wrongKind: 'Achtung: Diese Datei passt nicht zum gewählten Installationsweg. Für Erstflash brauchst du „initial_firmware“, für ein reguläres SD-Update „specter_upgrade“.',
    versionLabel: 'Release', typeLabel: 'Dateityp', expectedHash: 'Erwarteter SHA-256', computedHash: 'Berechneter SHA-256', signer: 'Manifest-Signierer', fingerprint: 'Fingerabdruck',
    signatureManual: 'Signatur selbst prüfen', trustTitle: 'Was diese Prüfung beweist – und was nicht', trustText: 'Ein passender Hash bindet deine Datei an einen hier gespeicherten Wert. Die Signatur des Hersteller-Manifests wurde bei der Datenerstellung geprüft, aber eine manipulierte Website könnte auch einen manipulierten Katalog ausliefern. Vergleiche den Schlüssel-Fingerabdruck unabhängig, prüfe das Manifest selbst oder baue die Firmware reproduzierbar aus dem Quellcode. Authentische Firmware kann trotzdem Fehler enthalten; Hardware-Manipulation erkennt diese Seite nicht.',
    step3Title: 'Passend zu deinem Gerät flashen', step3Intro: 'Die Gehäuse unterscheiden sich beim Zugang zur Platine. Die Firmware-Dateien selbst sind für Specter 1 identisch.',
    noDevice: 'Wähle oben dein Gehäuse. Danach erscheint die konkrete Anleitung.',
    boardTitle: 'Jumper JP2 auf STLK setzen', boardText: 'Auf der Rückseite des STM32F469I-DISCO sitzt oben rechts der Power-Jumper JP2. Setze die schwarze Brücke auf die mit „STLK“ beziehungsweise „ST-LINK“ beschrifteten Pins (die mittlere der drei Versorgungspositionen). Orientiere dich an der Beschriftung auf deinem Board, nicht allein an der Blickrichtung des Fotos.',
    boardCaption: 'Foto: Waveshare, STM32F469I-DISCO (Rückseite). Kreis markiert JP2. Die STLK-Stellung ist auf der Platine beschriftet.', boardSource: 'ST-Benutzerhandbuch zu JP2',
    sdFormat: 'microSD-Karte FAT-formatiert, maximal 32 GB. Nur eine Datei namens „specter_upgrade_*.bin“ im Wurzelverzeichnis belassen.',
    bootloader: 'Bei SD-Upgrades prüft der sichere Specter-Bootloader die Signaturen der Upgrade-Datei selbst. Die Browser-Prüfung ist eine zusätzliche, unabhängige Kontrolle – kein Ersatz für diese Geräteprüfung.',
    step4Title: 'Neustart & Kontrolle', step4Intro: 'Nach dem Flashen Gerät neu starten und die Version unter „Device settings“ kontrollieren.',
    afterMigration: 'Wenn du gerade v1.10.3 als Zwischenschritt installiert hast, starte das Gerät neu, kontrolliere die Versionsanzeige und installiere erst dann das neueste Upgrade.',
    archiveTitle: 'Alle Releases im Prüfkatalog', archiveIntro: 'Signierte Manifeste ab v1.4.0 sind im Repository gespiegelt. Frühe Releases und Vorabversionen werden nur als nicht authentifizierbares Archiv geführt.', archiveDate: 'Datum', archiveStatus: 'Prüfstatus', archiveSigned: 'Signiertes Manifest', archiveUnsigned: 'Keine offizielle Signatur', pre: 'Vorabversion',
    source: 'Quellcode', methodology: 'Vertrauensmodell', official: 'Offizielle Releases', footerText: 'Unabhängige ClavaStack-Hilfeseite für Specter DIY. Keine Firmware wird hier gehostet. Keine Datei wird hochgeladen.',
    errorData: 'Die lokalen Release-Daten konnten nicht geladen werden. Verifikation ist deaktiviert.', errorHash: 'Die SHA-256-Selbstprüfung ist fehlgeschlagen. Verifikation ist deaktiviert.', errorRead: 'Die Datei konnte nicht gelesen werden.',
  },
  en: {
    skip: 'Skip to content', download: 'Download', verify: 'Check', install: 'Flash', finish: 'Start',
    easy: 'Easy', advanced: 'Advanced', cypherpunk: 'Cypherpunk',
    eyebrow: 'Specter DIY · Firmware verification', hero1: 'Check your', hero2: 'Specter.',
    lead: 'Download firmware, verify it locally, and install it for your exact device.',
    heroMeta1: 'Original files from Specter on GitHub', heroMeta2: 'Your file never leaves your browser', heroMeta3: 'Open-source code',
    startTitle: 'Which Specter do you have?', startIntro: 'First, tell us whether you are flashing a blank device for the first time or updating an already running Specter.',
    phaseQuestion: 'Has your Specter already been flashed?', phaseNew: 'No, not yet', phaseNewSub: 'Initial flash or recovery via Mini-USB', phaseExisting: 'Yes, it runs already', phaseExistingSub: 'Normal update via microSD card',
    generation1: 'Specter 1 · choose your case', generation2: 'Specter 2', soon: 'Coming soon', soonText: 'The second generation has not been released yet. Get development and availability updates from the Specter 2 newsletter.', newsletter: 'Sign up for updates',
    versionQuestion: 'Which firmware version is currently installed?', versionHelp: 'Find it under “Device settings”. You can skip this; we will then show every possible path, but cannot recommend a single step safely.', versionPlaceholder: 'Choose or skip', versionSkip: 'I do not know / skip',
    step1Title: 'Download official firmware', step1Intro: 'The binary comes directly from the official Specter DIY release. This website does not host firmware.',
    chooseFirst: 'Choose initial flash or update and your case above first.',
    latestPinned: 'Newest verified version in this catalog', latestConfirmed: 'Currently newest version', latestUnknown: 'Live check unavailable', latestNewer: 'Newer release available',
    staleWarning: 'GitHub reports a newer release than this local verification catalog. Download it only from the official release page; this site cannot verify it yet.',
    offlineWarning: 'We could not check GitHub for the latest release. This is the newest version in the locally verified catalog, not necessarily the latest publication.',
    initialFile: 'Initial firmware', upgradeFile: 'Upgrade firmware', directDownload: 'Download file from GitHub', releasePage: 'Open release page',
    noVersionTitle: 'Unknown version: establish the correct path first', noVersionText: 'Below v1.4.0 you need an initial Mini-USB flash. From v1.4.0 through v1.9.0 install v1.10.3 via SD first, then the latest version. From v1.10.3 onward, the latest SD upgrade is enough. Read the version on the device before copying a file to the SD card.',
    migrationTitle: 'Mandatory intermediate release: v1.10.3', migrationText: 'The bootloader signing keys changed. Devices on v1.9.0 or earlier must install v1.10.3 via SD first. Only after reboot should you install the newest upgrade.',
    legacyCurrentTitle: 'Old firmware: no normal SD upgrade', legacyCurrentText: 'According to Specter, versions below v1.4.0 require an initial firmware flash via Mini-USB. Back up all required wallet information first; an initial flash is not a normal upgrade and may overwrite device storage.', initialRisk: 'Back up all required wallet information. Initial flashing or recovery is not a normal update and may overwrite device storage.',
    latestStep: 'Then: newest upgrade firmware', unsignedNever: 'The file with “unsigned” in its name is not for normal installation and is not offered here.',
    step2Title: 'Check the file locally', step2Intro: 'Drop the downloaded .bin file here. SHA-256 is computed only in this browser; the file is not uploaded.',
    drop: 'Drop firmware file here', chooseFile: 'Or choose a file', privacy: 'No upload · no account · no tracking', checking: 'Computing SHA-256',
    matchTitle: 'File recognized – hash matches', mismatchTitle: 'No match', mismatchText: 'The computed hash matches no entry in this catalog. Do not flash this file. Download it again directly from the official release.',
    unsignedTitle: 'Historical file recognized – not authenticated', unsignedText: 'This early release has no official signed hash manifest. A match shows only that the file equals the GitHub download archived here. It does not prove publisher origin.',
    signedText: 'The local hash matches a value in an official signed Specter manifest. That manifest was checked against the fingerprint below when this repository was updated; the browser does not re-verify the OpenPGP signature.',
    notLatest: 'This file is not the newest version.', thisLatest: 'This file is currently the newest version.', latestUncertain: 'The latest-version status cannot be confirmed live right now.',
    wrongKind: 'Warning: this file does not fit your chosen installation route. Initial flashing needs “initial_firmware”; a normal SD update needs “specter_upgrade”.',
    versionLabel: 'Release', typeLabel: 'File type', expectedHash: 'Expected SHA-256', computedHash: 'Computed SHA-256', signer: 'Manifest signer', fingerprint: 'Fingerprint',
    signatureManual: 'Verify the signature yourself', trustTitle: 'What this proves – and what it does not', trustText: 'A matching hash binds your file to a value stored here. The publisher manifest signature was checked when building the catalog, but a compromised website could serve a compromised catalog too. Compare the key fingerprint independently, verify the manifest yourself, or reproducibly build from source. Authentic firmware may still have bugs, and this page cannot detect hardware tampering.',
    step3Title: 'Flash your exact device', step3Intro: 'Cases differ in how you access the board. The firmware files are the same for all Specter 1 variants.',
    noDevice: 'Choose your case above to see the specific instructions.',
    boardTitle: 'Set jumper JP2 to STLK', boardText: 'On the rear of the STM32F469I-DISCO, the JP2 power jumper sits at the top right. Put the black shunt over the pins marked “STLK” or “ST-LINK” (the middle of the three power positions). Follow the marking on your own board, not only the orientation of the photo.',
    boardCaption: 'Photo: Waveshare, STM32F469I-DISCO (back). The circle marks JP2. The STLK position is labeled on the board.', boardSource: 'ST user manual for JP2',
    sdFormat: 'Use a FAT-formatted microSD card of at most 32 GB. Leave only one “specter_upgrade_*.bin” file in its root.',
    bootloader: 'For SD upgrades, Specter’s secure bootloader checks the upgrade file signatures itself. The browser check is an additional independent control, not a replacement for the device check.',
    step4Title: 'Restart & confirm', step4Intro: 'Restart after flashing, then confirm the version under “Device settings”.',
    afterMigration: 'If you just installed v1.10.3 as an intermediate step, restart, confirm its version, and only then install the newest upgrade.',
    archiveTitle: 'All releases in this catalog', archiveIntro: 'Signed manifests from v1.4.0 are mirrored in the repository. Earlier and prerelease files are kept only as an unauthenticated archive.', archiveDate: 'Date', archiveStatus: 'Verification', archiveSigned: 'Signed manifest', archiveUnsigned: 'No official signature', pre: 'Prerelease',
    source: 'Source code', methodology: 'Trust model', official: 'Official releases', footerText: 'Independent ClavaStack guide for Specter DIY. No firmware is hosted here. No file is uploaded.',
    errorData: 'Local release data could not be loaded. Verification is disabled.', errorHash: 'SHA-256 self-check failed. Verification is disabled.', errorRead: 'The file could not be read.',
  },
};

const t = (key) => copy[state.lang][key] ?? key;
const e = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const url = (value) => /^https:\/\/([a-z0-9-]+\.)*(github\.com|clavastack\.com|specter\.solutions|st\.com|www\.st\.com|www\.youtube\.com|youtube\.com|stepansnigirev\.com|keys\.openpgp\.org|keyserver\.ubuntu\.com)(\/|\?|$)/i.test(value) ? e(value) : '#';
const release = (tag) => state.catalog?.releases.find((x) => x.tag === tag);
const stable = () => state.catalog?.releases.filter((x) => !x.prerelease) ?? [];
const latestPinned = () => stable()[0];
const currentNumber = () => /^v(\d+)\.(\d+)\.(\d+)$/.exec(state.current);
const before = (a, b) => { const x = a.match(/^v(\d+)\.(\d+)\.(\d+)$/), y = b.match(/^v(\d+)\.(\d+)\.(\d+)$/); if (!x || !y) return false; for (let i = 1; i <= 3; i++) { if (+x[i] < +y[i]) return true; if (+x[i] > +y[i]) return false; } return false; };
const needsInitial = () => state.phase === 'new' || (state.phase === 'existing' && state.current && before(state.current, 'v1.4.0'));
const needsMigration = () => state.phase === 'existing' && state.current && !before(state.current, 'v1.4.0') && before(state.current, 'v1.10.3');
const latestState = () => {
  if (state.live.status === 'newer') return `<div class="note warning"><strong>${t('latestNewer')} (${e(state.live.tag)}).</strong> ${t('staleWarning')} <a href="${url('https://github.com/cryptoadvance/specter-diy/releases/latest')}" target="_blank" rel="noopener noreferrer">${t('official')}</a></div>`;
  if (state.live.status === 'offline') return `<div class="note warning">${t('offlineWarning')}</div>`;
  return '';
};
const modeClass = () => state.mode === 'cypherpunk' ? 'mode-cypherpunk' : state.mode === 'advanced' ? 'mode-advanced' : 'mode-easy';

function downloadCard(file, heading) {
  if (!file) return '';
  const pinned = latestPinned();
  return `<div class="download-panel"><div class="eyebrow">${e(heading)}</div><h3>${e(file.name)}</h3><p>${file.kind === 'initial' ? t('initialFile') : t('upgradeFile')} · ${Math.round(file.size / 1024)} KiB · ${e(file.releaseTag)}</p><div class="download-actions"><a class="button" href="${url(file.url)}" target="_blank" rel="noopener noreferrer" download>${t('directDownload')} ↗</a><a class="button secondary" href="${url(release(file.releaseTag)?.url ?? pinned.url)}" target="_blank" rel="noopener noreferrer">${t('releasePage')} ↗</a></div><div class="mode-extra advanced"><div class="fact-grid"><div class="fact"><label>SHA-256</label><div>${e(file.sha256)}</div></div><div class="fact"><label>${t('versionLabel')}</label><div>${e(file.releaseTag)}</div></div></div></div></div>`;
}

function recommendedFiles() {
  const pinned = latestPinned();
  if (!pinned || !state.phase || !state.device) return `<p class="only-when-selected">${t('chooseFirst')}</p>`;
  const mainInitial = { ...pinned.files.find((f) => f.kind === 'initial'), releaseTag: pinned.tag };
  const mainUpgrade = { ...pinned.files.find((f) => f.kind === 'upgrade'), releaseTag: pinned.tag };
  const migration = release('v1.10.3');
  const migrationFile = migration && { ...migration.files.find((f) => f.kind === 'upgrade'), releaseTag: migration.tag };
  const status = state.live.status === 'confirmed' ? t('latestConfirmed') : t('latestPinned');
  let output = `<p class="status-line">${status}: <strong>${e(pinned.tag)}</strong> · <a href="${url(pinned.url)}" target="_blank" rel="noopener noreferrer">GitHub</a></p>${latestState()}`;
  if (state.live.status === 'newer') return output;
  if (needsInitial()) {
    if (state.phase === 'existing') output += `<div class="note warning"><strong>${t('legacyCurrentTitle')}</strong><br>${t('legacyCurrentText')}</div>`;
    output += downloadCard(mainInitial, t('initialFile'));
  } else if (needsMigration()) {
    output += `<div class="note warning"><strong>${t('migrationTitle')}</strong><br>${t('migrationText')}</div>`;
    output += downloadCard(migrationFile, `1 · ${t('migrationTitle')}`);
    output += downloadCard(mainUpgrade, `2 · ${t('latestStep')}`);
  } else if (state.phase === 'existing' && !state.current) {
    output += `<div class="note warning"><strong>${t('noVersionTitle')}</strong><br>${t('noVersionText')}</div>`;
    output += downloadCard(migrationFile, `v1.4.0–v1.9.0 · ${t('upgradeFile')}`);
    output += downloadCard(mainUpgrade, `≥ v1.10.3 · ${t('upgradeFile')}`);
    output += downloadCard(mainInitial, `< v1.4.0 · ${t('initialFile')}`);
  } else if (state.phase === 'existing' && state.current === pinned.tag) {
    output += `<div class="note success">${t('thisLatest')}</div>`;
  } else {
    output += downloadCard(mainUpgrade, t('upgradeFile'));
  }
  return output + `<p class="small">${t('unsignedNever')}</p>`;
}

function fileMatch() {
  if (!state.computed) return null;
  const matches = [];
  for (const item of state.catalog.releases) for (const file of item.files) if (file.sha256 === state.computed) matches.push({ release: item, file });
  return matches.length === 1 ? matches[0] : null;
}

function fileResult() {
  if (state.error) return `<div class="result bad" role="alert"><h3>${e(state.error)}</h3></div>`;
  if (state.busy) return `<div aria-live="polite"><p>${t('checking')}: ${Math.round(state.progress * 100)}%</p><div class="progress-wrap"><div class="progress-bar" style="width:${Math.round(state.progress * 100)}%"></div></div></div>`;
  if (!state.computed) return '';
  const found = fileMatch();
  if (!found) return `<div class="result bad" role="alert"><h3>✕ ${t('mismatchTitle')}</h3><p>${t('mismatchText')}</p><div class="fact-grid"><div class="fact"><label>${t('computedHash')}</label><div>${e(state.computed)}</div></div><div class="fact"><label>${state.lang === 'de' ? 'Datei' : 'File'}</label><div>${e(state.file?.name)}</div></div></div></div>`;
  const signed = found.release.authenticity === 'upstream-signed-manifest';
  const key = state.catalog.keys[found.release.signer];
  const newest = state.live.status === 'confirmed' && state.live.tag === found.release.tag;
  const versionMessage = state.live.status === 'confirmed' ? newest ? t('thisLatest') : t('notLatest') : state.live.status === 'newer' ? t('notLatest') : t('latestUncertain');
  const wrong = state.phase && ((needsInitial() && found.file.kind !== 'initial') || (!needsInitial() && state.phase === 'existing' && state.current && found.file.kind === 'initial'));
  return `<div class="result ${signed ? 'ok' : 'warn'}" role="status"><h3>${signed ? '✓ ' + t('matchTitle') : '⚠ ' + t('unsignedTitle')}</h3><p>${signed ? t('signedText') : t('unsignedText')}</p><p><strong>${e(found.release.tag)}</strong> · ${e(found.file.name)} · ${e(versionMessage)}</p>${wrong ? `<div class="note warning">${t('wrongKind')}</div>` : ''}<div class="fact-grid"><div class="fact"><label>${t('computedHash')}</label><div>${e(state.computed)}</div></div><div class="fact"><label>${t('expectedHash')}</label><div>${e(found.file.sha256)}</div></div>${signed ? `<div class="fact"><label>${t('signer')}</label><div>${e(key.label)}</div></div><div class="fact"><label>${t('fingerprint')}</label><div>${e(key.fingerprint.match(/.{1,4}/g).join(' '))}</div></div>` : ''}</div><div class="link-group"><a href="${url(found.release.url)}" target="_blank" rel="noopener noreferrer">${t('releasePage')} ↗</a>${signed ? `<a href="${e(found.release.manifest)}" target="_blank" rel="noopener noreferrer">sha256.signed.txt</a><a href="${url(key.source)}" target="_blank" rel="noopener noreferrer">${t('signer')} ↗</a>` : ''}</div>${signed ? `<div class="mode-extra cypherpunk"><p>${t('signatureManual')}:</p><code class="copy-code">gpg --import ${e(key.file)}\ngpg --fingerprint ${e(key.fingerprint)}\ngpg --verify ${e(found.release.manifest)}\nsha256sum ${e(state.file?.name)}</code></div>` : ''}</div>`;
}

function boardGuide() {
  const alt = state.lang === 'de' ? 'STM32F469I-DISCO von hinten; JP2 sitzt rechts neben der ST-LINK-Beschriftung' : 'Back of STM32F469I-DISCO; JP2 is to the right of the ST-LINK label';
  const portNote = state.lang === 'de' ? 'JP2 ≠ JP5. Mini-USB = ST-LINK-Anschluss CN1, nicht die Micro-USB-Buchse.' : 'JP2 ≠ JP5. Mini-USB is the ST-LINK CN1 port, not the Micro-USB port.';
  return `<div class="board-guide"><figure><div class="board-photo"><img src="assets/board-5.jpg" alt="${alt}"><span class="board-marker" aria-hidden="true"></span></div><figcaption>${t('boardCaption')} <a href="https://www.waveshare.com/stm32f469i-disco.htm" target="_blank" rel="noopener noreferrer">Waveshare ↗</a></figcaption></figure><div class="board-text"><h3>${t('boardTitle')}</h3><p>${t('boardText')}</p><a href="https://www.st.com/resource/en/user_manual/dm00218846-discovery-kit-with-stm32f469ni-mcu-stmicroelectronics.pdf" target="_blank" rel="noopener noreferrer">${t('boardSource')} ↗</a><p class="small">${portNote}</p></div></div>`;
}

function initialInstructions() {
  const device = state.device;
  const lines = {
    barebone: { de: ['Lege das offene Board so hin, dass du die Rückseite und JP2 siehst. Das Barebone-Case muss nicht geöffnet werden.', 'Setze JP2 auf STLK. Verbinde den ST-LINK-Anschluss CN1 per Mini-USB direkt mit dem PC.', 'Kopiere die geprüfte initial_firmware-Datei auf das eingebundene Laufwerk DIS_F469NI. Warte, bis das Board neu startet.'], en: ['Place the open board so you can see its back and JP2. The barebone case need not be opened.', 'Set JP2 to STLK. Connect ST-LINK port CN1 directly to the PC with Mini-USB.', 'Copy the checked initial_firmware file to the DIS_F469NI drive. Wait for the board to restart.'] },
    snapcase: { de: ['Öffne das Snap Case vorsichtig, damit JP2 zugänglich wird. Kabel und Scanner nicht abreißen.', 'Setze JP2 auf STLK (mittlere, beschriftete Stellung). Verbinde dann CN1 per Mini-USB mit dem PC.', 'Kopiere die geprüfte initial_firmware-Datei auf DIS_F469NI. Nach dem Neustart das Gehäuse wieder einrasten.'], en: ['Open the snap case carefully to reach JP2 without pulling scanner cables.', 'Set JP2 to STLK (labeled middle position), then connect CN1 via Mini-USB to the PC.', 'Copy the checked initial_firmware file to DIS_F469NI. Reassemble the snap case after reboot.'] },
    lite: { de: ['Verbinde den ST-LINK-Anschluss des Boards per Mini-USB mit dem PC; stecke zusätzlich das Micro-USB-Kabel zur Stromversorgung des Shield Lite an.', 'Prüfe, ob das Laufwerk DIS_F469NI erscheint. Beide USB-Kabel müssen für diese Shield-Lite-Variante angeschlossen sein.', 'Kopiere die geprüfte initial_firmware-Datei auf DIS_F469NI. Warte auf den Neustart, bevor du Kabel entfernst.'], en: ['Connect the board ST-LINK port to the PC with Mini-USB, and connect Micro-USB for Shield Lite power too.', 'Check that the DIS_F469NI drive appears. Both USB cables must be connected for this Shield Lite variant.', 'Copy the checked initial_firmware file to DIS_F469NI. Wait for reboot before removing cables.'] },
    shield: { de: ['Schalte das Gerät aus und schraube das Kunststoffgehäuse vorsichtig auf. Lege Akku- und Scannerkabel nicht unter Zug.', 'Stelle JP2 auf STLK und verbinde CN1 per Mini-USB direkt mit dem PC.', 'Kopiere die geprüfte initial_firmware-Datei auf DIS_F469NI. Nach dem Neustart Kabel prüfen und das Gehäuse wieder vollständig zusammenschrauben.'], en: ['Power off and carefully unscrew the plastic case. Do not strain the battery or scanner cables.', 'Set JP2 to STLK and connect CN1 directly to the PC with Mini-USB.', 'Copy the checked initial_firmware file to DIS_F469NI. After reboot check the cables and fully reassemble the case.'] },
    metal: { de: ['Schalte das Gerät aus. Das Metallgehäuse muss für einen Erstflash geöffnet werden; folge dem eingebetteten Aufbauvideo für die Reihenfolge der Teile.', 'Lege die Platine frei, setze JP2 auf STLK und verbinde CN1 per Mini-USB direkt mit dem PC.', 'Kopiere die geprüfte initial_firmware-Datei auf DIS_F469NI. Nach dem Neustart Jumper, Akku und Kabel prüfen und das Gehäuse wieder zusammenbauen.'], en: ['Power off. The metal case must be opened for an initial flash; follow the embedded assembly video for the part order.', 'Expose the board, set JP2 to STLK, and connect CN1 directly to the PC via Mini-USB.', 'Copy the checked initial_firmware file to DIS_F469NI. After reboot check jumper, battery, and cables, then reassemble.'] },
  };
  const steps = lines[device]?.[state.lang] ?? [];
  if (!steps.length) return `<p>${t('noDevice')}</p>`;
  const video = device === 'metal' ? `<div class="download-panel"><h3>Specter Shield Metal assembling</h3><p>${state.lang === 'de' ? 'Offizielles Video vom Specter-Wallet-Kanal. YouTube wird erst nach deiner Auswahl geladen.' : 'Official Specter Wallet channel video. YouTube loads only after your choice.'}</p>${state.videoLoaded ? '<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/qKhnB6VP4jA" title="Specter Shield Metal assembling" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' : `<button type="button" data-action="video" class="button secondary">${state.lang === 'de' ? 'Video hier laden' : 'Load video here'}</button>`}<div class="link-group"><a href="https://www.youtube.com/watch?v=qKhnB6VP4jA" target="_blank" rel="noopener noreferrer">${state.lang === 'de' ? 'Auf YouTube öffnen' : 'Open on YouTube'} ↗</a></div></div>` : '';
  return `<div class="note warning"><strong>${state.lang === 'de' ? 'Nur für leere Geräte oder Wiederherstellung.' : 'Only for blank devices or recovery.'}</strong> ${t('initialRisk')}</div>${device === 'lite' ? '' : boardGuide()}<ol class="instruction-list">${steps.map((line) => `<li><p>${e(line)}</p></li>`).join('')}</ol>${video}`;
}

function upgradeInstructions() {
  const intro = state.lang === 'de' ? 'Für einen bereits geflashten Specter: Kopiere ausschließlich die signierte Upgrade-Datei, nie die initial_firmware oder die unsigned-Variante.' : 'For an already flashed Specter: copy only the signed upgrade file, never initial_firmware or an unsigned variant.';
  const steps = state.lang === 'de'
    ? ['Lies die installierte Version unter „Device settings“ ab. Ist sie unbekannt, folge der obigen Entscheidungshilfe und beginne nicht blind mit der neuesten Datei.', 'Formatiere eine microSD-Karte als FAT (höchstens 32 GB). Lege nur eine specter_upgrade_*.bin-Datei in ihr Wurzelverzeichnis.', 'Bei v1.4.0 bis v1.9.0 zuerst v1.10.3 einspielen. Karte einsetzen, Gerät einschalten, Bootloader-Prüfung und Update abwarten, dann neu starten.', 'Erst nach bestätigtem v1.10.3 die neueste signierte Upgrade-Datei auf die Karte kopieren und den Vorgang wiederholen.']
    : ['Read the installed version in “Device settings”. If unknown, follow the decision guide above; do not blindly start with the latest file.', 'Format a microSD card as FAT (at most 32 GB). Place only one specter_upgrade_*.bin file in its root.', 'For v1.4.0 through v1.9.0 install v1.10.3 first. Insert the card, power on, wait for bootloader verification and update, then reboot.', 'Only after confirming v1.10.3 copy the newest signed upgrade to the card and repeat the process.'];
  const pertinent = state.current && before(state.current, 'v1.4.0') ? `<div class="note warning">${t('legacyCurrentText')}</div>` : '';
  return `<div class="note">${intro}</div>${pertinent}<ol class="instruction-list">${steps.map((line) => `<li><p>${e(line)}</p></li>`).join('')}</ol><div class="note success">${t('bootloader')}</div>`;
}

function archive() {
  return `<details><summary><h3 style="display:inline">${t('archiveTitle')}</h3></summary><p class="small">${t('archiveIntro')}</p><div class="archive"><table><thead><tr><th>${t('versionLabel')}</th><th>${t('archiveDate')}</th><th>${t('archiveStatus')}</th></tr></thead><tbody>${state.catalog.releases.map((r) => `<tr><td><a href="${url(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.tag)}</a>${r.prerelease ? ` <small>(${t('pre')})</small>` : ''}</td><td>${e(r.date?.slice(0,10))}</td><td><span class="badge ${r.authenticity === 'upstream-signed-manifest' ? '' : 'unsigned'}">${r.authenticity === 'upstream-signed-manifest' ? t('archiveSigned') : t('archiveUnsigned')}</span></td></tr>`).join('')}</tbody></table></div></details>`;
}

function render() {
  if (!state.catalog) {
    app.innerHTML = `<main id="main" class="loading" role="alert">${state.error ? e(state.error) : state.lang === 'de' ? 'Release-Daten werden geladen …' : 'Loading release data …'}</main>`;
    return;
  }
  document.documentElement.lang = state.lang;
  const pinned = latestPinned();
  app.innerHTML = `<div class="${modeClass()}">
    <header class="topbar"><div class="topbar-inner"><a class="brand" href="https://clavastack.com" target="_blank" rel="noopener noreferrer"><img src="assets/specter-ghost-logo.png" alt=""><span>Clava<span>Stack</span> · Specter</span></a><nav aria-label="${state.lang === 'de' ? 'Schritte' : 'Steps'}"><ol class="steps-nav">${[['download',t('download')],['verify',t('verify')],['install',t('install')],['finish',t('finish')]].map(([id,label],i)=>`<li><a href="#${id}"><b>${i+1}</b>${label}</a></li>`).join('')}</ol></nav><div class="top-actions"><div class="mode-switch" role="group" aria-label="${state.lang === 'de' ? 'Detailstufe' : 'Detail level'}">${['easy','advanced','cypherpunk'].map(m => `<button type="button" data-action="mode" data-value="${m}" aria-pressed="${state.mode===m}">${t(m)}</button>`).join('')}</div><div class="lang-switch" role="group" aria-label="Language"><button type="button" data-action="lang" data-value="de" aria-pressed="${state.lang==='de'}">DE</button><button type="button" data-action="lang" data-value="en" aria-pressed="${state.lang==='en'}">EN</button></div></div></div></header>
    <main id="main" class="shell"><section class="hero"><p class="eyebrow">${t('eyebrow')}</p><h1>${t('hero1')}<br><em>${t('hero2')}</em></h1><p class="lead">${t('lead')}</p><div class="meta-line"><span>${t('heroMeta1')}</span><span>${t('heroMeta2')}</span><span>${t('heroMeta3')}</span></div></section>
      <section class="section" id="choose"><h2>${t('startTitle')}</h2><p class="section-intro">${t('startIntro')}</p><div class="question"><p class="question-label">${t('phaseQuestion')}</p><div class="choice-row"><button class="choice-card" type="button" data-action="phase" data-value="new" aria-pressed="${state.phase==='new'}"><strong>${t('phaseNew')}</strong><span>${t('phaseNewSub')}</span></button><button class="choice-card" type="button" data-action="phase" data-value="existing" aria-pressed="${state.phase==='existing'}"><strong>${t('phaseExisting')}</strong><span>${t('phaseExistingSub')}</span></button></div></div>${state.phase==='existing' ? `<div class="question"><label class="question-label" for="current-version">${t('versionQuestion')}</label><p class="small">${t('versionHelp')}</p><select class="version-select" id="current-version"><option value="">${t('versionSkip')}</option>${stable().map(r=>`<option value="${e(r.tag)}" ${state.current===r.tag?'selected':''}>${e(r.tag)}</option>`).join('')}</select></div>` : ''}<p class="generation">${t('generation1')}</p><div class="device-grid">${hardware.map(h=>`<button type="button" class="device-card" data-action="device" data-value="${h.id}" aria-pressed="${state.device===h.id}"><div class="device-image"><img src="assets/${h.image}" alt="${e(h.label)}" loading="lazy"></div><div class="device-copy"><strong>${e(h.label)}</strong><span>${e(h[state.lang])}</span></div></button>`).join('')}</div><p class="generation">${t('generation2')}</p><div class="gen2"><img src="assets/specter-2.png" alt="Specter 2 teaser" loading="lazy"><div><strong>${t('soon')}</strong><p>${t('soonText')}</p><a href="https://clavastack.com/specter-2/newsletter" target="_blank" rel="noopener noreferrer">${t('newsletter')} ↗</a></div></div></section>
      <section class="section" id="download"><div class="section-head"><span class="step-number">01</span><h2>${t('step1Title')}</h2></div><p class="section-intro">${t('step1Intro')}</p>${recommendedFiles()}</section>
      <section class="section" id="verify"><div class="section-head"><span class="step-number">02</span><h2>${t('step2Title')}</h2></div><p class="section-intro">${t('step2Intro')}</p><label class="file-drop" id="drop-zone"><strong>${t('drop')}</strong><span>${t('chooseFile')}</span><span class="small">${t('privacy')}</span><input id="firmware-file" type="file" accept=".bin,application/octet-stream" aria-label="${t('chooseFile')}" ${state.hashReady?'':'disabled'}></label>${fileResult()}<div class="mode-extra advanced"><div class="note"><strong>${t('trustTitle')}</strong><br>${t('trustText')}</div></div></section>
      <section class="section" id="install"><div class="section-head"><span class="step-number">03</span><h2>${t('step3Title')}</h2></div><p class="section-intro">${t('step3Intro')}</p>${!state.device ? `<p>${t('noDevice')}</p>` : needsInitial() ? initialInstructions() : state.phase==='existing' ? upgradeInstructions() : `<p>${t('chooseFirst')}</p>`}</section>
      <section class="section" id="finish"><div class="section-head"><span class="step-number">04</span><h2>${t('step4Title')}</h2></div><p class="section-intro">${t('step4Intro')}</p>${needsMigration() ? `<div class="note warning">${t('afterMigration')}</div>` : ''}<div class="note"><strong>${t('trustTitle')}</strong><br>${t('trustText')}</div>${archive()}<div class="link-group"><a href="https://github.com/cryptoadvance/specter-diy/releases" target="_blank" rel="noopener noreferrer">${t('official')} ↗</a><a href="TRUST.md">${t('methodology')} ↗</a></div></section>
    </main><footer class="footer"><div class="shell footer-inner"><div><strong>ClavaStack × Specter</strong><p>${t('footerText')}</p><p class="status-line">${state.lang==='de'?'Katalog aktualisiert':'Catalog updated'}: ${e(state.catalog.generatedAt?.slice(0,10))} · ${state.catalog.releases.length} Releases · ${state.catalog.releases.filter(r=>r.authenticity==='upstream-signed-manifest').length} ${state.lang==='de'?'signierte Manifeste':'signed manifests'}</p></div><div class="footer-links"><a href="https://clavastack.com/newsletter" target="_blank" rel="noopener noreferrer">Newsletter</a><a href="https://github.com/cryptoadvance/specter-diy" target="_blank" rel="noopener noreferrer">Specter GitHub</a><a href="TRUST.md">${t('methodology')}</a></div></div></footer>
  </div>`;
}

async function handleFile(file) {
  if (!file || !state.hashReady || !state.catalog) return;
  state.file = file;
  state.error = null;
  state.computed = null;
  state.progress = 0;
  state.busy = true;
  render();
  try {
    state.computed = await hashFile(file, (progress) => { state.progress = progress; const bar = document.querySelector('.progress-bar'); if (bar) bar.style.width = `${Math.round(progress*100)}%`; const text = document.querySelector('#verify [aria-live="polite"] p'); if (text) text.textContent = `${t('checking')}: ${Math.round(progress*100)}%`; });
  } catch (error) {
    state.error = t('errorRead');
    console.error('Local hash failed:', error);
  } finally { state.busy = false; render(); }
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action, value = button.dataset.value;
  if (action === 'lang' && ['de','en'].includes(value)) state.lang = value;
  if (action === 'mode' && ['easy','advanced','cypherpunk'].includes(value)) state.mode = value;
  if (action === 'phase' && ['new','existing'].includes(value)) { state.phase = value; if (value === 'new') state.current = ''; }
  if (action === 'device' && hardware.some(h=>h.id===value)) state.device = value;
  if (action === 'video') state.videoLoaded = true;
  render();
});
app.addEventListener('change', (event) => {
  if (event.target.id === 'current-version') { state.current = event.target.value; render(); }
  if (event.target.id === 'firmware-file') handleFile(event.target.files?.[0]);
});
app.addEventListener('dragover', (event) => { if (event.target.closest('#drop-zone')) { event.preventDefault(); event.target.closest('#drop-zone').classList.add('dragover'); } });
app.addEventListener('dragleave', (event) => { if (event.target.closest('#drop-zone')) event.target.closest('#drop-zone').classList.remove('dragover'); });
app.addEventListener('drop', (event) => { const zone = event.target.closest('#drop-zone'); if (!zone) return; event.preventDefault(); zone.classList.remove('dragover'); handleFile(event.dataTransfer?.files?.[0]); });

async function bootstrap() {
  try {
    const response = await fetch('./release.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (catalog.schema !== 1 || !Array.isArray(catalog.releases) || catalog.releases.length < 30) throw new Error('Invalid catalog');
    state.catalog = catalog;
    const test = selfTest();
    const cross = await crossCheck();
    state.hashReady = !!(test.ok && cross.ok && !cross.skipped);
    if (!state.hashReady) state.error = t('errorHash');
    render();
  } catch (error) {
    state.error = t('errorData');
    render();
    console.error('Catalog unavailable:', error);
    return;
  }
  try {
    const response = await fetch('https://api.github.com/repos/cryptoadvance/specter-diy/releases/latest', { cache: 'no-store', headers: { 'Accept': 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const latest = await response.json();
    if (!latest.tag_name || !/^v\d+\.\d+\.\d+$/.test(latest.tag_name)) throw new Error('Invalid GitHub release');
    state.live = { status: latest.tag_name === latestPinned().tag ? 'confirmed' : 'newer', tag: latest.tag_name };
  } catch (error) {
    state.live = { status: 'offline', tag: null };
  }
  render();
}

bootstrap();
