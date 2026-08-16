# Pod strona Szkolenia — sklep z kursami dla matthewplugins.pl

Podstrona `/szkolenia`: sklep z kursami i ebookami. Projekt podzielony na
**3 moduły („pluginy")**, każdy z **własną bazą PostgreSQL**.

| # | Moduł | Branch | Baza | Zakres |
|---|-------|--------|------|--------|
| 1 | Sklep z kursami | `plugin-1-sklep-kursow` | `db1_kursy` | Katalog kursów, strona sprzedażowa, kreator kursów, audyt zmian |
| 2 | Płatności | `plugin-2-platnosci` | `db2_klienci` | Bramka płatności, zamówienia, dostawa kursu e-mailem |
| 3 | Panel admina | `plugin-3-admin-panel` | `db3_monitoring` | Widok admina, logi logowań, timer wizyt na stronie |

Pełny plan: [docs/PLAN.md](docs/PLAN.md)

## Workflow
- Praca nad każdym modułem na jego branchu, po kolei (1 → 2 → 3); merge do `main` po akceptacji.
- Repo `MatthewPlugins/matthewplugins.pl` jest tylko źródłem informacji (stack, design) — **nie modyfikujemy go**.
- Po ukończeniu i ocenie całości projekt zostanie przeniesiony na oryginalną stronę.

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind 4 · PostgreSQL ×3
