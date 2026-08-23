/**
 * Runner zrzutów: odtwarza je Z SPECYFIKACJI LEŻĄCYCH W REPO.
 *
 *   node tools/zrzuty/kolejka.mjs tools/zrzuty/spec/k1     — cały katalog
 *   node tools/zrzuty/kolejka.mjs spec/k1/z13-context.json — jedna sztuka
 *   node tools/zrzuty/kolejka.mjs partia.json              — tablica specyfikacji (stary tryb)
 *
 * PO CO KATALOG SPECYFIKACJI. Werdykt właściciela (2026-08-23, punkt 2):
 * asercje mają żyć w repo, nie w scratchpadzie sesji — inaczej po /clear nie ma
 * czego powtórzyć. Skoro asercja jest w specyfikacji, to w repo musi być cała
 * specyfikacja, a wtedy odtworzenie zrzutu jest JEDNĄ KOMENDĄ, a nie rekonstrukcją
 * z pamięci.
 *
 * Rodzaj narzędzia bierze się z treści specyfikacji, nie z nazwy pliku:
 * `raw` → ekran terminala (tui.mjs), `url` → strona w przeglądarce (zrob-zrzut.mjs).
 * Runner nie przerywa na błędzie — podaje bilans, żeby jedna niezgodna asercja
 * nie kasowała reszty partii.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const cel = process.argv[2];
if (!cel) { console.error('kolejka: podaj katalog ze specyfikacjami albo plik specyfikacji'); process.exit(2); }

const KAT_TMP = mkdtempSync(join(tmpdir(), 'kolejka-'));
const narzedzie = (spec) => new URL(spec.raw ? 'tui.mjs' : 'zrob-zrzut.mjs', import.meta.url).pathname;

/** [{nazwa, spec}] — z katalogu, z pojedynczego pliku albo ze starej tablicy. */
function zebrane() {
  if (statSync(cel).isDirectory())
    return readdirSync(cel).filter((f) => f.endsWith('.json')).sort()
      .map((f) => ({ nazwa: f, spec: JSON.parse(readFileSync(join(cel, f), 'utf8')) }));
  const tresc = JSON.parse(readFileSync(cel, 'utf8'));
  return Array.isArray(tresc)
    ? tresc.map((spec, i) => ({ nazwa: `${i + 1}`, spec }))
    : [{ nazwa: cel.split('/').pop(), spec: tresc }];
}

const pozycje = zebrane();
let bledy = 0;
for (const { nazwa, spec } of pozycje) {
  const plik = join(KAT_TMP, 'spec.json');
  writeFileSync(plik, JSON.stringify(spec));
  const r = spawnSync(process.execPath, [narzedzie(spec), plik], { encoding: 'utf8', timeout: 300000 });
  if (r.status === 0) console.log(`OK    ${nazwa}: ${(r.stdout || '').trim().split('\n').pop()}`);
  else { bledy++; console.log(`BŁĄD  ${nazwa} (kod ${r.status}): ${(r.stderr || '').trim().split('\n').slice(0, 4).join(' | ')}`); }
}
rmSync(KAT_TMP, { recursive: true, force: true });
console.log(`Koniec: ${pozycje.length - bledy}/${pozycje.length} OK`);
process.exit(bledy ? 1 : 0);
