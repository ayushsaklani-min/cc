// In a browser the native WebSocket is the implementation. Unlike upstream's
// browser entry, it is also exported by name, because the Midnight indexer
// client does `import * as ws from "isomorphic-ws"` and reads `ws.WebSocket`.
const NativeWebSocket = globalThis.WebSocket;

export { NativeWebSocket as WebSocket };
export default NativeWebSocket;
