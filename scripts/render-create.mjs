// Creates the hosted demo backend on Render from the local .env.
// Secrets are passed to the Render CLI directly and never printed. The server
// wallet seed and the admin secret are not sent: the gateway does not use them.
// The demo sign-in tokens are new, and are saved to the git-ignored .env.deploy.
//   node scripts/render-create.mjs <repo-url> <branch>
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [repo, branch] = process.argv.slice(2);
if (!repo || !branch) throw new Error("usage: render-create.mjs <repo-url> <branch>");

const local = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line);
  if (m) local[m[1]] = m[2].trim();
}

// Same principals as the local development sessions, behind new tokens.
const sessions = {};
for (const session of Object.values(JSON.parse(local.DEV_SESSION_TOKENS))) {
  sessions[`demo-${randomBytes(18).toString("base64url")}`] = session;
}

const env = {
  NODE_VERSION: "25.2.1",
  CIPHERCOMPLY_DEMO_MODE: "preview-demo",
  MIDNIGHT_EXPLORER_URL: local.MIDNIGHT_EXPLORER_URL ?? "",
  DATABASE_PATH: "./data/ciphercomply.db",
  REGISTRY_FINGERPRINT_KEY: randomBytes(32).toString("hex"),
  DEV_SESSION_TOKENS: JSON.stringify(sessions),
};
for (const name of [
  "MIDNIGHT_NETWORK",
  "MIDNIGHT_PROFILE",
  "MIDNIGHT_NODE_RPC_URL",
  "MIDNIGHT_INDEXER_URL",
  "MIDNIGHT_INDEXER_WS_URL",
  "CIPHERCOMPLY_POLICY_ID",
  "CIPHERCOMPLY_DOMAIN",
  "CIPHERCOMPLY_MIN_ASSURANCE",
  "CIPHERCOMPLY_CONTRACT_ADDRESS",
  "POLICY_ISSUER_ALLOW_LIST",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_CROSSCHECK_MODEL",
  "ORACLE_DEV_SECRET_SCALAR",
]) {
  if (!local[name]) throw new Error(`${name} is not set in .env`);
  env[name] = local[name];
}

writeFileSync(
  new URL("../.env.deploy", import.meta.url),
  `# Hosted demo on Render. Git-ignored. Sign in with one of these tokens.\nDEV_SESSION_TOKENS=${env.DEV_SESSION_TOKENS}\nREGISTRY_FINGERPRINT_KEY=${env.REGISTRY_FINGERPRINT_KEY}\n`,
);

const args = [
  "services", "create",
  "--name", "ciphercomply-api",
  "--type", "web_service",
  "--runtime", "node",
  "--plan", "free",
  "--region", "singapore",
  "--repo", repo,
  "--branch", branch,
  "--build-command", "npm install --no-audit --no-fund && cd frontend && npm ci && npx next build",
  "--start-command", "cd frontend && npx next start -p $PORT",
  "--health-check-path", "/",
  "--confirm",
  "--output", "json",
];
for (const [k, v] of Object.entries(env)) args.push("--env-var", `${k}=${v}`);

const res = spawnSync("render", args, { encoding: "utf8" });
let out = `${res.stdout}\n${res.stderr}`;
for (const v of [env.GEMINI_API_KEY, env.ORACLE_DEV_SECRET_SCALAR, env.REGISTRY_FINGERPRINT_KEY, ...Object.keys(sessions)]) {
  out = out.split(v).join("***");
}
console.log(out.slice(0, 3000));
process.exit(res.status ?? 1);
