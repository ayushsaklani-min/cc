// Fills in missing development-only values in .env. Existing values are kept.
// Nothing generated here is printed; none of it is suitable for production.
//
//   npm run dev:setup
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { saveEnvVar } from "../lib/env-file.ts";
import { generateSecretScalar } from "../lib/oracle-signer.ts";

if (existsSync(".env")) process.loadEnvFile(".env");

const defaults: Record<string, () => string> = {
  REGISTRY_FINGERPRINT_KEY: () => randomBytes(32).toString("hex"),
  ORACLE_DEV_SECRET_SCALAR: () => generateSecretScalar().toString(),
  ADMIN_DEV_SECRET_HEX: () => randomBytes(32).toString("hex"),
  POLICY_ISSUER_ALLOW_LIST: () => JSON.stringify(["Acme Payroll Inc."]),
  DEV_SESSION_TOKENS: () =>
    JSON.stringify({
      [randomBytes(24).toString("hex")]: { principal: "dev-user-1", method: "govIdCamera", verifiedName: "Maria Jose Garcia" },
      [randomBytes(24).toString("hex")]: { principal: "dev-user-2", method: "walletSignature" },
    }),
};

for (const [name, make] of Object.entries(defaults)) {
  if (process.env[name]) {
    console.log(`kept      ${name}`);
  } else {
    saveEnvVar(name, make());
    console.log(`generated ${name}`);
  }
}
