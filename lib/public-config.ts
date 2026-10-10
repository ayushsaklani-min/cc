/**
 * What a client may know about this deployment: everything the UI needs to
 * describe the service truthfully, and nothing secret.
 */
export interface PublicConfig {
  network: string;
  contractAddress: string;
  /** Hex of the 32-byte values the client hashes into its subject and ownership challenge. */
  contractAddressBytes: string;
  domain: string;
  policyId: string;
  policy: {
    id: string;
    version: number;
    currency: string;
    thresholdMinorUnits: string;
    allowedDocumentTypes: readonly string[];
    freshnessDays: number;
    crossCheck: boolean;
  };
  upload: { maxBytes: number; mimeTypes: readonly string[] };
  processing: {
    mode: "server-mediated";
    extractionProvider: string;
    extractionModel: string;
    crossCheckModel: string | null;
  };
  attestationTtlSeconds: number;
  statusTtlSeconds: number;
  /** Not defined yet; the UI must say so rather than promise one. */
  retention: null;
  authentication: "development-token";
  /** How an attestation reaches the chain from the UI. */
  onChainSubmission: "browser-wallet" | "unavailable";
  explorerUrl: string | null;
}
