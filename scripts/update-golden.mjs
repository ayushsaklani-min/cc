// Regenerates test/golden/*.json. Only for an intended change to the signed
// format; review the diff before committing.
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["vitest", "run", "test/oracle-signer.test.ts"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, UPDATE_GOLDEN: "1" },
});
process.exit(r.status ?? 1);
