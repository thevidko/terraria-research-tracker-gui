//go:build windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"syscall"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

// On Windows the helper is a regular .NET Framework program, no launcher needed.
var terrariaFiles = []string{"TerrariaServer.exe"}

func steamRoots() []string {
	var roots []string
	if key, err := registry.OpenKey(registry.CURRENT_USER, `Software\Valve\Steam`, registry.QUERY_VALUE); err == nil {
		if path, _, err := key.GetStringValue("SteamPath"); err == nil {
			roots = append(roots, filepath.FromSlash(path))
		}
		key.Close()
	}
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles"} {
		if dir := os.Getenv(env); dir != "" {
			roots = append(roots, filepath.Join(dir, "Steam"))
		}
	}
	return roots
}

func installLauncher(dir string) error {
	return nil
}

func helperCommand(dir string) *exec.Cmd {
	cmd := exec.Command(filepath.Join(dir, helperName+".exe"))
	// the helper is a console program; don't flash a console window
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: windows.CREATE_NO_WINDOW}
	return cmd
}

func openFile(path string) error {
	return exec.Command("rundll32", "url.dll,FileProtocolHandler", path).Start()
}
