// Minimal Prometheus-format metrics (spec section 11). Label values are always
// low-cardinality constants (endpoint, method, status): never a subject, an
// account, an address or anything derived from a document.

type Labels = Record<string, string>;

const key = (labels: Labels) =>
  Object.keys(labels)
    .sort()
    .map((k) => `${k}="${String(labels[k]).replace(/[\\"\n]/g, "_")}"`)
    .join(",");

class Counter {
  private readonly values = new Map<string, number>();
  constructor(
    readonly name: string,
    readonly help: string,
  ) {}
  inc(labels: Labels = {}, by = 1): void {
    const k = key(labels);
    this.values.set(k, (this.values.get(k) ?? 0) + by);
  }
  get(labels: Labels = {}): number {
    return this.values.get(key(labels)) ?? 0;
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    if (this.values.size === 0) lines.push(`${this.name} 0`);
    for (const [k, v] of this.values) lines.push(`${this.name}${k ? `{${k}}` : ""} ${v}`);
    return lines.join("\n");
  }
}

class Histogram {
  private readonly series = new Map<string, { buckets: number[]; sum: number; count: number }>();
  constructor(
    readonly name: string,
    readonly help: string,
    private readonly bounds: number[],
  ) {}
  observe(seconds: number, labels: Labels = {}): void {
    const k = key(labels);
    const s = this.series.get(k) ?? { buckets: this.bounds.map(() => 0), sum: 0, count: 0 };
    this.bounds.forEach((b, i) => {
      if (seconds <= b) s.buckets[i] = (s.buckets[i] ?? 0) + 1;
    });
    s.sum += seconds;
    s.count += 1;
    this.series.set(k, s);
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const [k, s] of this.series) {
      const prefix = k ? `${k},` : "";
      this.bounds.forEach((b, i) => lines.push(`${this.name}_bucket{${prefix}le="${b}"} ${s.buckets[i]}`));
      lines.push(`${this.name}_bucket{${prefix}le="+Inf"} ${s.count}`);
      lines.push(`${this.name}_sum${k ? `{${k}}` : ""} ${s.sum}`);
      lines.push(`${this.name}_count${k ? `{${k}}` : ""} ${s.count}`);
    }
    return lines.join("\n");
  }
}

export class Metrics {
  readonly httpRequests = new Counter("http_requests_total", "HTTP requests by endpoint, method and status");
  readonly httpDuration = new Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  );
  readonly documentsVerified = new Counter("documents_verified_total", "Attestations issued");
  readonly duplicateAttempts = new Counter("duplicate_attempts_total", "Documents already claimed by another subject");
  readonly ownershipFailures = new Counter("subject_ownership_failures_total", "Failed subject-ownership proofs");
  readonly proofsGenerated = new Counter("zkproofs_generated_total", "Zero-knowledge proofs generated");
  readonly proofsFailed = new Counter("zkproofs_failed_total", "Zero-knowledge proof attempts that failed");
  readonly proofDuration = new Histogram(
    "zkproof_generation_time_seconds",
    "Zero-knowledge proof generation time",
    [1, 2.5, 5, 10, 20, 30, 60, 120, 300],
  );
  readonly submissionLatency = new Histogram(
    "onchain_submission_latency_seconds",
    "Time from submission to finalized transaction",
    [5, 10, 20, 30, 60, 120, 300, 600],
  );

  observeHttp(endpoint: string, method: string, status: number, seconds: number): void {
    this.httpRequests.inc({ endpoint, method, status: String(status) });
    this.httpDuration.observe(seconds, { endpoint, method });
  }

  render(): string {
    return `${[
      this.httpRequests,
      this.httpDuration,
      this.documentsVerified,
      this.duplicateAttempts,
      this.ownershipFailures,
      this.proofsGenerated,
      this.proofsFailed,
      this.proofDuration,
      this.submissionLatency,
    ]
      .map((m) => m.render())
      .join("\n")}\n`;
  }
}
