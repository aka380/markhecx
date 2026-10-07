import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { mkdir } from "node:fs/promises";
const children = [];
const listening = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
function run(command, args) {
  const child = spawn(command, args, { stdio: "inherit" });
  children.push(child);
  child.on("error", () => {
    console.error(
      "A local service could not start. Check installed dependencies.",
    );
    stop();
  });
  return child;
}
function stop() {
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
async function wait(check) {
  for (let i = 0; i < 60; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error("Local service did not become ready. See its startup output.");
}
try {
  if (!(await listening(27018))) {
    await mkdir(".backend-data", { recursive: true });
    run("mongod", [
      "--dbpath",
      ".backend-data",
      "--bind_ip",
      "127.0.0.1",
      "--port",
      "27018",
      "--replSet",
      "markhecx",
      "--logpath",
      ".backend-data/mongod.log",
    ]);
    await wait(() => listening(27018));
  }
  const init = run(process.execPath, ["scripts/init-local-mongo.mjs"]);
  await new Promise((resolve, reject) =>
    init.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error("Database initialization failed.")),
    ),
  );
  if (!(await listening(3001))) run("npm", ["run", "dev"]);
  await wait(async () => {
    try {
      const r = await fetch("http://127.0.0.1:3001/api/v1/health");
      return r.ok && (await r.json()).database === "connected";
    } catch { return false; }
  });
  console.log(
    "MarkHECX ready at http://127.0.0.1:3001. Keep this launcher open. Existing services/data are reused.",
  );
} catch (e) {
  console.error(e.message);
  stop();
  process.exitCode = 1;
}
