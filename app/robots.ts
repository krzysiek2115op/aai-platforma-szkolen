import type { MetadataRoute } from "next";
import { INDEKSOWANIE, adres } from "@/lib/seo";

/**
 * robots.txt — generowany, nie pisany ręcznie, żeby nie mógł rozjechać
 * się z metatagiem `robots` w układzie strony. Dwa źródła prawdy o tym,
 * czy wolno indeksować, to gwarancja, że kiedyś powiedzą co innego.
 *
 * Przy wyłączonym indeksowaniu (stan domyślny — treść jest jeszcze
 * robocza) blokujemy wszystko i NIE podajemy sitemapy: wskazywanie
 * robotowi mapy strony, na którą nie ma wstępu, to sygnał sprzeczny.
 */
/**
 * `output: "export"` wymaga tego jawnie — bez niego build pada na
 * „export const dynamic … not configured on route". Ta sama wartość
 * pasuje do trybu serwerowego: robots.txt nie zależy od żądania, więc
 * nie ma czego liczyć per wywołanie.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!INDEKSOWANIE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Panel właściciela i kanał AJAX nie są treścią dla czytelnika.
        // W eksporcie statycznym i tak ich nie ma, ale robots.txt opisuje
        // TĘ SAMĄ aplikację także wtedy, gdy stoi na serwerze.
        disallow: ["/szkolenia/kreator", "/api/"],
      },
    ],
    sitemap: adres("/sitemap.xml"),
  };
}
