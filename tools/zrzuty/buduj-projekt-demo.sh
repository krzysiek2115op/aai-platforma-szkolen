#!/usr/bin/env bash
# Odtwarza projekt demonstracyjny dla zrzutów TUI Kursu 1 (Claude Code).
#   bash tools/zrzuty/buduj-projekt-demo.sh [katalog]     (domyślnie /tmp/oliwia/projekt-demo)
#
# Projekt jest MAŁY i PRAWDZIWY: dwa testy naprawdę padają, hooki naprawdę są
# skonfigurowane, serwer MCP naprawdę odpowiada. Dzięki temu panele /permissions,
# /hooks, /mcp i /memory mają co pokazać, a zrzut pochodzi z żywego interfejsu.
#
# Ścieżka jest neutralna z rozmysłu: HOME musi zostać PRAWDZIWY (tylko w nim
# żyje uwierzytelnienie Claude Code), więc neutralność daje katalog roboczy,
# a nie podmiana tekstu. Podmiana w TUI rozjeżdża ramki — patrz tui.mjs.
set -eu
KAT=${1:-/tmp/oliwia/projekt-demo}
rm -rf "$KAT"; mkdir -p "$KAT/lib" "$KAT/test" "$KAT/mcp" "$KAT/.claude/skills/summarize-changes" "$KAT/.claude/agents"
cd "$KAT"

cat > lib/koszyk.js <<'EOF'
export function sumaKoszyka(pozycje) {
  return pozycje.reduce((s, p) => s + p.cena * p.ilosc, 0);
}

// Rabat podajemy w procentach (15 = 15%), ale odejmujemy wprost — stąd błąd.
export function zRabatem(suma, procent) {
  return suma - procent;
}
EOF

cat > test/koszyk.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { sumaKoszyka, zRabatem } from "../lib/koszyk.js";

test("sumuje pozycje koszyka", () => {
  assert.equal(sumaKoszyka([{ cena: 10, ilosc: 2 }, { cena: 5, ilosc: 1 }]), 25);
});

test("nalicza rabat procentowy", () => {
  assert.equal(zRabatem(200, 0.15), 170);
});

test("rabat 100% zeruje koszyk", () => {
  assert.equal(zRabatem(200, 1), 0);
});
EOF

printf '{\n  "name": "koszyk",\n  "type": "module",\n  "version": "1.0.0",\n  "scripts": { "test": "node --test" }\n}\n' > package.json

cat > CLAUDE.md <<'EOF'
# Projekt: koszyk

Prosta biblioteka licząca wartość koszyka i rabaty.

## Zasady

- Testy uruchamiamy komendą `npm test` — musi być zielona przed commitem.
- Kwoty trzymamy w groszach, nie w złotówkach zmiennoprzecinkowych.
- Rabat podajemy jako ułamek (0.15 = 15%), nigdy jako liczbę całkowitą.
EOF

# UWAGA: reguła musi brzmieć Edit(./lib/**), nie Write(./lib/**) — Claude Code
# odrzuca tę drugą przy starcie ("not matched by file permission checks").
cat > .claude/settings.json <<'EOF'
{
  "permissions": {
    "allow": ["Bash(npm test)", "Bash(npm run lint)", "Bash(git status)", "Read(./lib/**)"],
    "ask": ["Bash(git push:*)", "Edit(./lib/**)"],
    "deny": ["Read(./.env)", "Bash(rm -rf:*)"]
  },
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "echo 'sprawdzam komende' >&2" }] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "npx prettier --write \"$CLAUDE_FILE_PATHS\" 2>/dev/null || true" }] }
    ]
  }
}
EOF

cat > .claude/skills/summarize-changes/SKILL.md <<'EOF'
---
name: summarize-changes
description: Streszcza niezacommitowane zmiany w repozytorium i wypisuje ryzyka do sprawdzenia przed commitem.
---

# Podsumowanie zmian

1. Uruchom `git status --short` i `git diff --stat`, żeby zobaczyć zakres zmian.
2. Dla każdego zmienionego pliku napisz jedno zdanie: co się zmieniło i po co.
3. Wypisz sekcję **Ryzyka** — po jednym punkcie na każdą zmianę, która może
   zepsuć testy, zmienić zachowanie publicznej funkcji albo dotknąć danych.
4. Zakończ zdaniem, czy zmiany są gotowe do commita.
EOF

cat > .claude/agents/code-improver.md <<'EOF'
---
name: code-improver
description: Suggest code improvements
tools: Read, Grep, Glob
---

Jesteś recenzentem kodu. Czytasz wskazany plik i proponujesz konkretne
usprawnienia: czytelność, nazwy, powtórzenia, brakujące przypadki brzegowe.
Nie zmieniasz plików — zwracasz listę propozycji z numerami linii.
EOF

cat > mcp/serwer.mjs <<'EOF'
#!/usr/bin/env node
// Mały serwer MCP po stdio (JSON-RPC 2.0). Bez zależności — działa offline.
//   node mcp/serwer.mjs magazyn   |   node mcp/serwer.mjs kursy
import { createInterface } from "node:readline";

const PROFIL = process.argv[2] ?? "magazyn";

const NARZEDZIA = {
  magazyn: [
    { name: "stan_magazynu", description: "Podaje stan magazynowy produktu po symbolu.",
      inputSchema: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } },
    { name: "lista_produktow", description: "Wypisuje symbole wszystkich produktów.",
      inputSchema: { type: "object", properties: {} } },
    { name: "rezerwuj", description: "Rezerwuje sztuki produktu na zamówienie.",
      inputSchema: { type: "object", properties: { symbol: { type: "string" }, ile: { type: "number" } }, required: ["symbol", "ile"] } },
  ],
  kursy: [
    { name: "kurs_waluty", description: "Podaje kurs waluty względem złotego.",
      inputSchema: { type: "object", properties: { waluta: { type: "string" } }, required: ["waluta"] } },
    { name: "przelicz", description: "Przelicza kwotę z waluty na złotówki.",
      inputSchema: { type: "object", properties: { kwota: { type: "number" }, waluta: { type: "string" } }, required: ["kwota", "waluta"] } },
  ],
};

const STAN = { "KOSZ-01": 42, "KOSZ-02": 7, "TORBA-11": 0 };
const KURSY = { EUR: 4.31, USD: 3.98, GBP: 5.06 };

function wywolaj(nazwa, a = {}) {
  if (nazwa === "stan_magazynu") return `${a.symbol}: ${STAN[a.symbol] ?? 0} szt.`;
  if (nazwa === "lista_produktow") return Object.keys(STAN).join(", ");
  if (nazwa === "rezerwuj") return `Zarezerwowano ${a.ile} szt. ${a.symbol}.`;
  if (nazwa === "kurs_waluty") return `${a.waluta}: ${KURSY[a.waluta] ?? "brak"} PLN`;
  if (nazwa === "przelicz") return `${a.kwota} ${a.waluta} = ${(a.kwota * (KURSY[a.waluta] ?? 0)).toFixed(2)} PLN`;
  throw new Error(`nieznane narzędzie: ${nazwa}`);
}

const wyslij = (o) => process.stdout.write(JSON.stringify(o) + "\n");

createInterface({ input: process.stdin }).on("line", (linia) => {
  if (!linia.trim()) return;
  let z; try { z = JSON.parse(linia); } catch { return; }
  if (z.method === "initialize")
    return wyslij({ jsonrpc: "2.0", id: z.id, result: {
      protocolVersion: "2024-11-05", capabilities: { tools: {} },
      serverInfo: { name: PROFIL, version: "1.0.0" } } });
  if (z.method === "tools/list")
    return wyslij({ jsonrpc: "2.0", id: z.id, result: { tools: NARZEDZIA[PROFIL] ?? [] } });
  if (z.method === "tools/call") {
    try {
      const tekst = wywolaj(z.params?.name, z.params?.arguments);
      return wyslij({ jsonrpc: "2.0", id: z.id, result: { content: [{ type: "text", text: tekst }] } });
    } catch (e) {
      return wyslij({ jsonrpc: "2.0", id: z.id, result: { content: [{ type: "text", text: String(e.message) }], isError: true } });
    }
  }
  if (z.id !== undefined) wyslij({ jsonrpc: "2.0", id: z.id, error: { code: -32601, message: "nieznana metoda" } });
});
EOF

cat > .mcp.json <<'EOF'
{
  "mcpServers": {
    "magazyn": { "command": "node", "args": ["mcp/serwer.mjs", "magazyn"] },
    "kursy-walut": { "command": "node", "args": ["mcp/serwer.mjs", "kursy"] }
  }
}
EOF

# DOWIĄZANIE SYMBOLICZNE — potrzebne do ekranu K1 4.8 („Restored the code, but
# skipped N files"). Sprawdzone w kodzie Claude Code 2.1.241: licznik pominiętych
# plików rośnie, gdy śledzona ścieżka jest dowiązaniem symbolicznym, twardym albo
# plikiem nieregularnym — a NIE wtedy, gdy plik zmieniła komenda powłoki. Bez
# takiego pliku ostrzeżenia nie da się wywołać, więc projekt demonstracyjny ma
# realny przypadek z prozy: plik wciągnięty dowiązaniem ze wspólnego katalogu.
WSPOLNE="$(dirname "$KAT")/wspolne"
mkdir -p "$WSPOLNE"
cat > "$WSPOLNE/formaty.js" <<'EOF'
// Wspólne formatowanie kwot — plik dzielony między projektami,
// wciągany do repozytorium dowiązaniem symbolicznym.
export function naZlotowki(grosze) {
  return (grosze / 100).toFixed(2) + " zł";
}
EOF
ln -sfn "$WSPOLNE/formaty.js" "$KAT/lib/formaty.js"

git init -q
git config user.email "oliwia@przyklad.pl"      # LOKALNIE — nigdy --global (brief §5)
git config user.name "Oliwia"
git add -A && git commit -qm "Koszyk liczy sume i rabat"
echo "projekt demonstracyjny: $KAT"
node --test 2>&1 | grep -E "^. (pass|fail) " || true
