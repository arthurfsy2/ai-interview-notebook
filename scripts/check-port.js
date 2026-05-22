const net = require("net");
const { execSync } = require("child_process");

const port = parseInt(process.argv[2] || "3003", 10);

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

function findProcessOnPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: "utf-8",
      }).trim();
      if (!output) return null;
      const pid = output.split(/\s+/).pop();
      if (!pid || pid === "0") return null;
      try {
        const name = execSync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, {
          encoding: "utf-8",
        }).trim();
        const match = name.match(/"([^"]+)"/);
        return { pid, name: match ? match[1] : "unknown" };
      } catch {
        return { pid, name: "unknown" };
      }
    } else {
      const output = execSync(`lsof -i :${port} -t`, { encoding: "utf-8" }).trim();
      if (!output) return null;
      const pid = output.split("\n")[0];
      return { pid, name: "process" };
    }
  } catch {
    return null;
  }
}

(async () => {
  const occupied = await checkPort(port);
  if (!occupied) {
    process.exit(0);
  }

  const proc = findProcessOnPort(port);
  console.log("");
  console.log(`\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`\x1b[31m  ⛔ 端口 ${port} 已被占用，无法启动 dev server\x1b[0m`);
  console.log(`\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  if (proc) {
    console.log(`  进程: ${proc.name} (PID: ${proc.pid})`);
    if (process.platform === "win32") {
      console.log(`  \x1b[33m💡 终止命令: \x1b[0m\x1b[1m\x1b[36mtaskkill /PID ${proc.pid} /F\x1b[0m`);
      console.log(`  \x1b[33m💡 一键终止并重启: \x1b[0m\x1b[1m\x1b[36mtaskkill /PID ${proc.pid} /F && npm run dev\x1b[0m`);
    } else {
      console.log(`  \x1b[33m💡 终止命令: \x1b[0m\x1b[1m\x1b[36mkill -9 ${proc.pid}\x1b[0m`);
    }
  }
  console.log("");
  process.exit(1);
})();
