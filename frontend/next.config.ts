import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// The API routes delegate to ../lib, which is configured from the repository's
// root .env (server-only values; nothing here is exposed to the browser).
const repoRoot = path.join(__dirname, "..");
const rootEnv = path.join(repoRoot, ".env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
if (process.env.DATABASE_PATH && !path.isAbsolute(process.env.DATABASE_PATH)) {
  process.env.DATABASE_PATH = path.resolve(repoRoot, process.env.DATABASE_PATH);
}

// Where the compiled circuit artifacts live, for the route that serves them to the browser.
process.env.CIPHERCOMPLY_REPO_ROOT ??= repoRoot;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Run these from node_modules instead of bundling them: they load WebAssembly
  // and native Node modules.
  serverExternalPackages: [
    "@midnight-ntwrk/compact-runtime",
    "@midnight-ntwrk/onchain-runtime-v3",
    "@midnight-ntwrk/ledger-v8",
    "@midnight-ntwrk/compact-js",
    "@midnight-ntwrk/midnight-js",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
    "ws",
  ],
  // A pages-only deployment sets BACKEND_ORIGIN and forwards every API call to
  // the deployment that holds the secrets, ahead of its own route files.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN?.replace(/\/$/, "");
    return {
      beforeFiles: backend ? [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] : [],
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    // ../lib and ../contracts live outside this package.
    root: repoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
