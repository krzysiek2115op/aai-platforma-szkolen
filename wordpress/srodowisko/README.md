# Środowisko etapu WordPress

Jedna komenda: `./postaw.sh`. Opis, pułapki i sposób pracy:
[../README.md](../README.md).

Pliki:

| Plik | Co robi |
|---|---|
| `compose.yml` | WP + MariaDB + wp-cli; montuje motyw (spoza repo) i NASZE wtyczki (z repo) |
| `postaw.sh` | stawia, konfiguruje, importuje treść i **weryfikuje artefakt** — nie kończy na „polecenia poszły" |
| `.env` | hasła instancji roboczej; generuje się sam, nie wchodzi do repo |

Port `8892` bindujemy wyłącznie na pętlę zwrotną: to instancja z panelem
admina i hasłami w pliku — bez tego widziałby ją każdy w tej samej sieci.
