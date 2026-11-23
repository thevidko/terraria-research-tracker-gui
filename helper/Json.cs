using System.Collections.Generic;
using System.Globalization;
using System.Text;

// Just enough JSON writing for our replies; net48 has no built-in serializer worth using.
public static class Json {
	public static string Str(string s) {
		if (s == null) return "null";
		var b = new StringBuilder(s.Length + 2);
		b.Append('"');
		foreach (var c in s) {
			switch (c) {
				case '"': b.Append("\\\""); break;
				case '\\': b.Append("\\\\"); break;
				case '\n': b.Append("\\n"); break;
				case '\r': b.Append("\\r"); break;
				case '\t': b.Append("\\t"); break;
				default:
					if (c < 0x20) b.Append("\\u").Append(((int)c).ToString("x4"));
					else b.Append(c);
					break;
			}
		}
		b.Append('"');
		return b.ToString();
	}

	public static string Value(object v) {
		switch (v) {
			case null: return "null";
			case string s: return Str(s);
			case bool x: return x ? "true" : "false";
			case int x: return x.ToString(CultureInfo.InvariantCulture);
			case short x: return x.ToString(CultureInfo.InvariantCulture);
			case long x: return x.ToString(CultureInfo.InvariantCulture);
			case double x: return x.ToString("R", CultureInfo.InvariantCulture);
			case Raw r: return r.Text;
			default: return Str(v.ToString());
		}
	}

	/// <summary>Obj("key1", value1, "key2", value2, ...)</summary>
	public static string Obj(params object[] kv) {
		var b = new StringBuilder();
		b.Append('{');
		for (var i = 0; i + 1 < kv.Length; i += 2) {
			if (i > 0) b.Append(',');
			b.Append(Str((string)kv[i])).Append(':').Append(Value(kv[i + 1]));
		}
		b.Append('}');
		return b.ToString();
	}

	public static Raw Arr(IEnumerable<string> items) {
		return new Raw("[" + string.Join(",", items) + "]");
	}

	public class Raw {
		public string Text;
		public Raw(string text) { Text = text; }
	}
}
