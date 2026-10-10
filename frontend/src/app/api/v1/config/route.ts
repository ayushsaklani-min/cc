import { connection } from "next/server";
import { configRoute } from "../../../../../../lib/http";

export async function GET() {
  await connection();
  return configRoute();
}
