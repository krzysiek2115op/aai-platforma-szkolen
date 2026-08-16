# Plan projektu — Podstrona „Szkolenia" (matthewplugins.pl/szkolenia)

> Repo: `MatthewPlugins/Pod-strona-Szkolenia` (prywatne).
> Po ukończeniu i akceptacji całości → merge do `MatthewPlugins/matthewplugins.pl`.
> Repo głównej strony jest w tym projekcie **tylko do odczytu** (czerpiemy stack, design, konwencje).

---

## 1. Kontekst i decyzje architektoniczne

### Stan obecny głównej strony
- `matthewplugins.pl` = **Next.js 16 + React 19 + TypeScript + Tailwind 4**, tryb `output: "export"` (statyczny), publikacja na GitHub Pages.
- GitHub Pages to **hosting tymczasowy (podgląd)** — decyzja właściciela: docelowo strona przejdzie na **wykupiony hosting z Node.js / VPS**.

### Decyzje (ustalone 2026-08-16)
| Temat | Decyzja |
|---|---|
| Backend | **Next.js (ten sam codebase co strona główna)** — API Routes / Server Actions, TypeScript |
| Bazy danych | **3 osobne bazy PostgreSQL** (lokalnie: Docker; produkcyjnie: VPS lub Neon/Supabase) |
| „Pluginy" | 3 **odizolowane moduły** w kodzie — każdy z własnym katalogiem, własną bazą, własnym API |
| Bramka płatności | wybór odłożony do prac nad Pluginem 2 — kod pisany pod **abstrakcję operatora** (adapter), żeby dało się podpiąć Stripe / P24 / Tpay bez przeróbek |
| Design | dziedziczymy z matthewplugins.pl (Tailwind 4, fonty Geist, komponenty UI) — podstrona ma wyglądać jak część głównej strony |

### Struktura modułów (monorepo, izolacja jak „wtyczki")
```
modules/
  m1-sklep/      ← Plugin 1: katalog kursów + strona kursu + kreator kursów
  m2-platnosci/  ← Plugin 2: bramka płatności + dostawa kursu mailem
  m3-admin/      ← Plugin 3: panel admina + logi logowań + timer wizyt
```
Zasady izolacji:
- moduł łączy się **wyłącznie ze swoją bazą** (osobny connection string: `DB1_URL`, `DB2_URL`, `DB3_URL`);
- moduły nie importują swojego kodu nawzajem — komunikacja tylko przez publiczne API modułu (`modules/mX/index.ts`);
- każdy moduł ma własne migracje SQL (`modules/mX/db/migrations/`).

---

## 2. Plugin 1 — Sklep z kursami (branch `plugin-1-sklep-kursow`) ← ZACZYNAMY TU

Inspiracje:
- **agenciai.pl/sklep-agentow** → strona-lista: siatka kart produktów (obrazek, tytuł, opis, CTA „Sprawdź ofertę"), bez zbędnych filtrów przy małej liczbie produktów.
- **claudedlafirm.pl/#poznaj** → strona pojedynczego kursu: propozycja wartości → co otrzymasz → agenda/moduły → dla kogo → opinie → cena → gwarancja → FAQ → CTA „Dołącz".

### 2.1 Podstrony (frontend)
| Ścieżka | Co zawiera |
|---|---|
| `/szkolenia` | Hero + siatka kart kursów (okładka, tytuł, krótki opis, cena, badge np. „ebook"/„kurs", CTA) |
| `/szkolenia/[slug]` | Pełna strona sprzedażowa kursu: hero z propozycją wartości, sekcje „czego się nauczysz", program (moduły/lekcje — akordeon), „dla kogo", opinie, cena + CTA zakupu (na razie placeholder → Plugin 2), gwarancja, FAQ |
| `/szkolenia/kreator` | **Kreator kursów** (dostęp docelowo tylko admin — pełne zabezpieczenie w Pluginie 3): formularz tworzenia/edycji kursu — metadane, sekcje strony sprzedażowej, moduły i lekcje, upload okładki; lista kursów z akcjami edytuj/usuń/publikuj |

### 2.2 Baza danych nr 1 — `db1_kursy` (PostgreSQL)
Wymaganie: **zapis kursów do bazy przy dodawaniu, usuwaniu i modyfikowaniu** — czyli pełny CRUD + dziennik zmian (audyt).

Tabele:
- `courses` — id, slug, title, type (`ebook`/`kurs`), short_desc, price_grosze, currency, cover_url, status (`draft`/`published`/`archived`), created_at, updated_at
- `course_sections` — sekcje strony sprzedażowej (kind: `hero`/`benefits`/`for_whom`/`faq`/`guarantee`…, position, content JSONB)
- `course_modules` — moduły programu kursu (course_id, position, title, summary)
- `course_lessons` — lekcje (module_id, position, title, duration_min, preview bool)
- `course_changelog` — **dziennik audytu**: id, course_id, action (`create`/`update`/`delete`/`publish`), changed_fields JSONB (stan przed/po), actor, created_at — wpis przy KAŻDEJ operacji (INSERT/UPDATE/DELETE), realizowany triggerami PostgreSQL, więc żadna zmiana nie ominie logu

### 2.3 Backend modułu 1
- `GET /api/szkolenia/courses` — lista opublikowanych (dla katalogu)
- `GET /api/szkolenia/courses/[slug]` — pełny kurs (dla strony sprzedażowej)
- `POST/PUT/DELETE /api/szkolenia/admin/courses` — CRUD kreatora (walidacja Zod; auth tymczasowo prostym tokenem, docelowo sesja z Pluginu 3)
- Dwa kursy startowe (seed): **2 kursy właściciela** wprowadzone przez kreator

### 2.4 Definicja ukończenia Pluginu 1
- [ ] `/szkolenia` renderuje kursy z bazy (nie z plików)
- [ ] `/szkolenia/[slug]` pokazuje pełną stronę sprzedażową z bazy
- [ ] Kreator: dodanie, edycja, usunięcie, publikacja kursu działa end-to-end
- [ ] Każda operacja zostawia wpis w `course_changelog` (weryfikacja triggerów)
- [ ] 2 kursy utworzone i wyświetlone
- [ ] Design spójny z matthewplugins.pl

---

## 3. Plugin 2 — Płatności + dostawa (branch `plugin-2-platnosci`, później)
- Wybór operatora płatności → decyzja na starcie tego etapu; kod przez interfejs `PaymentProvider` (adapter).
- Przepływ: CTA „Kup" → checkout → webhook potwierdzenia → zapis zamówienia → **e-mail do klienta**: potwierdzenie zakupu, dostęp do całego kursu (linki/załącznik ebooka), dane zamówienia, dane do faktury/paragonu.
- **Baza nr 2 — `db2_klienci`**: `customers` (dane kupujących), `orders` (kurs, kwota, status, operator, id transakcji), `payments` (zdarzenia webhooków), `deliveries` (co, kiedy i na jaki adres wysłano + status wysyłki), `download_tokens` (bezpieczne linki do materiałów).

## 4. Plugin 3 — Panel admina (branch `plugin-3-admin-panel`, później)
- `/szkolenia/admin` — dostęp **wyłącznie admin** (logowanie, sesje, hasło hashowane argon2).
- Widoki: sprzedaż/zamówienia, kursy i ich statusy, ruch na podstronie, logi.
- **Baza nr 3 — `db3_monitoring`**:
  - `admin_users`, `admin_login_log` — **kto i kiedy logował się na konto admina**: data, czas, IP, user-agent, sukces/porażka;
  - `page_visits` — **„timer"**: wejście na stronę → zapis do bazy (ścieżka, timestamp wejścia, czas spędzony, sesja anonimowa) przez lekki endpoint `POST /api/szkolenia/track` (sendBeacon przy wyjściu ze strony).

---

## 5. Workflow (ustalony z właścicielem)
1. Praca nad każdym pluginem na **dedykowanym branchu**: `plugin-1-sklep-kursow` → `plugin-2-platnosci` → `plugin-3-admin-panel`; po ukończeniu i akceptacji merge do `main`.
2. Pluginy robimy **po kolei** — teraz wyłącznie Plugin 1.
3. Testy lokalne mogą używać sklonowanej strony matthewplugins.pl; **tamtego repo nie modyfikujemy**.
4. Finał: właściciel ocenia całość → dopiero wtedy wgranie do repo `matthewplugins.pl`.
5. Commity przy każdym większym kroku, po polsku, opisowe.

## 6. Stack — podsumowanie
Next.js 16 · React 19 · TypeScript · Tailwind 4 · PostgreSQL ×3 (Docker lokalnie) · Zod · node-pg (bez ciężkiego ORM — migracje czystym SQL, jak lubi audyt) · fonty Geist i komponenty wzorowane na matthewplugins.pl
