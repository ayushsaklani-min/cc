// Network configuration, read from the environment only. No endpoint is
// hard-coded: Preview today, Preprod and Mainnet later by changing variables.
import { setNetworkId } from "@midnight-ntwrk/midnight-js/network-id";

export interface NetworkConfig {
  networkId: string;
  node: string;
  indexer: string;
  indexerWS: string;
  proofServer: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`missing environment variable ${name}`);
  return v;
}

export function loadNetworkConfig(): NetworkConfig {
  const config = {
    networkId: required("MIDNIGHT_NETWORK"),
    node: required("MIDNIGHT_NODE_RPC_URL"),
    indexer: required("MIDNIGHT_INDEXER_URL"),
    indexerWS: required("MIDNIGHT_INDEXER_WS_URL"),
    proofServer: required("PROOF_SERVER_URL"),
  };
  if (config.networkId === "mainnet") throw new Error("Mainnet is not enabled in this build");
  setNetworkId(config.networkId);
  return config;
}
