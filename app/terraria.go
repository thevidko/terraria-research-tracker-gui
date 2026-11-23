package main

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
)

// steamLibraryPath matches `"path"		"/some/dir"` lines in libraryfolders.vdf.
var steamLibraryPath = regexp.MustCompile(`^\s*"path"\s*"(.+)"\s*$`)

// steamRoots are the usual places a Linux Steam install lives.
func steamRoots() []string {
	home, _ := os.UserHomeDir()
	return []string{
		filepath.Join(home, ".local/share/Steam"),
		filepath.Join(home, ".steam/steam"),
		filepath.Join(home, ".var/app/com.valvesoftware.Steam/data/Steam"),
	}
}

// isTerrariaDir reports whether dir holds a native Linux Terraria install.
func isTerrariaDir(dir string) bool {
	for _, name := range []string{"TerrariaServer.exe", "TerrariaServer.bin.x86_64"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			return false
		}
	}
	return true
}

// findTerrariaDir looks through Steam libraries for the game; returns "" if not found.
func findTerrariaDir() string {
	if dir := os.Getenv("TERRARIA_PATH"); dir != "" && isTerrariaDir(dir) {
		return dir
	}
	var libraries []string
	for _, root := range steamRoots() {
		libraries = append(libraries, root)
		f, err := os.Open(filepath.Join(root, "steamapps/libraryfolders.vdf"))
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			if m := steamLibraryPath.FindStringSubmatch(scanner.Text()); m != nil {
				libraries = append(libraries, m[1])
			}
		}
		f.Close()
	}
	for _, lib := range libraries {
		dir := filepath.Join(lib, "steamapps/common/Terraria")
		if isTerrariaDir(dir) {
			return dir
		}
	}
	return ""
}
