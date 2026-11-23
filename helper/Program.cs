using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

// Based on YellowAfterlife's Terraria Research Tracker (MIT).
// Instead of an interactive console, this talks to the GUI over stdin/stdout:
// one command per line in, one JSON object per line out.
public static class Program {
	public static string ToolDir;
	public static TextWriter Out;

	static int Main(string[] args) {
		var stdout = new StreamWriter(OpenQuietStdout(), new UTF8Encoding(false));
		stdout.AutoFlush = true;
		Out = stdout;
		var stdin = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false));
		ToolDir = Path.GetDirectoryName(typeof(Program).Assembly.Location);

		try {
			StartServer();
		} catch (Exception e) {
			Send(Json.Obj("type", "fatal", "message", "Terraria Server failed to start: " + Unwrap(e).Message));
			return 1;
		}

		return Tracker.Serve(stdin);
	}

	// Terraria Server fills up item info while starting; we feed it a broken world
	// so that it stops right after. Everything it prints (including the expected
	// "Load failed!" error) goes to the void.
	static void StartServer() {
		// Terraria.Main's fields need ReLogic.dll, which only gets loaded once the launcher runs,
		// so nothing beyond the launcher may be touched before Invoke
		var gameAsm = Assembly.Load("TerrariaServer");
		Game.Assembly = gameAsm;
		var launchType = gameAsm.GetType("Terraria.WindowsLaunch")
			?? gameAsm.GetType("Terraria.LinuxLaunch")
			?? gameAsm.GetType("Terraria.MonoLaunch");
		if (launchType == null) throw new Exception("No launcher class found in TerrariaServer.exe");
		var entryPoint = launchType.GetMethod("Main", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static);
		var brokenWorld = Path.Combine(ToolDir, "TerrariaResearchHelper.wld");

		var oldOut = Console.Out;
		var oldErr = Console.Error;
		var oldIn = Console.In;
		Console.SetOut(TextWriter.Null);
		Console.SetError(TextWriter.Null);
		Console.SetIn(new StringReader("\n\n\n\n"));
		try {
			entryPoint.Invoke(null, new object[] { new string[] { "-world", brokenWorld } });
		} finally {
			Console.SetOut(oldOut);
			Console.SetError(oldErr);
			Console.SetIn(oldIn);
		}
	}

	[DllImport("libc", SetLastError = true)] static extern int dup(int fd);
	[DllImport("libc", SetLastError = true)] static extern int dup2(int fd, int fd2);
	[DllImport("libc", SetLastError = true)] static extern int open(string path, int flags);
	[DllImport("libc", SetLastError = true)] static extern IntPtr write(int fd, byte[] buf, IntPtr count);

	// Terraria writes straight to the stdout/stderr descriptors, so swapping Console.Out
	// isn't enough; point fds 1 and 2 at /dev/null and keep a private copy of stdout for JSON.
	static Stream OpenQuietStdout() {
		if (Environment.OSVersion.Platform != PlatformID.Unix) return Console.OpenStandardOutput();
		var realOut = dup(1);
		var devNull = open("/dev/null", 1 /* O_WRONLY */);
		if (realOut < 0 || devNull < 0) return Console.OpenStandardOutput();
		dup2(devNull, 1);
		dup2(devNull, 2);
		return new FdStream(realOut);
	}

	// Mono's FileStream can't wrap a raw descriptor, so write to it through libc directly
	class FdStream : Stream {
		readonly int fd;
		public FdStream(int fd) { this.fd = fd; }
		public override void Write(byte[] buffer, int offset, int count) {
			var pos = offset;
			var end = offset + count;
			while (pos < end) {
				var len = end - pos;
				var chunk = buffer;
				if (pos != 0) {
					chunk = new byte[len];
					Buffer.BlockCopy(buffer, pos, chunk, 0, len);
				}
				var n = (long)write(fd, chunk, (IntPtr)len);
				if (n < 0) {
					if (Marshal.GetLastWin32Error() == 4 /* EINTR */) continue;
					throw new IOException("write() failed: " + Marshal.GetLastWin32Error());
				}
				pos += (int)n;
			}
		}
		public override void Flush() {}
		public override bool CanRead => false;
		public override bool CanSeek => false;
		public override bool CanWrite => true;
		public override long Length => throw new NotSupportedException();
		public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
		public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
		public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
		public override void SetLength(long value) => throw new NotSupportedException();
	}

	public static Exception Unwrap(Exception e) {
		while (e is TargetInvocationException && e.InnerException != null) e = e.InnerException;
		return e;
	}

	public static void Send(string json) {
		lock (Out) Out.WriteLine(json);
	}
}
