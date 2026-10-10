// Writes a variable into the local .env, replacing an existing (possibly
// empty) assignment rather than appending a duplicate. Values are never logged.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function saveEnvVar(name: string, value: string, file = ".env"): void {
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : [];
  const index = lines.findIndex((l) => l.startsWith(`${name}=`));
  if (index >= 0) lines[index] = `${name}=${value}`;
  else lines.push(`${name}=${value}`);
  writeFileSync(file, `${lines.join("\n").replace(/\n+$/, "")}\n`);
  process.env[name] = value;
}
