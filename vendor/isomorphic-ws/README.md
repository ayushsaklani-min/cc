# isomorphic-ws (local replacement)

`@midnight-ntwrk/midnight-js-indexer-public-data-provider` 4.1.1 imports
`* as ws from "isomorphic-ws"` and uses `ws.WebSocket`. Upstream
isomorphic-ws 5.0.0 has no named `WebSocket` export in its browser entry, so a
strict bundler (Turbopack) refuses to build a browser bundle that includes the
indexer client.

This package is wired in through `overrides` in the root `package.json`. The
Node entry is identical to upstream; only the browser entry differs. Remove it
once the indexer client or isomorphic-ws fixes the import.

Upstream isomorphic-ws is MIT-licensed (https://github.com/heineiuo/isomorphic-ws).
This replacement is part of CipherComply and is covered by its Apache-2.0 licence.
