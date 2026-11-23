# Terraria Research Tracker (GUI)

[English](README.md) · **Čeština**

Desktopová aplikace, která ukazuje, kolik předmětů má tvoje postava v režimu Journey vyzkoumáno a co ještě chybí. Funguje s Terrarií ze Steamu na Linuxu (nativní verze) i na Windows.

Hotové sestavení stáhneš na stránce [Releases](../../releases): pro Linux `…-linux-amd64.tar.gz`, pro Windows `…-windows-amd64.zip`. Stačí rozbalit a spustit, Terrarii aplikace najde sama. Aplikace je anglicky; češtinu přepneš vlevo dole.

Vychází z [Terraria Research Tracker (CLI)](https://github.com/YAL-Game-Tools/Terraria-Research-Tracker-CLI) od YellowAfterlife (licence MIT).

## Jak to funguje

Data o předmětech (názvy, kategorie, kolik kusů je potřeba na výzkum) nejsou nikde uložená jako soubor. Vzniknou až tehdy, když běží kód samotné Terrarie. Proto má projekt dvě části:

- **`helper/` – pomocník v C#.** Načte `TerrariaServer.exe` ze složky hry a pustí ho s rozbitým světem, takže server jen načte data o předmětech a skončí. Všechno, co server vypisuje, zahodí. Potom čte příkazy ze stdin a odpovídá jedním řádkem JSON:
  - `list` – všechny postavy (lokální i ze Steam Cloudu),
  - `load <cesta k .plr>` – výzkum postavy po předmětech,
  - `quit`.
- **`app/` – aplikace v Go a Wails.** Najde Terrarii ve Steamu, nakopíruje do její složky pomocníka, spustí ho a zobrazí výsledky. Soubor postavy sleduje a po uložení ve hře výsledky sama obnoví.

Na Linuxu se pomocník spouští přes Mono, které je přibalené k Terrarii. Aplikace vytvoří ve složce hry kopii `TerrariaServer.bin.x86_64` pod jménem `TerrariaResearchHelper.bin.x86_64`. Spouštěč MonoKickstart vždycky načte `.exe` se stejným jménem jako on sám, takže pustí pomocníka. Na Windows je pomocník obyčejný program pro .NET Framework a spouští se přímo (jako 32bitový, protože taková je i Terraria).

### Soubory ve složce Terrarie

Aplikace je tam zapíše sama při každém spuštění (a přepíše jen ty, které se změnily):

| Soubor | Co to je |
|---|---|
| `TerrariaResearchHelper.exe` | pomocník |
| `TerrariaResearchHelper.bin.x86_64` | kopie spouštěče serveru (jen Linux) |
| `TerrariaResearchHelper.wld` | záměrně rozbitý svět |
| `TerrariaResearchHelper.cfg` | vynechané předměty a aliasy; zapíše se jen poprvé, pak ho můžeš upravovat (tlačítko „Edit omitted items“ / „Upravit vynechané předměty“) |

## Sestavení

Na Linuxu potřebuješ `dotnet-sdk`, `go`, `wails`, `npm` a `webkit2gtk-4.1`. Samotnou Terrarii k sestavení nepotřebuješ: pomocník na kód hry sahá jen přes reflexi až za běhu, takže se dá přeložit kdekoli.

```sh
make            # pomocník + aplikace → app/build/bin/terraria-research-tracker
make dev        # vývojový režim s živým načítáním frontendu
```

Verzi pro Windows sestavuje GitHub Actions (viz níže). Lokálně na Windows stačí zopakovat kroky z workflow: `dotnet build` pomocníka, zkopírovat výstup do `app/helperbin/` a v `app/` spustit `wails build`.

## Releases

GitHub Actions (`.github/workflows/build.yml`) sestaví aplikaci pro Linux i Windows při každém pushi do `main` a u každého pull requestu. Výsledky najdeš jako artefakty u běhu workflow.

Nový release vytvoříš tagem:

```sh
git tag v1.0.0
git push origin v1.0.0
```

Workflow pak vytvoří GitHub release s archivy `terraria-research-tracker-1.0.0-linux-amd64.tar.gz` a `terraria-research-tracker-1.0.0-windows-amd64.zip`.

## Struktura

```
helper/      pomocník v C# (net48; na Linuxu běží v Mono z Terrarie)
app/         aplikace v Go + Wails, frontend v app/frontend (čisté JS, Vite;
             překlady v app/frontend/src/i18n.js);
             platform_unix.go / platform_windows.go řeší rozdíly mezi systémy
original/
  windows-release/   původní stažená verze pro Windows (exe, cfg, wld)
  upstream-source/   původní zdroják z GitHubu, beze změn
```
