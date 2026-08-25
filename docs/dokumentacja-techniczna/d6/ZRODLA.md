# Źródła dokumentacji technicznej — Dział D6 (kreator kursów)

Inaczej niż w D1–D4: dokumentacja **nie** została pobrana ze strony
nextjs.org, tylko skopiowana z zainstalowanego pakietu
`node_modules/next/dist/docs/` (Next.js **16.3.1** — dokładnie ta wersja,
na której działa aplikacja). To źródło jest bliższe prawdzie niż witryna,
bo witryna opisuje najnowszy Next, a nie ten z `package.json` — a Next 16
ma zmiany łamiące zgodność względem starszych wersji (ostrzega o tym blok
w [CLAUDE.md](../../../CLAUDE.md)).

| Plik | Źródło w pakiecie | Data | Wersja Next.js |
| ---- | ----------------- | ---- | -------------- |
| nextjs-server-actions.md | `01-app/02-guides/server-actions.md` | 2026-08-17 | 16.3.1 |
| nextjs-formularze.md | `01-app/02-guides/forms.md` | 2026-08-17 | 16.3.1 |
| nextjs-cookies.md | `01-app/03-api-reference/04-functions/cookies.md` | 2026-08-17 | 16.3.1 |

Jedyna zmiana w treści kopii: linki wewnętrzne `](/docs/…)` zamienione na
pełne adresy `https://nextjs.org/docs/…` — w pakiecie są to ścieżki
witryny, a w repo wyglądałyby jak (martwe) linki do plików projektu
i słusznie wywracały `straznik-linkow`.

## Co z tego weszło do kodu

1. **Ciastka ustawia się TYLKO w akcji serwerowej lub route handlerze**
   („Setting cookies is not supported during Server Component
   rendering") — dlatego brama kreatora loguje przez akcję serwerową
   [app/szkolenia/kreator/akcje.ts](../../../app/szkolenia/kreator/akcje.ts),
   a nie w renderze strony.
2. **Po ustawieniu ciastka Next sam przerenderowuje trasę** — po wpisaniu
   tokenu panel pojawia się bez ręcznego odświeżania.
3. **Akcja serwerowa to publiczny punkt wejścia** („Treat every action as
   an untrusted entry point”; renderowanie formularza nie jest granicą
   bezpieczeństwa) — dlatego token sprawdzamy w samej akcji, porównaniem
   w stałym czasie, z karą czasową za błąd.
4. **Formularze działają bez JavaScriptu** (`<form action={…}>`) — brama
   i wylogowanie są zwykłymi formularzami; wystrzał AJAX (zapisz/usuń/
   publikuj) wymaga JS, bo to panel właściciela, nie strona publiczna.
5. Akcje serwerowe kreatora **nie dotykają bazy** — zmiany danych idą
   jedynym wystrzałem `app/api/szkolenia` (WYTYCZNE §8: jedna baza =
   jeden AJAX).
