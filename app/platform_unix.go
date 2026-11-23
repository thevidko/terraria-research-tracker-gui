//go:build !windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
)

// The native Linux build runs the server through MonoKickstart and its bundled Mono.
var terrariaFiles = []string{"TerrariaServer.exe", "TerrariaServer.bin.x86_64"}

func steamRoots() []string {
	home, _ := os.UserHomeDir()
	return []string{
		filepath.Join(home, ".local/share/Steam"),
		filepath.Join(home, ".steam/steam"),
		filepath.Join(home, ".var/app/com.valvesoftware.Steam/data/Steam"),
	}
}

// installLauncher puts a renamed copy of the server's launcher next to the helper:
// MonoKickstart runs `<own name>.exe`, so it runs our helper with the game's Mono.
func installLauncher(dir string) error {
	launcher, err := os.ReadFile(filepath.Join(dir, "TerrariaServer.bin.x86_64"))
	if err != nil {
		return err
	}
	return writeIfChanged(filepath.Join(dir, helperName+".bin.x86_64"), launcher, 0o755)
}

func helperCommand(dir string) *exec.Cmd {
	cmd := exec.Command(filepath.Join(dir, helperName+".bin.x86_64"))
	cmd.Env = append(os.Environ(), "MONO_IOMAP=all")
	return cmd
}

func openFile(path string) error {
	return exec.Command("xdg-open", path).Start()
}
