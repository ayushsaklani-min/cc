// Compiles the Compact contracts with the pinned toolchain.
// On Windows the compiler only exists inside WSL, so the call is forwarded there.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pins = JSON.parse(readFileSync(resolve(root, "toolchain.json"), "utf8"));
const skipZk = process.argv.includes("--skip-zk");
const isWindows = process.platform === "win32";

const toWslPath = (p) =>
  p.replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`).replaceAll("\\", "/");
const shq = (s) => `'${s.replaceAll("'", `'\\''`)}'`;

function sh(script) {
  const r = isWindows
    ? spawnSync("wsl", ["-d", pins.wslDistro, "--", "bash", "-lc", script], { encoding: "utf8" })
    : spawnSync("bash", ["-lc", script], { encoding: "utf8" });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.replaceAll("\0", "") };
}

const pathPrefix = 'export PATH="$HOME/.local/bin:$PATH"; ';

const version = sh(`${pathPrefix}compact compile --version`).out.trim();
if (version !== pins.compiler.version) {
  console.error(
    `compiler-version gate: expected ${pins.compiler.version}, found "${version}". ` +
      `0.31.0 is rejected outright (silently dropped range constraint).`,
  );
  process.exit(1);
}
console.log(`compiler ${version} OK`);

let failed = false;
for (const c of pins.contracts) {
  const src = resolve(root, c.source);
  if (!existsSync(src)) {
    console.error(`missing contract source: ${c.source}`);
    failed = true;
    continue;
  }
  if (c.compiler !== pins.compiler.version) {
    console.log(`skip ${c.source}: needs compiler ${c.compiler} (ledger 9), not the pinned one`);
    continue;
  }
  const out = resolve(root, c.out);
  const p = (x) => shq(isWindows ? toWslPath(x) : x);
  const r = sh(`${pathPrefix}compact compile ${skipZk ? "--skip-zk " : ""}${p(src)} ${p(out)}`);
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error(`compile FAILED: ${c.source}`);
    failed = true;
  } else {
    console.log(`compiled ${c.source} -> ${c.out}`);
  }
}
process.exit(failed ? 1 : 0);
