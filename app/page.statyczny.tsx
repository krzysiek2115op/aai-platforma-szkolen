import Link from "next/link";
import { zasob } from "@/lib/podglad";

/**
 * Korzeń — wariant PODGLĄDU STATYCZNEGO.
 *
 * `redirect()` wymaga serwera (patrz ./page.serwer.tsx), więc podgląd
 * przekierowuje tak, jak umieją to same pliki: nagłówkiem `refresh`,
 * który React 19 wynosi do `<head>`. Zwykły odnośnik pod spodem jest
 * tu naprawdę potrzebny, a nie na ozdobę — przy zablokowanym
 * odświeżaniu (część czytników i ustawień prywatności) to jedyne
 * wyjście z tej strony.
 */
export default function KorzenPodgladu() {
  const katalog = zasob("/szkolenia");
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${katalog}`} />
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold">Podgląd katalogu szkoleń</h1>
        <p className="mt-4 opacity-70">
          Przechodzimy do katalogu. Jeśli nic się nie dzieje:
        </p>
        <Link href="/szkolenia" className="mt-6 inline-block underline">
          Otwórz katalog szkoleń
        </Link>
      </div>
    </>
  );
}
