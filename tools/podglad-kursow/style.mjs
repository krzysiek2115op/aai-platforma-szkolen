/**
 * Arkusz widoku kursu — wczytywany z `styl.css`, nie sklejany w JavaScripcie.
 *
 * Powód rozdziału stoi w nagłówku samego arkusza: CSS trzymany w literale
 * szablonowym wysypywał generator za każdym razem, gdy w komentarzu pojawił
 * się odwrócony apostrof (a komentarze w tym repo cytują nazwy własności).
 * Plik `.css` nie ma znaków o specjalnym znaczeniu, koloruje się w edytorze
 * i przenosi się do szablonów Tutora przez zwykłe skopiowanie.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * `fileURLToPath`, nie `.pathname` — katalog projektu ma w nazwie spacje,
 * a adres URL koduje je jako %20 i ścieżka przestaje istnieć (BLAD-014,
 * pilnuje tego straznik-sciezek).
 */
const KATALOG = dirname(fileURLToPath(import.meta.url));

export function styl() {
  return readFileSync(join(KATALOG, "styl.css"), "utf8");
}
