using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

// Access to Terraria's code through reflection, so that the helper builds without
// the (non-redistributable) game assembly and can be compiled anywhere, e.g. in CI.
public static class Game {
	const BindingFlags Any = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static;
	public static Assembly Assembly;
	static readonly Dictionary<(Type, string), MemberInfo> members = new Dictionary<(Type, string), MemberInfo>();

	public static Type Type(string name) {
		return Assembly.GetType(name, true);
	}

	static MemberInfo Member(Type type, string name) {
		var key = (type, name);
		if (!members.TryGetValue(key, out var member)) {
			for (var t = type; t != null && member == null; t = t.BaseType) {
				member = (MemberInfo)t.GetField(name, Any | BindingFlags.DeclaredOnly)
					?? t.GetProperty(name, Any | BindingFlags.DeclaredOnly);
			}
			if (member == null) throw new MissingMemberException(type.FullName, name);
			members[key] = member;
		}
		return member;
	}

	static object Read(Type type, object target, string name) {
		var member = Member(type, name);
		return member is FieldInfo f ? f.GetValue(target) : ((PropertyInfo)member).GetValue(target);
	}

	/// <summary>Static field, constant or property.</summary>
	public static object Static(string typeName, string name) => Read(Type(typeName), null, name);

	public static object Get(object target, string name) => Read(target.GetType(), target, name);
	public static int Int(object target, string name) => Convert.ToInt32(Get(target, name));
	public static bool Bool(object target, string name) => Convert.ToBoolean(Get(target, name));

	static bool Accepts(MethodInfo m, int argCount) {
		var ps = m.GetParameters();
		return argCount <= ps.Length && ps.Skip(argCount).All(p => p.IsOptional);
	}

	/// <summary>
	/// Calls the overload that takes this many arguments (filling in optional ones with defaults);
	/// args are converted to parameter types, and out/ref values are written back into args.
	/// </summary>
	static object Invoke(Type type, object target, string name, object[] args) {
		var method = type.GetMethods(Any)
			.Where(m => m.Name == name && m.IsStatic == (target == null) && Accepts(m, args.Length))
			.OrderBy(m => m.GetParameters().Length)
			.FirstOrDefault();
		if (method == null) throw new MissingMethodException(type.FullName, name);
		var parameters = method.GetParameters();
		var callArgs = new object[parameters.Length];
		for (var i = 0; i < parameters.Length; i++) {
			if (i >= args.Length) {
				callArgs[i] = parameters[i].DefaultValue;
				continue;
			}
			var pt = parameters[i].ParameterType;
			if (pt.IsByRef) pt = pt.GetElementType();
			callArgs[i] = args[i] != null && pt.IsPrimitive ? Convert.ChangeType(args[i], pt) : args[i];
		}
		var result = method.Invoke(target, callArgs);
		Array.Copy(callArgs, args, args.Length);
		return result;
	}

	public static object Call(object target, string name, params object[] args) => Invoke(target.GetType(), target, name, args);
	public static object CallStatic(string typeName, string name, params object[] args) => Invoke(Type(typeName), null, name, args);
}
