# Terraria Research Tracker (GUI)

**English** · [Čeština](README.cs.md)

A desktop app that shows how much of Journey Mode research your character has done and what's still missing. Works with Terraria from Steam on Linux (native version) and Windows.

Download a ready-made build from [Releases](../../releases): `…-linux-amd64.tar.gz` for Linux, `…-windows-amd64.zip` for Windows. Unpack it and run it; the app finds Terraria on its own. The interface is in English, with Czech available from the switch in the bottom left.

Based on [Terraria Research Tracker (CLI)](https://github.com/YAL-Game-Tools/Terraria-Research-Tracker-CLI) by YellowAfterlife (MIT license).

## How it works

Item data (names, categories, how many of each item research needs) isn't stored in any file. It only exists once Terraria's own code runs. That's why the project has two parts:

- **`helper/`: a C# helper.** It loads `TerrariaServer.exe` from the game folder and starts it with a deliberately broken world, so the server loads item data and then stops. Everything the server prints is discarded. After that the helper reads commands from stdin and answers each with one line of JSON:
  - `list`: all characters (local and Steam Cloud),
  - `load <path to .plr>`: the character's research, item by item,
  - `quit`.
- **`app/`: the Go + Wails app.** It finds Terraria in your Steam libraries, copies the helper into the game folder, runs it and shows the results. It watches the character file and refreshes on its own when the game saves.

On Linux the helper runs on the Mono runtime that ships with Terraria. The app creates a copy of `TerrariaServer.bin.x86_64` in the game folder named `TerrariaResearchHelper.bin.x86_64`. The MonoKickstart launcher always loads the `.exe` with its own name, so it runs the helper. On Windows the helper is an ordinary .NET Framework program and runs directly (as 32-bit, to match Terraria).

### Files in the Terraria folder

The app writes these on every start (only rewriting the ones that changed):

| File | What it is |
|---|---|
| `TerrariaResearchHelper.exe` | the helper |
| `TerrariaResearchHelper.bin.x86_64` | copy of the server launcher (Linux only) |
| `TerrariaResearchHelper.wld` | the deliberately broken world |
| `TerrariaResearchHelper.cfg` | omitted items and aliases; written only the first time, after that it's yours to edit ("Edit omitted items" button) |

## Building

On Linux you need `dotnet-sdk`, `go`, `wails`, `npm` and `webkit2gtk-4.1`. You don't need Terraria to build: the helper reaches the game's code only through reflection at run time, so it compiles anywhere.

```sh
make            # helper + app → app/build/bin/terraria-research-tracker
make dev        # development mode with live frontend reload
```

The Windows version is built by GitHub Actions (see below). To build it locally on Windows, repeat the workflow steps: `dotnet build` the helper, copy its output to `app/helperbin/`, and run `wails build` in `app/`.

## Releases

GitHub Actions (`.github/workflows/build.yml`) builds the app for Linux and Windows on every push to `main` and on every pull request. The builds are attached to each workflow run as artifacts.

To publish a release, push a tag:

```sh
git tag v1.0.0
git push origin v1.0.0
```

The workflow then creates a GitHub release with `terraria-research-tracker-1.0.0-linux-amd64.tar.gz` and `terraria-research-tracker-1.0.0-windows-amd64.zip`.

## Translations

UI strings live in `app/frontend/src/i18n.js`. To add a language, copy the `en` block under a new code, translate it, and add the code to `LANGUAGES`.

## Layout

```
helper/      C# helper (net48; on Linux it runs on Terraria's Mono)
app/         Go + Wails app, frontend in app/frontend (plain JS, Vite);
             platform_unix.go / platform_windows.go handle OS differences
original/
  windows-release/   the original Windows download (exe, cfg, wld)
  upstream-source/   the original source from GitHub, unchanged
```
