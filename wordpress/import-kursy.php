<?php
/**
 * Import kursów Automatic AI do WordPressa (Tutor LMS) z eksport-wp/kursy.json.
 *
 * Uruchomienie (WP-CLI, wewnątrz instalacji WordPressa):
 *   wp eval-file import-kursy.php /sciezka/do/kursy.json
 *
 * IDEMPOTENTNY. Dopasowanie po `_aai_zrodlo_uuid` — identyfikatorze z Postgresa
 * prototypu, zapisanym w meta każdego posta. Dlaczego nie po slugu, jak przy
 * imporcie bloga strony głównej: slug kursu wolno zmienić w kreatorze, a moduły
 * i lekcje slugów w ogóle nie mają. UUID jest jedynym kluczem, który przeżywa
 * zmianę tytułu i nie zależy od kolejności — bez niego powtórny import
 * duplikowałby 73 lekcje zamiast je aktualizować.
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
 * lekcje tylko dla zapisanych). Import NIE publikuje szkiców: `status_wp`
 * przychodzi z eksportu i szkic zostaje szkicem.
 */

if (!defined('WP_CLI') || !WP_CLI) {
    exit("Ten skrypt uruchamia się przez WP-CLI: wp eval-file import-kursy.php <plik.json>\n");
}

$args = WP_CLI::get_runner()->arguments ?? [];
if (isset($args_assoc)) { /* zgodność z wariantami WP-CLI podającymi argumenty inaczej */ }
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
if (($paczka['wersja_formatu'] ?? 0) !== 1) {
    WP_CLI::error("Nieznana wersja formatu: {$paczka['wersja_formatu']}. Ten skrypt zna wersję 1.");
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
    update_post_meta($id, '_aai_zrodlo_uuid', $uuid);
    foreach ($meta as $k => $v) update_post_meta($id, $k, wp_slash($v));
    return [(int) $id, $stan];
}

$licznik = ['utworzony' => 0, 'zaktualizowany' => 0, 'bez zmian' => 0];
$policz = function (string $stan) use (&$licznik) { $licznik[$stan]++; };

foreach ($paczka['kursy'] as $k) {
    // ── kurs ──────────────────────────────────────────────────────────────
    $meta_kursu = array_merge($k['sekcje_tutor'], [
        '_tutor_course_level' => $k['poziom_tutor'],
        '_aai_cena_grosze'    => (string) $k['cena_grosze'],
        '_aai_badge'          => $k['badge'],
        '_aai_typ'            => $k['typ'],
        '_aai_okladka_url'    => $k['okladka_url'],
        '_aai_sekcje'         => wp_json_encode($k['sekcje_nasze'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    // Tutor trzyma listy (korzyści, dla kogo, pakiet) jako tekst z nowymi liniami,
    // a u nas to struktury. Serializujemy je jako JSON — wtyczka i tak renderuje
    // te sekcje sama, a surowa struktura nie może zginąć po drodze.
    foreach ($k['sekcje_tutor'] as $klucz => $wartosc) {
        $meta_kursu[$klucz] = is_string($wartosc)
            ? $wartosc
            : wp_json_encode($wartosc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    [$kurs_id, $stan] = aai_zapisz([
        'post_type'    => 'courses',
        'post_status'  => $k['status_wp'],
        'post_name'    => $k['slug'],
        'post_title'   => $k['tytul'],
        'post_content' => '',
        'post_excerpt' => $k['zajawka'],
        'menu_order'   => 0,
    ], $k['zrodlo_uuid'], $meta_kursu);
    $policz($stan);
    WP_CLI::log("kurs: {$k['slug']} → #$kurs_id ($stan)");

    foreach ($k['moduly'] as $m) {
        // ── moduł (Tutor: post_type `topics`, rodzic = kurs) ───────────────
        [$modul_id, $stan] = aai_zapisz([
            'post_type'    => 'topics',
            'post_status'  => $k['status_wp'],
            'post_parent'  => $kurs_id,
            'post_title'   => $m['tytul'],
            'post_content' => $m['opis'],
            'menu_order'   => $m['pozycja'],
        ], $m['zrodlo_uuid']);
        $policz($stan);

        foreach ($m['lekcje'] as $l) {
            // ── lekcja (Tutor: post_type `lesson`, rodzic = moduł) ─────────
            [, $stan] = aai_zapisz([
                'post_type'    => 'lesson',
                'post_status'  => $k['status_wp'],
                'post_parent'  => $modul_id,
                'post_title'   => $l['tytul'],
                'post_content' => $l['tresc'],
                'menu_order'   => $l['pozycja'],
            ], $l['zrodlo_uuid'], [
                // Tutor zapisuje czas trwania jako tablicę godzin/minut.
                '_course_duration'  => ['hours' => intdiv((int) $l['czas_min'], 60),
                                        'minutes' => ((int) $l['czas_min']) % 60,
                                        'seconds' => 0],
                '_aai_zapowiedz'    => $l['zapowiedz'] ? '1' : '0',
                '_aai_materialy'    => wp_json_encode($l['materialy'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
            $policz($stan);
        }
    }
}

WP_CLI::success(sprintf(
    'Import zakończony: %d utworzonych, %d zaktualizowanych, %d bez zmian.',
    $licznik['utworzony'], $licznik['zaktualizowany'], $licznik['bez zmian']
));
