// Runner: node kolejka.mjs <batch.json>  — batch: [{...spec}], wykonuje po kolei,
// wypisuje OK/BŁĄD per pozycja, nie przerywa na błędzie.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const batch = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let bledy = 0;
for (const spec of batch) {
  mkdirSync(dirname(spec.wyjscie), { recursive: true });
  writeFileSync('/tmp/spec-biezacy.json', JSON.stringify(spec));
  const r = spawnSync('node', [new URL('zrob-zrzut.mjs', import.meta.url).pathname, '/tmp/spec-biezacy.json'], { encoding: 'utf8', timeout: 180000 });
  if (r.status === 0) console.log(r.stdout.trim());
  else { bledy++; console.log(`BŁĄD ${spec.wyjscie}: ${(r.stderr || '').split('\n').slice(0,3).join(' | ')}`); }
}
console.log(`Koniec: ${batch.length - bledy}/${batch.length} OK`);
process.exit(bledy ? 1 : 0);
