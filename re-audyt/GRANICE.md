# Tabela granic — sektor RE-AUDYT

**Etap E7.** Ten plik rozstrzyga, **do której roli re-audytu należy znalezisko**.
Role i checklisty: [`ROLE.md`](ROLE.md). Granice między OBSZARAMI (SEC ↔ BE, BE ↔ BD i tak
dalej) **obowiązują bez zmian z audytu** — [`../audyt/GRANICE.md`](../audyt/GRANICE.md) —
bo Pogłębiacze mają dokładnie te same zakresy co działy, które pogłębiają.

Nowe jest to, czego audyt nie ma: **granica między pogłębianiem obszaru a czterema rolami
własnymi re-audytu**.

---

## Dlaczego to nie jest kosmetyka

Ten sam powód co w audycie, tylko ostrzejszy. Re-audyt ma znaleźć wszystko, a zgodność fal
ma być tego SKUTKIEM (K4″); przy nieostrej granicy znalezisko trafi raz do `PSIARZ`, raz do
Pogłębiacza — i `porownaj-cykle.mjs` wypisze rozjazd (GRANICA) z powodu, który nie ma nic
wspólnego z kodem. Właściciel czytałby wtedy szum zamiast wyniku. Tabela granic jest
warunkiem czytelnego porównania, nie porządkiem na papierze.

**Gdy tabela milczy:** to jest znalezisko **`KON-R4`**. Kierownik re-audytu dopisuje wiersz
**przed drugą falą**, inaczej druga fala rozstrzygnie inaczej.

---

## Reguła rozstrzygająca

> **Rolę wyznacza PYTANIE, na które znalezisko odpowiada — nie plik, w którym leży,
> i nie narzędzie, którym je znaleziono.**

Trzy pytania pomocnicze, w tej kolejności:

1. **Czyja pozycja checklisty to wykryła?** Jeśli tylko jedna — koniec.
2. **Co jest przedmiotem znaleziska: PRODUKT czy BRAMKA?** Produkt → Pogłębiacz obszaru.
   Bramka (albo jej brak) → `PSIARZ` / `STRAZ`.
3. Jeśli nadal remis — rozstrzyga **kierownik re-audytu** wg tabeli niżej.

---

## Granice — pary stykowe

| Para | Należy do | Przykład rozstrzygający |
|---|---|---|
| **Pogłębiacz ↔ PSIARZ** | Pogłębiacz: **ile jest tej usterki**. PSIARZ: **czy cokolwiek ją łapie** | Ta sama klasa w siedmiu miejscach zamiast jednego → Pogłębiacz (`R2`). Zepsucie tego miejsca nie zapala żadnej bramki → PSIARZ (`R1`) |
| **Pogłębiacz ↔ SKUT** | Pogłębiacz: stan **przedmiotu** znaleziska. SKUT: co przy okazji **ucierpiało** | Zapytanie kosztuje 90 razy więcej, niż mówi audyt → Pogłębiacz PERF. Bramka mierząca to zostawiła śmieci w cudzych danych → SKUT (`R4`) |
| **PSIARZ ↔ STRAZ** | PSIARZ: **stan faktyczny** — szczeka czy milczy. STRAZ: **co ma powstać**, żeby zaszczekało | „Mutacja przeszła, cisza" → PSIARZ. „Reguła powinna pytać o wywołanie, nie o nazwę stałej" → STRAZ |
| **PSIARZ ↔ QA (Pogłębiacz)** | PSIARZ: mutacja jako **narzędzie do znaleziska**. Pogłębiacz QA: bramki jako **przedmiot badania** | Milczenie przy zepsutym miejscu z fali 1 → PSIARZ. Strażnik, który w ogóle nigdy nie przeszedł przez CI → Pogłębiacz QA |
| **STRAZ ↔ SKUT** | STRAZ: **zapobieganie nawrotowi**. SKUT: **skutek już zaistniały** | „Ta klasa nie ma strażnika" → STRAZ. „Golden przestał przechodzić po przebiegu" → SKUT |
| **WALID ↔ krytyk roli** | WALID ocenia **ZJAWISKO**. Krytyk ocenia **PRACĘ agenta** | „Zasięg policzony na 7, jest 3" → WALID. „Agent odhaczył pozycję bez otwarcia pliku" → krytyk (zgłasza pod kodem SWOJEJ roli) |
| **WALID ↔ Pogłębiacz** | Pogłębiacz **zgłasza**, WALID **rozstrzyga, czy zjawisko istnieje** | Pogłębiacz nie wydaje werdyktu o własnym zgłoszeniu; WALID nie dopisuje własnych znalezisk o produkcie |
| **KIER ↔ KON** | KIER: czy **przebieg** idzie zgodnie z §17. KON: czy **konstrukcja** re-audytu ma luki | „Pogłębiacz wszedł do działu, z którego audyt nie wyszedł" → KIER. „Do obszaru X nie wchodzi nikt" → KON |
| **KON ↔ Pogłębiacz** | KON łamie założenia **RE-AUDYTU**. Pogłębiacz łamie założenia **systemu** | „Re-audyt deklaruje uruchomienie, a dowód jest z lektury" → KON. „Co, jeśli baza nie odpowiada" → Pogłębiacz obszaru |
| **RAP ↔ KIER** | RAP: **opis wyniku**. KIER: **prowadzenie przebiegu** | „Liczba w raporcie nie pochodzi z narzędzia" → RAP. „Dział zamknięty na deklaracji" → KIER |

---

## Granica z sektorem AUDYT

| Sytuacja | Rozstrzygnięcie |
|---|---|
| Znalezisko **nowe**, którego audyt nie zgłosił | Zostaje w re-audycie, pod kodem obszaru — z dowodem uruchomieniowym (`R5`) |
| Znalezisko **to samo**, opisane innymi słowami | Łączy je HASZ MIEJSCA, nie opis (`polacz-sektory.mjs`). Wpis re-audytu musi wnosić **zasięg albo odtworzenie**, inaczej jest powtórzeniem (`KON-R5`) |
| Znalezisko o **audycie**, nie o produkcie | `KON` re-audytu — ale tylko o re-audycie. Luki sektora AUDYT są dla Konrada audytu |
| Zgłoszenie audytu **ODRZUCONE** przez weryfikatora | Wpis zostaje z werdyktem i nie znika. Re-audyt może zgłosić TO SAMO MIEJSCE, jeśli ma dowód uruchomieniowy, którego audyt nie miał — to jest pogłębienie, nie spór |

**Re-audyt nigdy nie pracuje na dziale, w którym pracuje audyt** (§17, K9'). Reguła jest
o czasie, nie o zakresie: dział jest wolny dopiero wtedy, gdy rola audytu ma status
`ZAKOŃCZONE` (`KIER-R1`).
