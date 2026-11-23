using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;

public static class Tracker {
	const string ConfigName = "TerrariaResearchHelper.cfg";

	static string PlayerPath => (string)Game.Static("Terraria.Main", "PlayerPath");

	public static int Serve(TextReader input) {
		Program.Send(Json.Obj(
			"type", "ready",
			"version", (string)Game.Static("Terraria.Main", "versionNumber"),
			"playerPath", PlayerPath
		));
		string line;
		while ((line = input.ReadLine()) != null) {
			line = line.Trim();
			if (line.Length == 0) continue;
			var space = line.IndexOf(' ');
			var cmd = space < 0 ? line : line.Substring(0, space);
			var arg = space < 0 ? "" : line.Substring(space + 1);
			try {
				switch (cmd) {
					case "list": Program.Send(ListPlayers()); break;
					case "load": Program.Send(LoadResearch(arg)); break;
					case "quit": return 0;
					default: Program.Send(Error("Unknown command: " + cmd)); break;
				}
			} catch (Exception e) {
				Program.Send(Error(Program.Unwrap(e).Message));
			}
		}
		return 0;
	}

	static string Error(string message) {
		return Json.Obj("type", "error", "message", message);
	}

	class PlayerInfo {
		public string Name;
		public bool OK;
		public bool Journey;
		public object Player;
	}

	static PlayerInfo LoadPlayer(string path) {
		// Terraria may print warnings while loading; keep our stdout clean
		var oldOut = Console.Out;
		Console.SetOut(TextWriter.Null);
		try {
			var data = Game.CallStatic("Terraria.Player", "LoadPlayer", path, false);
			var player = Game.Get(data, "Player");
			var ok = Game.Int(player, "loadStatus") == Convert.ToInt32(Game.Static("Terraria.ID.StatusID", "Ok"));
			return new PlayerInfo {
				Player = player,
				OK = ok,
				Name = (string)Game.Get(player, "name"),
				Journey = ok && Game.Int(player, "difficulty") == Convert.ToInt32(Game.Static("Terraria.ID.PlayerDifficultyID", "Creative")),
			};
		} finally {
			Console.SetOut(oldOut);
		}
	}

	static IEnumerable<KeyValuePair<string, bool>> PlayerFiles() {
		if (Directory.Exists(PlayerPath)) {
			foreach (var path in Directory.GetFiles(PlayerPath, "*.plr")) {
				yield return new KeyValuePair<string, bool>(path, false);
			}
		}
		// Steam Cloud saves live in Steam's userdata folder instead
		var seen = new HashSet<string>();
		foreach (var root in SteamRoots()) {
			var userdata = Path.Combine(root, "userdata");
			if (!Directory.Exists(userdata)) continue;
			foreach (var user in Directory.GetDirectories(userdata)) {
				var cloud = Path.GetFullPath(Path.Combine(user, "105600", "remote", "players"));
				if (!Directory.Exists(cloud) || !seen.Add(cloud)) continue;
				foreach (var path in Directory.GetFiles(cloud, "*.plr")) {
					yield return new KeyValuePair<string, bool>(path, true);
				}
			}
		}
	}

	// the app passes the Steam folders it knows of; fall back to the usual Linux one
	static IEnumerable<string> SteamRoots() {
		var roots = Environment.GetEnvironmentVariable("TRH_STEAM_ROOTS");
		if (!string.IsNullOrEmpty(roots)) {
			foreach (var root in roots.Split(Path.PathSeparator)) {
				if (root.Length > 0) yield return root;
			}
		}
		var home = Environment.GetEnvironmentVariable("HOME");
		if (!string.IsNullOrEmpty(home)) yield return Path.Combine(home, ".local/share/Steam");
	}

	static string ListPlayers() {
		var players = new List<string>();
		foreach (var pair in PlayerFiles()) {
			var path = pair.Key;
			var name = Path.GetFileNameWithoutExtension(path);
			var ok = false;
			var journey = false;
			try {
				var info = LoadPlayer(path);
				ok = info.OK;
				if (ok) {
					name = info.Name;
					journey = info.Journey;
				}
			} catch (Exception) {}
			var modified = new DateTimeOffset(File.GetLastWriteTimeUtc(path)).ToUnixTimeMilliseconds();
			players.Add(Json.Obj(
				"path", path,
				"name", name,
				"file", Path.GetFileName(path),
				"cloud", pair.Value,
				"journey", journey,
				"ok", ok,
				"modified", modified
			));
		}
		return Json.Obj("type", "players", "players", Json.Arr(players));
	}

	static string LoadResearch(string path) {
		if (!File.Exists(path)) return Error("File not found: " + path);
		var info = LoadPlayer(path);
		if (!info.OK) return Error("Couldn't load player file");
		if (!info.Journey) return Error(info.Name + " is not a Journey Mode character");
		var itemSacrifices = Game.Get(Game.Get(info.Player, "creativeTracker"), "ItemSacrifices");

		var config = new ResearchConfig();
		var configPath = Path.Combine(Program.ToolDir, ConfigName);
		if (File.Exists(configPath)) config.Load(configPath);

		var persistentIds = (IDictionary)Game.Static("Terraria.ID.ContentSamples", "ItemPersistentIdsByNetIds");
		var itemCount = Convert.ToInt32(Game.Static("Terraria.ID.ItemID", "Count"));
		var item = Activator.CreateInstance(Game.Type("Terraria.Item"));
		var items = new Dictionary<short, ItemInfo>();
		for (short id = 1; id < itemCount; id++) {
			if (config.Omit.Contains(id)) continue;
			var args = new object[] { id, 0, 0 };
			if (!(bool)Game.Call(itemSacrifices, "TryGetSacrificeNumbers", args)) continue;
			Game.Call(item, "SetDefaults", (int)id);
			var pid = (persistentIds.Contains((int)id) ? persistentIds[(int)id] as string : null) ?? "";
			var name = (string)Game.Get(item, "Name");
			items[id] = new ItemInfo(id, name, Convert.ToInt32(args[1]), Convert.ToInt32(args[2]), Categorize(item, pid));
		}

		// researching one item of an alias group counts for the whole group
		foreach (var aliases in config.Aliases) {
			var anyComplete = aliases.Any(id => items.TryGetValue(id, out var it) && it.Complete);
			if (!anyComplete) continue;
			foreach (var id in aliases) {
				if (items.TryGetValue(id, out var it)) it.Complete = true;
			}
		}

		var list = items.Values.Select(it => Json.Obj(
			"id", it.ID,
			"name", it.Name,
			"category", it.Category,
			"have", it.Have,
			"need", it.Needed
		));
		return Json.Obj(
			"type", "research",
			"path", path,
			"name", info.Name,
			"items", Json.Arr(list)
		);
	}

	static string Categorize(object item, string pid) {
		bool B(string field) => Game.Bool(item, field);
		int I(string field) => Game.Int(item, field);
		if (B("vanity")) return "Vanity";
		if (pid.EndsWith("Dye")) return "Dye";
		if (pid.EndsWith("Paint")) return "Paint";
		if (I("ammo") > 0) return "Ammo";
		if (I("fishingPole") > 0) return "Fishing";
		if (B("sentry")) return "Sentry";
		if (B("summon")) return "Summon";
		if (B("accessory")) return "Accessory";
		if (I("pick") > 0 || I("axe") > 0 || I("hammer") > 0) return "Tools";
		if (B("melee")) return "Melee";
		if (B("ranged")) return "Ranged";
		if (B("magic")) return "Magic";
		if (I("headSlot") > 0 || I("bodySlot") > 0 || I("legSlot") > 0) return "Armor";
		if (B("material")) return "Material";
		if (I("createTile") > 0 || I("createWall") > 0) return "Placeable";
		if (B("consumable") || I("healLife") > 0 || I("healMana") > 0) return "Consumable";
		return "Other";
	}
}
