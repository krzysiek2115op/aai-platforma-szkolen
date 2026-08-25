<?php
/**
 * Import kursów Automatic AI do WordPressa (Tutor LMS) z eksport-wp/kursy.json.
 *
 * Uruchomienie (WP-CLI, wewnątrz instalacji WordPressa):
 *   wp eval-file import-kursy.php /sciezka/do/kursy.json
 *
 * KTÓRA TO DROGA. Eksport z prototypu ma DWÓCH odbiorców:
 *
 *   1. `wp aai-sklep import` → tabele `wp_aai_sklep_*`. To jest ŹRÓDŁO
 *      PRAWDY o kursie (decyzja właściciela 2026-08-25).
 *   2. ten plik → wpisy Tutor LMS. To KOPIA dla LMS-a, który dostarcza
 *      materiał za logowaniem.
 *
 * Docelowo kopię do Tutora będzie robiła nasza wtyczka przy publikacji
 * (krok W5) i wtedy mapy niżej przeniosą się do jej klasy. Do tego czasu
 * mieszkają tutaj — czyli w kodzie, który ich używa. W eksporcie ich nie
 * ma świadomie: zrzut naszej bazy nie ma powodu znać słownika cudzej
 * wtyczki, a każde mapowanie po drodze to miejsce, w którym dana może
 * wyjechać pod inną nazwą.
 *
 * IDEMPOTENTNY. Dopasowanie po `_aai_zrodlo_uuid` — identyfikatorze
 * z Postgresa prototypu, zapisanym w meta każdego posta. Dlaczego nie po
 * slugu, jak przy imporcie bloga strony głównej: slug kursu wolno zmienić
 * w kreatorze, a moduły i lekcje slugów w ogóle nie mają. UUID jest
 * jedynym kluczem, który przeżywa zmianę tytułu i nie zależy od
 * kolejności — bez niego powtórny import duplikowałby 73 lekcje zamiast
 * je aktualizować.
 *
 * CO ROBI, CZEGO NIE ROBI. Wykłada kursy → moduły (`topics`) → lekcje jako posty
 * FUNKCJAMI WordPressa, więc WP sam nadaje ID i sam waliduje. NIE tworzy produktów
 * WooCommerce ani nie ustawia cen — cena wchodzi razem z decyzją o sprzedaży
 * (Plugin 2); tutaj ląduje wyłącznie jako `_aai_cena_grosze`, żeby dana nie
 * przepadła. NIE wgrywa okładek (to zasoby, wchodzą przez bibliotekę mediów).
 * Sekcje sprzedażowe spoza Tutora zapisuje w `_aai_sekcje` — czyta je NASZA
 * wtyczka, bo to część sklepu, której gotowy LMS nie robi.
 *
 * BEZPIECZEŃSTWO TREŚCI. Treść lekcji to towar zza logowania. Skrypt ustawia
 * lekcjom ten sam status co kursowi, a dostępu pilnuje Tutor (kurs płatny =
 * lekcje tylko dla zapisanych). Import NIE publikuje szkiców: status przychodzi
 * z eksportu i szkic zostaje szkicem.
 */

if (!defined('WP_CLI') || !WP_CLI) {
    exit("Ten skrypt uruchamia się przez WP-CLI: wp eval-file import-kursy.php <plik.json>\n");
}

/** Wersja formatu eksportu, którą ten skrypt rozumie. */
const AAI_WERSJA_FORMATU = 2;

/**
 * Mapa naszych rodzajów sekcji na pola, które Tutor LMS rozumie natywnie.
 *
 * Tutor pokrywa CZTERY z naszych dwunastu sekcji własnymi kluczami meta
 * (sprawdzone w kodzie wtyczki 4.0.6, nie zgadnięte). Reszta — hero, faq,
 * gwarancja, opinie, autor, problem, pozycjonowanie, transformacja,
 * porównanie — nie ma tam odpowiednika i należy do NASZEJ wtyczki: to jest
 * dokładnie ta część sklepu, której gotowy LMS **nie robi**.
 *
 * Rodzaj spoza tej mapy trafia do `_aai_sekcje` — czyli nowa sekcja
 * w kreatorze nie wymaga tu żadnej zmiany.
 */
const AAI_SEKCJA_NA_TUTOR = [
    'benefits' => '_tutor_course_benefits',
    'for_whom' => '_tutor_course_target_audience',
    'package'  => '_tutor_course_material_includes',
    'problem'  => '_tutor_course_requirements',
];

/** Status kursu → status posta WP. Szkic nie może stać się publiczny przez pomyłkę. */
const AAI_STATUS_NA_WP = ['draft' => 'draft', 'published' => 'publish', 'archived' => 'private'];

/**
 * Poziom kursu → wartość `_tutor_course_level`.
 * Tutor przyjmuje beginner/intermediate/expert/all_levels; nasze nazwy są polskie.
 */
const AAI_POZIOM_NA_TUTOR = [
    'podstawowy'         => 'beginner',
    'sredniozaawansowany' => 'intermediate',
    'zaawansowany'       => 'expert',
];

$args = WP_CLI::get_runner()->arguments ?? [];
$plik = '';
foreach ($args as $kandydat) {
    if (is_string($kandydat) && substr($kandydat, -5) === '.json' && file_exists($kandydat)) {
        $plik = $kandydat;
        break;
    }
}
if ($plik === '') {
    WP_CLI::error("Podaj istniejący plik JSON: wp eval-file import-kursy.php <plik.json>\n"
        . "Wygeneruj go w prototypie: node --env-file=.env tools/eksport-wp.mjs --do eksport-wp");
}

$paczka = json_decode(file_get_contents($plik), true);
if (!is_array($paczka) || !isset($paczka['kursy'])) {
    WP_CLI::error("Plik $plik nie wygląda na eksport kursów (brak klucza `kursy`).");
}
if ((int) ($paczka['wersja_formatu'] ?? 0) !== AAI_WERSJA_FORMATU) {
    WP_CLI::error("Nieznana wersja formatu: {$paczka['wersja_formatu']}. Ten skrypt zna wersję "
        . AAI_WERSJA_FORMATU . ". Wygeneruj eksport na nowo: node --env-file=.env tools/eksport-wp.mjs");
}

/**
 * Znajduje post po UUID źródłowym. Zwraca ID albo 0.
 * `post_status => any` obejmuje też szkice — inaczej powtórny import
 * zduplikowałby kurs, który leży jako szkic.
 */
function aai_znajdz_po_uuid(string $uuid, string $typ): int {
    $q = get_posts([
        'post_type'   => $typ,
        'post_status' => 'any',
        'numberposts' => 1,
        'fields'      => 'ids',
        'meta_key'    => '_aai_zrodlo_uuid',
        'meta_value'  => $uuid,
    ]);
    return $q ? (int) $q[0] : 0;
}

/** Wkłada albo aktualizuje post; zwraca [ID, 'utworzony'|'zaktualizowany'|'bez zmian']. */
function aai_zapisz(array $dane, string $uuid, array $meta = []): array {
    $istniejacy = aai_znajdz_po_uuid($uuid, $dane['post_type']);

    if ($istniejacy) {
        $post = get_post($istniejacy);
        $bez_zmian = $post->post_title === $dane['post_title']
            && $post->post_content === ($dane['post_content'] ?? '')
            && $post->post_status === $dane['post_status']
            && (int) $post->menu_order === (int) ($dane['menu_order'] ?? 0)
            && (int) $post->post_parent === (int) ($dane['post_parent'] ?? 0);
        foreach ($meta as $k => $v) {
            if (get_post_meta($istniejacy, $k, true) !== $v) { $bez_zmian = false; break; }
        }
        // Zajawka i slug też są treścią — bez nich zmiana w kreatorze nie dojechałaby
        // do WordPressa, a import milczałby „bez zmian".
        if ($bez_zmian && isset($dane['post_excerpt']) && $post->post_excerpt !== $dane['post_excerpt']) $bez_zmian = false;
        if ($bez_zmian && isset($dane['post_name']) && $post->post_name !== $dane['post_name']) $bez_zmian = false;
        if ($bez_zmian) return [$istniejacy, 'bez zmian'];

        $dane['ID'] = $istniejacy;
        $id = wp_update_post(wp_slash($dane), true);
        $stan = 'zaktualizowany';
    } else {
        $id = wp_insert_post(wp_slash($dane), true);
        $stan = 'utworzony';
    }

    if (is_wp_error($id)) {
        WP_CLI::error("{$dane['post_title']}: " . $id->get_error_message());
    }

    // wp_slash jest OBOWIĄZKOWE, nie ozdobne: update_post_meta() puszcza wartość
    // przez wp_unslash(), więc bez tego znika KAŻDY backslash — w kursie o Gicie
    // to ścieżki `C:\\Users`, sekwencje `\\n` w przykładach i escapowane znaki
    // w JSON-ie. Złapane testem idempotencji: drugi import raportował kursy jako
    // „zaktualizowane", bo zapisane `https://` nie równało się wysłanemu `https:\\/\\/`.
    //
    // UWAGA: pułapka jest cechą API POSTÓW I META, nie WordPressa w ogóle.
    // `$wpdb->insert()`/`update()` NIE puszczają wartości przez `wp_unslash`,
    // więc warstwa zapisu naszej wtyczki `wp_slash` NIE potrzebuje (sprawdzone
    // pomiarem: 38 backslashy w 9 lekcjach przeszło tam bez zmiany).
    update_post_meta($id, '_aai_zrodlo_uuid', $uuid);
    foreach ($meta as $k => $v) update_post_meta($id, $k, wp_slash($v));
    return [(int) $id, $stan];
}

/** Wartość meta: struktury zapisujemy JSON-em, teksty tekstem. */
function aai_meta($wartosc) {
    return is_string($wartosc)
        ? $wartosc
        : wp_json_encode($wartosc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

$licznik = ['utworzony' => 0, 'zaktualizowany' => 0, 'bez zmian' => 0];
$policz = function (string $stan) use (&$licznik) { $licznik[$stan]++; };

foreach ($paczka['kursy'] as $k) {
    $status_wp = AAI_STATUS_NA_WP[$k['status']] ?? 'draft';

    if (!empty($k['level']) && !isset(AAI_POZIOM_NA_TUTOR[$k['level']])) {
        WP_CLI::warning("kurs {$k['slug']}: poziom „{$k['level']}” nie ma odpowiednika w Tutorze");
    }

    // ── podział sekcji: cztery zna Tutor, resztę renderuje nasza wtyczka ──
    $sekcje_tutor = [];
    $sekcje_nasze = [];
    foreach ($k['sekcje'] as $s) {
        $klucz = AAI_SEKCJA_NA_TUTOR[$s['kind']] ?? null;
        if ($klucz !== null) {
            // Tutor trzyma listy (korzyści, dla kogo, pakiet) jako tekst
            // z nowymi liniami, a u nas to struktury. Serializujemy je jako
            // JSON — wtyczka i tak renderuje te sekcje sama, a spłaszczenie
            // do tekstu byłoby bezpowrotną utratą struktury.
            $sekcje_tutor[$klucz] = aai_meta($s['content']);
        } else {
            $sekcje_nasze[] = ['rodzaj' => $s['kind'], 'tresc' => $s['content']];
        }
    }

    // ── kurs ──────────────────────────────────────────────────────────────
    $meta_kursu = array_merge($sekcje_tutor, [
        '_tutor_course_level' => empty($k['level']) ? '' : (AAI_POZIOM_NA_TUTOR[$k['level']] ?? ''),
        '_aai_cena_grosze'    => (string) $k['price_grosze'],
        '_aai_badge'          => (string) ($k['badge'] ?? ''),
        '_aai_typ'            => (string) $k['type'],
        '_aai_okladka_url'    => (string) ($k['cover_url'] ?? ''),
        '_aai_sekcje'         => aai_meta($sekcje_nasze),
    ]);

    [$kurs_id, $stan] = aai_zapisz([
        'post_type'    => 'courses',
        'post_status'  => $status_wp,
        'post_name'    => $k['slug'],
        'post_title'   => $k['title'],
        'post_content' => '',
        'post_excerpt' => (string) ($k['short_desc'] ?? ''),
        'menu_order'   => 0,
    ], $k['id'], $meta_kursu);
    $policz($stan);
    WP_CLI::log("kurs: {$k['slug']} → #$kurs_id ($stan)");

    foreach ($k['moduly'] as $m) {
        // ── moduł (Tutor: post_type `topics`, rodzic = kurs) ───────────────
        [$modul_id, $stan] = aai_zapisz([
            'post_type'    => 'topics',
            'post_status'  => $status_wp,
            'post_parent'  => $kurs_id,
            'post_title'   => $m['title'],
            'post_content' => (string) ($m['summary'] ?? ''),
            'menu_order'   => $m['position'],
        ], $m['id']);
        $policz($stan);

        foreach ($m['lekcje'] as $l) {
            // ── lekcja (Tutor: post_type `lesson`, rodzic = moduł) ─────────
            [, $stan] = aai_zapisz([
                'post_type'    => 'lesson',
                'post_status'  => $status_wp,
                'post_parent'  => $modul_id,
                'post_title'   => $l['title'],
                'post_content' => (string) ($l['content'] ?? ''),
                'menu_order'   => $l['position'],
            ], $l['id'], [
                // Tutor zapisuje czas trwania jako tablicę godzin/minut.
                '_course_duration'  => ['hours' => intdiv((int) $l['duration_min'], 60),
                                        'minutes' => ((int) $l['duration_min']) % 60,
                                        'seconds' => 0],
                '_aai_zapowiedz'    => !empty($l['preview']) ? '1' : '0',
                '_aai_materialy'    => aai_meta($l['materials'] ?? []),
            ]);
            $policz($stan);
        }
    }
}

WP_CLI::success(sprintf(
    'Import zakończony: %d utworzonych, %d zaktualizowanych, %d bez zmian.',
    $licznik['utworzony'], $licznik['zaktualizowany'], $licznik['bez zmian']
));
