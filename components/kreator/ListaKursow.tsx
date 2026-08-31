"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Layers,
  Loader2,
  PlayCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Cascade, CascadeItem } from "@/components/ui/Reveal";
import { komunikat, wystrzel } from "@/components/kreator/wystrzal";

/**
 * Lista kursów w kreatorze. Dane przychodzą kanałem JSON (render
 * serwerowy strony), a każda zmiana idzie wystrzałem AJAX i kończy się
 * `router.refresh()` — to serwer, nie przeglądarka, mówi jaki jest
 * stan po akcji. Nic tu nie trzyma własnej kopii prawdy.
 */

export type PozycjaListy = {
  id: string;
  slug: string;
  title: string;
  type: "kurs";
  status: "draft" | "published" | "archived";
  cena: string;
  badge: string | null;
  poziom: string | null;
  sekcje: number;
  moduly: number;
  lekcje: number;
  /** ile lekcji ma napisaną treść — postęp największej roboty kroku 3 */
  lekcjeZTrescia: number;
  zmieniono: string;
};

const STATUS: Record<
  PozycjaListy["status"],
  { tekst: string; kropka: string; kolor: string }
> = {
  draft: { tekst: "Szkic", kropka: "bg-steel", kolor: "text-steel" },
  published: { tekst: "Opublikowany", kropka: "bg-volt", kolor: "text-volt" },
  archived: { tekst: "Ukryty", kropka: "bg-amber-400", kolor: "text-amber-400" },
};

export default function ListaKursow({ kursy }: { kursy: PozycjaListy[] }) {
  const router = useRouter();
  const [pracuje, setPracuje] = useState<string | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [doUsuniecia, setDoUsuniecia] = useState<string | null>(null);
  const [odswiezanie, startOdswiezania] = useTransition();

  async function wykonaj(
    id: string,
    akcja: Parameters<typeof wystrzel>[0]
  ): Promise<void> {
    setPracuje(id);
    setBlad(null);
    const wynik = await wystrzel(akcja);
    setPracuje(null);
    setDoUsuniecia(null);
    if (!wynik.ok) {
      setBlad(komunikat(wynik));
      return;
    }
    startOdswiezania(() => router.refresh());
  }

  if (kursy.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-line bg-panel/30 px-6 py-16 text-center">
        <Layers aria-hidden className="mx-auto size-6 text-steel" />
        <p className="mt-4 text-base text-fg">Nie ma jeszcze żadnego kursu.</p>
        <p className="mt-1 text-sm text-steel">
          Zacznij od „Nowy kurs” — treść wprowadzisz sekcja po sekcji.
        </p>
      </div>
    );
  }

  return (
    <>
      {blad ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {blad}
        </p>
      ) : null}

      <Cascade as="ul" className="mt-8 grid gap-4">
        {kursy.map((kurs) => {
          const status = STATUS[kurs.status];
          const zajety = pracuje === kurs.id || odswiezanie;
          return (
            <CascadeItem as="li" key={kurs.id}>
              <article className="unos rounded-xl border border-line bg-panel/50 p-5 transition-colors hover:border-fg/15 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-mono text-label uppercase tracking-[0.2em]">
                      <span className={`inline-flex items-center gap-1.5 ${status.kolor}`}>
                        <span className={`status-dot size-1.5 rounded-full ${status.kropka}`} />
                        {status.tekst}
                      </span>
                      <span className="text-steel/40">/</span>
                      <span className="text-steel">{kurs.type}</span>
                      {kurs.badge ? (
                        <>
                          <span className="text-steel/40">/</span>
                          <span className="text-volt">{kurs.badge}</span>
                        </>
                      ) : null}
                      {kurs.poziom ? (
                        <>
                          <span className="text-steel/40">/</span>
                          <span className="text-steel">{kurs.poziom}</span>
                        </>
                      ) : null}
                    </p>
                    <h2 className="mt-2 truncate text-xl font-semibold tracking-tight">
                      {kurs.title}
                    </h2>
                    <p className="mt-1 truncate font-mono text-xs text-steel">
                      /szkolenia/{kurs.slug}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-volt">{kurs.cena}</p>
                </div>

                <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-label uppercase tracking-[0.2em] text-steel">
                  <div className="flex gap-2">
                    <dt>Sekcje</dt>
                    <dd className={kurs.sekcje === 0 ? "text-amber-400" : "text-fg"}>
                      {kurs.sekcje}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>Moduły</dt>
                    <dd className={kurs.moduly === 0 ? "text-amber-400" : "text-fg"}>
                      {kurs.moduly}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>Lekcje</dt>
                    <dd className={kurs.lekcje === 0 ? "text-amber-400" : "text-fg"}>
                      {kurs.lekcje}
                    </dd>
                  </div>
                  {/* Postęp materiału widać BEZ wchodzenia w kurs —
                      liczy go baza (indeks częściowy z migracji 006),
                      nie panel. */}
                  <div className="flex gap-2">
                    <dt>Treść lekcji</dt>
                    <dd
                      className={
                        kurs.lekcjeZTrescia === 0
                          ? "text-amber-400"
                          : kurs.lekcjeZTrescia === kurs.lekcje
                            ? "text-volt"
                            : "text-fg"
                      }
                    >
                      {kurs.lekcjeZTrescia}/{kurs.lekcje}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>Zmiana</dt>
                    <dd className="text-fg">{kurs.zmieniono}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/szkolenia/kreator/${kurs.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-volt px-4 text-sm font-medium text-void transition-colors hover:bg-[#d3ff70]"
                  >
                    <Pencil aria-hidden className="size-3.5" />
                    Edytuj
                  </Link>

                  {/* podgląd działa też dla szkicu — właściciel ogląda
                      stronę przed publikacją (dla gościa ten adres to 404) */}
                  <Link
                    href={`/szkolenia/${kurs.slug}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-fg/20 hover:text-fg"
                  >
                    <PlayCircle aria-hidden className="size-3.5" />
                    {kurs.status === "published" ? "Zobacz stronę" : "Podgląd"}
                  </Link>

                  {kurs.status === "published" ? (
                    <>
                      <button
                        type="button"
                        disabled={zajety}
                        onClick={() =>
                          wykonaj(kurs.id, {
                            akcja: "publikuj",
                            id: kurs.id,
                            status: "archived",
                          })
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-fg/20 hover:text-fg disabled:opacity-50"
                      >
                        <EyeOff aria-hidden className="size-3.5" />
                        Ukryj
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={zajety}
                      onClick={() =>
                        wykonaj(kurs.id, { akcja: "publikuj", id: kurs.id })
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-volt/30 bg-volt/10 px-4 text-sm text-volt transition-colors hover:bg-volt/20 disabled:opacity-50"
                    >
                      <Eye aria-hidden className="size-3.5" />
                      Opublikuj
                    </button>
                  )}

                  {doUsuniecia === kurs.id ? (
                    <span className="ml-auto inline-flex items-center gap-2 text-sm">
                      <span className="text-steel">Usunąć bezpowrotnie?</span>
                      <button
                        type="button"
                        disabled={zajety}
                        onClick={() => wykonaj(kurs.id, { akcja: "usun", id: kurs.id })}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-500/90 px-4 text-sm font-medium text-void transition-colors hover:bg-red-400 disabled:opacity-50"
                      >
                        {zajety ? (
                          <Loader2 aria-hidden className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 aria-hidden className="size-3.5" />
                        )}
                        Tak, usuń
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoUsuniecia(null)}
                        className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm text-steel hover:text-fg"
                      >
                        Anuluj
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={zajety}
                      onClick={() => setDoUsuniecia(kurs.id)}
                      className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-steel transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                      Usuń
                    </button>
                  )}
                </div>
              </article>
            </CascadeItem>
          );
        })}
      </Cascade>
    </>
  );
}
