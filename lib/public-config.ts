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
  /** Every policy this deployment offers. Each is a separate contract; this config describes one of them. */
  policies: { id: string; title: string }[];
  policy:
    | {
        kind: "income";
        id: string;
        version: number;
        currency: string;
        thresholdMinorUnits: string;
        allowedDocumentTypes: readonly string[];
        freshnessDays: number;
        crossCheck: boolean;
      }
    | {
        /** Decided from an issuer-signed record; no model reads the document. */
        kind: "signed-age";
        id: string;
        version: number;
        minimumAge: number;
        acceptedDocument: string;
        freshnessDays: number;
        /** Names of the issuers whose signature is accepted. */
        trustedSigners: string[];
      };
  upload: { maxBytes: number; mimeTypes: readonly string[] };
  processing: {
    mode: "server-mediated";
    /** Null when no model is involved. */
    extractionProvider: string | null;
    extractionModel: string | null;
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
