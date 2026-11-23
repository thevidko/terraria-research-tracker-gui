package main

import (
	"bufio"
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// The C# helper is built by the Makefile and copied here before `wails build`.
//
//go:embed helperbin/TerrariaResearchHelper.exe helperbin/TerrariaResearchHelper.wld helperbin/TerrariaResearchHelper.cfg
var helperFiles embed.FS

const (
	helperName   = "TerrariaResearchHelper"
	startTimeout = 2 * time.Minute
)

// installHelper copies the helper next to TerrariaServer.exe, where it can load the game.
// The research config is only written when missing so that user edits survive.
func installHelper(dir string) error {
	for _, ext := range []string{".exe", ".wld"} {
		data, err := helperFiles.ReadFile("helperbin/" + helperName + ext)
		if err != nil {
			return err
		}
		if err := writeIfChanged(filepath.Join(dir, helperName+ext), data); err != nil {
			return err
		}
	}
	cfgPath := filepath.Join(dir, helperName+".cfg")
	if _, err := os.Stat(cfgPath); errors.Is(err, os.ErrNotExist) {
		data, _ := helperFiles.ReadFile("helperbin/" + helperName + ".cfg")
		if err := os.WriteFile(cfgPath, data, 0o644); err != nil {
			return err
		}
	}
	return installLauncher(dir)
}

func writeIfChanged(path string, data []byte, mode ...os.FileMode) error {
	perm := os.FileMode(0o644)
	if len(mode) > 0 {
		perm = mode[0]
	}
	if old, err := os.ReadFile(path); err == nil && bytes.Equal(old, data) {
		return nil
	}
	if err := os.WriteFile(path, data, perm); err != nil {
		return err
	}
	return os.Chmod(path, perm)
}

// Helper is a running helper process; requests are answered one JSON line each.
type Helper struct {
	mu      sync.Mutex
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	lines   *bufio.Scanner
	Version string
}

type helperReply struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Version string `json:"version"`
}

func startHelper(dir string) (*Helper, error) {
	cmd := helperCommand(dir)
	cmd.Dir = dir
	if cmd.Env == nil {
		cmd.Env = os.Environ()
	}
	// lets the helper find Steam Cloud saves in Steam's userdata folder
	cmd.Env = append(cmd.Env, "TRH_STEAM_ROOTS="+strings.Join(existingSteamRoots(), string(os.PathListSeparator)))
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 64*1024), 64*1024*1024)
	h := &Helper{cmd: cmd, stdin: stdin, lines: scanner}

	ready := make(chan error, 1)
	go func() {
		line, err := h.readLine()
		if err != nil {
			ready <- err
			return
		}
		var reply helperReply
		if err := json.Unmarshal(line, &reply); err != nil {
			ready <- err
			return
		}
		switch reply.Type {
		case "ready":
			h.Version = reply.Version
			ready <- nil
		case "fatal", "error":
			ready <- errors.New(reply.Message)
		default:
			ready <- fmt.Errorf("unexpected reply %q", reply.Type)
		}
	}()
	select {
	case err := <-ready:
		if err != nil {
			h.Close()
			if msg := strings.TrimSpace(stderr.String()); msg != "" {
				err = fmt.Errorf("%w (%s)", err, msg)
			}
			return nil, err
		}
		return h, nil
	case <-time.After(startTimeout):
		h.Close()
		return nil, errors.New("Terraria Server took too long to start")
	}
}

func (h *Helper) readLine() ([]byte, error) {
	for h.lines.Scan() {
		line := bytes.TrimSpace(h.lines.Bytes())
		if len(line) > 0 && line[0] == '{' {
			return line, nil
		}
	}
	if err := h.lines.Err(); err != nil {
		return nil, err
	}
	return nil, errors.New("helper exited unexpectedly")
}

// Request sends one command and decodes the reply into out.
func (h *Helper) Request(command string, out any) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, err := io.WriteString(h.stdin, command+"\n"); err != nil {
		return err
	}
	line, err := h.readLine()
	if err != nil {
		return err
	}
	var reply helperReply
	if err := json.Unmarshal(line, &reply); err != nil {
		return err
	}
	if reply.Type == "error" || reply.Type == "fatal" {
		return errors.New(reply.Message)
	}
	return json.Unmarshal(line, out)
}

func (h *Helper) Close() {
	io.WriteString(h.stdin, "quit\n")
	h.stdin.Close()
	done := make(chan struct{})
	go func() {
		h.cmd.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		h.cmd.Process.Kill()
	}
}

// existingSteamRoots resolves symlinks (~/.steam/steam usually points to
// ~/.local/share/Steam) so that the same saves aren't listed twice.
func existingSteamRoots() []string {
	var roots []string
	seen := map[string]bool{}
	for _, root := range steamRoots() {
		real, err := filepath.EvalSymlinks(root)
		if err != nil || seen[real] {
			continue
		}
		seen[real] = true
		roots = append(roots, real)
	}
	return roots
}
