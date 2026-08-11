// Runs a command with an extra env file loaded on top of the environment.
//
// `node --env-file=x next dev` looks like it should do this, but does not: Next
// re-spawns itself and passes the parent's flags through NODE_OPTIONS, which
// rejects --env-file. Loading the file here and spawning a plain child avoids
// that, and the values still win over .env.local because Next's loader leaves
// variables already present in process.env alone.
//
// Usage: node scripts/with-env.mjs <env-file> <command> [args...]
import { spawn } from "node:child_process";

const [envFile, command, ...args] = process.argv.slice(2);

if (!envFile || !command) {
  console.error("Usage: node scripts/with-env.mjs <env-file> <command> [args...]");
  process.exit(1);
}

try {
  process.loadEnvFile(envFile);
} catch (error) {
  const reason = error?.code === "ENOENT" ? "not found" : error.message;
  console.error(`Cannot read ${envFile}: ${reason}`);
  console.error("See the Databases section of README.md for what belongs in it.");
  process.exit(1);
}

// shell: false keeps a password with shell metacharacters out of a command line
const child = spawn(command, args, { stdio: "inherit", shell: false });

child.on("error", (error) => {
  console.error(`Could not run ${command}: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
