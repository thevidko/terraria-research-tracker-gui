package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Player is one .plr file as reported by the helper.
type Player struct {
	Path     string `json:"path"`
	Name     string `json:"name"`
	File     string `json:"file"`
	Cloud    bool   `json:"cloud"`
	Journey  bool   `json:"journey"`
	OK       bool   `json:"ok"`
	Modified int64  `json:"modified"`
}

// Item is one researchable item and how far along the player is.
type Item struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Have     int    `json:"have"`
	Need     int    `json:"need"`
}

type Research struct {
	Path  string `json:"path"`
	Name  string `json:"name"`
	Items []Item `json:"items"`
}

// Status describes whether the helper (and with it Terraria Server) is up.
// The frontend translates State and Reason; Message holds untranslated details.
type Status struct {
	State       string `json:"state"`  // "starting", "ready", "missing" or "error"
	Reason      string `json:"reason"` // for "error": "install" or "start"
	Message     string `json:"message"`
	TerrariaDir string `json:"terrariaDir"`
	Version     string `json:"version"`
}

// Errors the frontend recognizes by their text and shows translated.
var (
	errNotRunning       = errors.New("not_running")
	errNotTerrariaDir   = errors.New("not_terraria_dir")
	errTerrariaNotFound = errors.New("terraria_not_found")
)

type settings struct {
	TerrariaDir string `json:"terrariaDir"`
}

type App struct {
	ctx context.Context

	mu     sync.Mutex
	helper *Helper
	status Status

	watchMu   sync.Mutex
	watchPath string
	watchTime time.Time
}

func NewApp() *App {
	return &App{status: Status{State: "starting"}}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	go a.start(loadSettings().TerrariaDir)
	go a.watchLoop()
}

func (a *App) shutdown(ctx context.Context) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.helper != nil {
		a.helper.Close()
		a.helper = nil
	}
}

func (a *App) setStatus(s Status) {
	a.mu.Lock()
	a.status = s
	a.mu.Unlock()
	runtime.EventsEmit(a.ctx, "status", s)
}

// start (re)launches the helper for the given Terraria folder, or a detected one if empty.
func (a *App) start(dir string) {
	if dir == "" || !isTerrariaDir(dir) {
		dir = findTerrariaDir()
	}
	if dir == "" {
		a.setStatus(Status{State: "missing"})
		return
	}
	a.setStatus(Status{State: "starting", TerrariaDir: dir})

	a.mu.Lock()
	if a.helper != nil {
		a.helper.Close()
		a.helper = nil
	}
	a.mu.Unlock()

	if err := installHelper(dir); err != nil {
		a.setStatus(Status{State: "error", Reason: "install", TerrariaDir: dir, Message: err.Error()})
		return
	}
	h, err := startHelper(dir)
	if err != nil {
		a.setStatus(Status{State: "error", Reason: "start", TerrariaDir: dir, Message: err.Error()})
		return
	}
	a.mu.Lock()
	a.helper = h
	a.mu.Unlock()
	a.setStatus(Status{State: "ready", TerrariaDir: dir, Version: h.Version})
}

func (a *App) request(command string, out any) error {
	a.mu.Lock()
	h := a.helper
	a.mu.Unlock()
	if h == nil {
		return errNotRunning
	}
	return h.Request(command, out)
}

// GetStatus returns the current helper status.
func (a *App) GetStatus() Status {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.status
}

// ListPlayers returns all player files, local and Steam Cloud.
func (a *App) ListPlayers() ([]Player, error) {
	var reply struct {
		Players []Player `json:"players"`
	}
	err := a.request("list", &reply)
	return reply.Players, err
}

// LoadResearch reads a Journey Mode player's research and starts watching the file.
func (a *App) LoadResearch(path string) (*Research, error) {
	var reply Research
	if err := a.request("load "+path, &reply); err != nil {
		return nil, err
	}
	a.watchMu.Lock()
	a.watchPath = path
	a.watchTime = modTime(path)
	a.watchMu.Unlock()
	return &reply, nil
}

// watchLoop tells the frontend when the watched player file gets saved by the game.
func (a *App) watchLoop() {
	for range time.Tick(2 * time.Second) {
		a.watchMu.Lock()
		path := a.watchPath
		changed := path != "" && !modTime(path).Equal(a.watchTime)
		if changed {
			a.watchTime = modTime(path)
		}
		a.watchMu.Unlock()
		if changed {
			runtime.EventsEmit(a.ctx, "player-changed", path)
		}
	}
}

func modTime(path string) time.Time {
	info, err := os.Stat(path)
	if err != nil {
		return time.Time{}
	}
	return info.ModTime()
}

// ChooseTerrariaDir lets the user pick the game folder by hand and restarts the helper.
// The dialog title comes from the frontend so that it's in the chosen language.
func (a *App) ChooseTerrariaDir(title string) (string, error) {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{Title: title})
	if err != nil || dir == "" {
		return "", err
	}
	if !isTerrariaDir(dir) {
		return "", errNotTerrariaDir
	}
	saveSettings(settings{TerrariaDir: dir})
	go a.start(dir)
	return dir, nil
}

// Restart relaunches Terraria Server, e.g. after a game update.
func (a *App) Restart() {
	go a.start(a.GetStatus().TerrariaDir)
}

// OpenConfig opens the omit/alias config in the default text editor.
func (a *App) OpenConfig() error {
	dir := a.GetStatus().TerrariaDir
	if dir == "" {
		return errTerrariaNotFound
	}
	return openFile(filepath.Join(dir, helperName+".cfg"))
}

// OpenWiki opens the item's page on the Terraria wiki.
func (a *App) OpenWiki(name string) {
	page := url.PathEscape(strings.ReplaceAll(name, " ", "_"))
	runtime.BrowserOpenURL(a.ctx, "https://terraria.wiki.gg/wiki/"+page)
}

func settingsPath() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		return ""
	}
	return filepath.Join(dir, "terraria-research-tracker", "settings.json")
}

func loadSettings() settings {
	var s settings
	if data, err := os.ReadFile(settingsPath()); err == nil {
		json.Unmarshal(data, &s)
	}
	return s
}

func saveSettings(s settings) {
	path := settingsPath()
	if path == "" {
		return
	}
	os.MkdirAll(filepath.Dir(path), 0o755)
	data, _ := json.MarshalIndent(s, "", "  ")
	os.WriteFile(path, data, 0o644)
}
