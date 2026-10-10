// CI gate (spec 4.1 / 12): the build fails unless the chain-time freshness
// assertion and the revocation time bound are present as live code in every
// deployable contract profile. Comments are stripped first, so a commented-out
// assertion does not satisfy the gate.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pins = JSON.parse(readFileSync(resolve(root, "toolchain.json"), "utf8"));

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const required = [
  {
    circuit: "verifyAndRegister",
    pattern: /assert\s*\(\s*blockTimeLt\s*\(\s*disclose\s*\(\s*a\.expiresAt\s*\)\s*\)\s*,/,
    what: "assert(blockTimeLt(disclose(a.expiresAt)), ...)",
  },
  {
    circuit: "revokeSubject",
    pattern: /assert\s*\(\s*blockTimeGte\s*\(\s*disclose\s*\(\s*atTime\s*\)\s*\)\s*,/,
    what: "assert(blockTimeGte(disclose(atTime)), ...)",
  },
];

function circuitBody(src, name) {
  const start = src.search(new RegExp(String.raw`export\s+circuit\s+${name}\s*\(`));
  if (start < 0) return undefined;
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return undefined;
}

let failed = false;
for (const c of pins.contracts) {
  const src = stripComments(readFileSync(resolve(root, c.source), "utf8"));
  for (const r of required) {
    const body = circuitBody(src, r.circuit);
    if (body === undefined || !r.pattern.test(body)) {
      console.error(`expiry gate FAILED: ${c.source}: ${r.circuit} is missing live ${r.what}`);
      failed = true;
    }
  }
  if (!failed) console.log(`expiry gate OK: ${c.source}`);
}
process.exit(failed ? 1 : 0);
