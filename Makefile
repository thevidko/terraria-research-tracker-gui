# Builds the C# helper, embeds it into the Go app and builds the app.
# The game isn't needed to build; the helper finds Terraria's code at run time.
WAILS ?= $(shell command -v wails || echo $(HOME)/go/bin/wails)
# Arch and other current distros ship WebKitGTK 4.1 only
WAILS_TAGS ?= webkit2_41

HELPER_OUT := build/helper
HELPER_FILES := TerrariaResearchHelper.exe TerrariaResearchHelper.wld TerrariaResearchHelper.cfg

.PHONY: all helper app dev clean

all: app

helper:
	dotnet build helper/TerrariaResearchHelper.csproj -c Release -o $(HELPER_OUT)
	mkdir -p app/helperbin
	cp $(addprefix $(HELPER_OUT)/,$(HELPER_FILES)) app/helperbin/

app: helper
	cd app && $(WAILS) build -tags $(WAILS_TAGS)
	@echo "Built app/build/bin/terraria-research-tracker"

dev: helper
	cd app && $(WAILS) dev -tags $(WAILS_TAGS)

clean:
	rm -rf build helper/bin helper/obj app/helperbin app/build/bin app/frontend/dist
