<?php
/**
 * Żywe tło strony kursu: poświata za kursorem i dwa dryfujące bloby.
 *
 * Port `components/kurs/TloKursu.tsx`.
 *
 * MUSI STAĆ POZA `<main>`. Element jest `position: fixed`, a motyw ma
 * w swoim HTML klasę `.page-enter`, której klatki animują `transform`
 * z wypełnieniem `both` — przodek z transformacją odbiera potomkom `fixed`
 * ekran jako układ odniesienia. To dokładnie BLAD-003 i BLAD-004 z prototypu,
 * tym razem przyniesiony przez cudzy arkusz. Pilnuje tego `straznik-frontu-wp`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;
?>
<div aria-hidden="true" class="aai-tlo">
	<div class="aai-tlo-kursor"></div>
	<div class="aai-tlo-blob aai-tlo-blob-a"></div>
	<div class="aai-tlo-blob aai-tlo-blob-b"></div>
</div>
