import { spawnSync } from "node:child_process";
import { assertDemoTarget } from "./demo-config.mjs";

assertDemoTarget(process.env);
const action = process.argv[2];
function run(args) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
switch (action) {
  case "setup":
    run(["scripts/setup-db.mjs"]);
    run(["scripts/seed-demo.mjs"]);
    break;
  case "dev":
  case "start":
    run([
      "node_modules/next/dist/bin/next",
      action,
      "--hostname",
      "127.0.0.1",
      "--port",
      "3001",
    ]);
    break;
  case "build":
    run(["node_modules/next/dist/bin/next", "build"]);
    break;
  case "test":
    run(["scripts/verify.mjs"]);
    break;
  default:
    throw new Error("Use demo:setup, demo:dev, demo:build, or demo:start.");
}
