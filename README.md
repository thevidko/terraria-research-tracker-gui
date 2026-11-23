# Terraria Research Tracker (Linux GUI)

Desktopová aplikace, která ukazuje, kolik předmětů má tvoje postava v režimu Journey vyzkoumáno a co ještě chybí. Funguje s nativní linuxovou Terrarií ze Steamu.

Vychází z [Terraria Research Tracker (CLI)](https://github.com/YAL-Game-Tools/Terraria-Research-Tracker-CLI) od YellowAfterlife (licence MIT).

## Jak to funguje

Data o předmětech (názvy, kategorie, kolik kusů je potřeba na výzkum) nejsou nikde uložená jako soubor. Vzniknou až tehdy, když běží kód samotné Terrarie. Proto má projekt dvě části:

- **`helper/` – pomocník v C#.** Načte `TerrariaServer.exe` ze složky hry a pustí ho s rozbitým světem, takže server jen načte data o předmětech a skončí. Všechno, co server vypisuje, zahodí. Potom čte příkazy ze stdin a odpovídá jedním řádkem JSON:
  - `list` – všechny postavy (lokální i ze Steam Cloudu),
  - `load <cesta k .plr>` – výzkum postavy po předmětech,
  - `quit`.
- **`app/` – aplikace v Go a Wails.** Najde Terrarii ve Steamu, nakopíruje do její složky pomocníka, spustí ho a zobrazí výsledky. Soubor postavy sleduje a po uložení ve hře výsledky sama obnoví.

Pomocník se spouští přes Mono, které je přibalené k Terrarii. Aplikace vytvoří ve složce hry kopii `TerrariaServer.bin.x86_64` pod jménem `TerrariaResearchHelper.bin.x86_64`. Spouštěč MonoKickstart vždycky načte `.exe` se stejným jménem jako on sám, takže pustí pomocníka.

### Soubory ve složce Terrarie

Aplikace je tam zapíše sama při každém spuštění (a přepíše jen ty, které se změnily):

| Soubor | Co to je |
|---|---|
| `TerrariaResearchHelper.exe` | pomocník |
| `TerrariaResearchHelper.bin.x86_64` | kopie spouštěče serveru |
| `TerrariaResearchHelper.wld` | záměrně rozbitý svět |
| `TerrariaResearchHelper.cfg` | vynechané předměty a aliasy; zapíše se jen poprvé, pak ho můžeš upravovat (tlačítko „Upravit vynechané předměty“) |

## Sestavení

Potřebuješ `dotnet-sdk`, `go`, `wails`, `npm` a `webkit2gtk-4.1`. Samotnou Terrarii k sestavení nepotřebuješ: pomocník na kód hry sahá jen přes reflexi až za běhu, takže se dá přeložit kdekoli.

```sh
make            # pomocník + aplikace → app/build/bin/terraria-research-tracker
make dev        # vývojový režim s živým načítáním frontendu
```

## Releases

GitHub Actions (`.github/workflows/build.yml`) sestaví aplikaci při každém pushi do `main` a u každého pull requestu. Výsledek najdeš jako artefakt u běhu workflow.

Nový release vytvoříš tagem:

```sh
git tag v1.0.0
git push origin v1.0.0
```

Workflow pak vytvoří GitHub release s archivem `terraria-research-tracker-1.0.0-linux-amd64.tar.gz`.

## Struktura

```
helper/      pomocník v C# (net48, spouští se v Mono z Terrarie)
app/         aplikace v Go + Wails, frontend v app/frontend (čisté JS, Vite)
original/
  windows-release/   původní stažená verze pro Windows (exe, cfg, wld)
  upstream-source/   původní zdroják z GitHubu, beze změn
```
