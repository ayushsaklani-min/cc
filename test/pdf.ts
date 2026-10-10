// Builds a minimal single-page text PDF, so sample documents are generated
// from source instead of being checked in as binaries.

const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);

export function textPdf(lines: string[]): Uint8Array {
  const content = [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "56 780 Td",
    ...lines.map((l) => `(${escape(l)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

const day = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** A plain monthly payslip dated a few days ago. */
export function samplePayslip(overrides: { gross?: string; extraLines?: string[] } = {}): Uint8Array {
  return textPdf([
    "ACME PAYROLL INC.",
    "Payslip",
    "",
    "Employee: Maria Jose Garcia",
    `Pay period: ${day(-35)} to ${day(-5)} (monthly)`,
    `Pay date: ${day(-5)}`,
    "",
    `Gross pay (this month):      USD ${overrides.gross ?? "7,500.00"}`,
    "Federal tax:                 USD 1,125.00",
    "Net pay:                     USD 6,375.00",
    ...(overrides.extraLines ?? []),
  ]);
}
