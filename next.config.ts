import type { NextConfig } from "next";

// W przeciwieństwie do strony głównej (output: "export") ta aplikacja
// działa Z SERWEREM — Plugin 1 potrzebuje backendu (kanał JSON + dyspozytor
// AJAX od Działu 3, baza od Działu 2). Dev i start na porcie 3001.
//
// NAGŁÓWKI BEZPIECZEŃSTWA (2026-08-19, wzorzec ze strony głównej
// przeniesiony jako IDEA, nie implementacja): strona główna musi
// wstrzykiwać CSP w HTML po buildzie, bo GitHub Pages nie pozwala
// ustawić żadnego nagłówka HTTP. My mamy serwer, więc nagłówki idą
// normalną drogą. Zestaw celowo MINIMALNY i bez CSP: pełna polityka
// CSP z nonce'ami to decyzja etapu WP (prototyp-specyfikacja by ją
// tylko udawał — WordPress i tak będzie miał własną). Stan i plan:
// docs/security-checklist.md.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Przeglądarka nie zgaduje typów plików (obrona przed
          // podrzuceniem HTML/JS pod niewinnym rozszerzeniem).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nikt nie wkłada tej strony w <iframe> — kreator działa na
          // ciastku HttpOnly, a clickjacking to dokładnie atak na
          // „kliknij w coś, co jest cudzą stroną pod spodem".
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Adres źródłowy nie wycieka do obcych domen przy nawigacji.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Funkcji sprzętowych ta strona nie używa — mówimy to wprost.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
