import { connection } from "next/server";
import { metricsRoute } from "../../../../../lib/http";

// Prometheus scrape endpoint. Keep it off the public internet.
export async function GET() {
  await connection();
  return metricsRoute();
}
